/**
Copyright 2025 Wargaming.Net

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
**/
use std::net::SocketAddr;
use std::sync::Arc;

use anyhow::anyhow;
use axum::extract::{BodyStream, Path, Query, State};
use axum::http::header::{CONTENT_DISPOSITION, CONTENT_LENGTH, CONTENT_TYPE};
use axum::http::{HeaderMap, Request, StatusCode};
use axum::middleware::{from_fn_with_state, Next};
use axum::response::{IntoResponse, Redirect, Response};
use axum::routing::*;
use axum::{Form, Json, Router};
use axum_extra::body::AsyncReadBody;
use axum_extra::extract::cookie::Cookie;
use axum_extra::extract::CookieJar;
use axum_server::tls_rustls::RustlsConfig;
use log::{debug, info, warn};
use serde::Deserialize;
use tokio::io::duplex;
use tokio::spawn;
use tower_http::services::ServeDir;

use crate::config::{AuthConfig, Config, S3UploadType};
use crate::s3::S3Client;
use crate::sso::RedirectCode;

pub struct HttpServer;

struct AppState {
    s3: Vec<Arc<S3Client>>,
    config: Arc<Config>,
}

impl AppState {
    fn get_s3(&self, bucket: Option<&str>) -> Option<Arc<S3Client>> {
        match bucket {
            None => self.s3.first().cloned(),
            Some(str) => self.s3.iter().find(|x| x.config.alias.eq(str)).cloned(),
        }
    }

    async fn get_s3_from_jar(&self, jar: CookieJar) -> Result<Arc<S3Client>, Response> {
        let value = jar.get(BUCKET_NAME).map(|x| x.value());
        match self.get_s3(value) {
            None => Err((StatusCode::NOT_FOUND, "s3 bucket not found").into_response()),
            Some(s3client) => Ok(s3client),
        }
    }
}
impl HttpServer {
    pub async fn start(config: Arc<Config>) -> anyhow::Result<()> {
        debug!("HttpServer::start");
        let s3 = S3Client::new(config.clone()).await?;
        let state = Arc::new(AppState {
            s3: s3.into_iter().map(Arc::new).collect(),
            config: config.clone(),
        });
        let delete_api = Router::new()
            .route("/deleteFolder/*path", delete(delete_folder))
            .route("/delete/*path", delete(del))
            .with_state(state.clone())
            .layer(from_fn_with_state(state.clone(), can_delete));
        let upload_api = Router::new()
            .route("/upload/*path", put(upload))
            .route("/mkdir/*path", post(mkdir))
            .with_state(state.clone())
            .layer(from_fn_with_state(state.clone(), can_upload));
        let api = Router::new()
            .route("/is_admin", get(check_can_delete))
            .route("/can_delete", get(check_can_delete))
            .route("/can_upload", get(check_can_upload))
            .route("/buckets", get(buckets))
            .route("/bucket", post(select_bucket))
            .route("/list", get(root))
            .route("/list/", get(root))
            .route("/search", get(search))
            .route("/list/*path", get(list))
            .merge(delete_api)
            .merge(upload_api)
            .route("/download/*path", get(download))
            .with_state(state.clone());

        let mut web_root = Router::new()
            .route_service("/", ServeDir::new(config.get_web_path()))
            .route_service("/*any", ServeDir::new(config.get_web_path()))
            .nest("/api", api)
            .layer(from_fn_with_state(state.clone(), auth_middleware));
        if state.config.is_sso() {
            web_root = Router::new()
                .route("/_redirect", get(redirect))
                .route("/_redirect/", get(redirect))
                .with_state(state.clone())
                .nest("/", web_root);
        }
        // Add readiness probe
        web_root = Router::new()
            .route("/ready", get(readiness))
            .with_state(state.clone())
            .nest("/", web_root);

        // we do check SSL & cert/key in config before
        let address = format!("0.0.0.0:{}", config.get_web_port())
            .parse::<SocketAddr>()
            .map_err(|x| anyhow!(x))?;
        let (ssl, cert, key) = config.get_ssl();
        match ssl {
            true => {
                info!(
                    "SSL is ON, creating rustls context, listening on {}",
                    config.get_web_port()
                );
                let tls_config = RustlsConfig::from_pem_file(cert.unwrap(), key.unwrap())
                    .await
                    .map_err(|x| anyhow!(x))?;
                axum_server::bind_rustls(address, tls_config)
                    .serve(web_root.into_make_service())
                    .await
                    .map_err(|x| anyhow!(x))
            }
            false => axum_server::bind(address)
                .serve(web_root.into_make_service())
                .await
                .map_err(|x| anyhow!(x)),
        }
    }
}

async fn redirect(
    State(state): State<Arc<AppState>>,
    jar: CookieJar,
    query: Query<RedirectCode>,
) -> Response {
    match state.config.get_auth_config() {
        AuthConfig::SSOAuth(auth_config) => {
            let auth_config = auth_config.read().await;
            match auth_config.code_exchange(&query.0).await {
                Ok(code) => match code.id_token {
                    None => {
                        warn!("Error while getting response from AFDS: id_token not present");
                        (StatusCode::FORBIDDEN, "Authorization failed").into_response()
                    }
                    Some(id_token) => {
                        let mut cookie =
                            Cookie::new(auth_config.get_cookie_name().to_owned(), id_token);
                        cookie.set_path("/");
                        cookie.set_secure(true);
                        cookie.set_http_only(true);
                        let (jar, redirect) = match jar.get(RETURN_COOKIE) {
                            None => (jar, Redirect::to("/")),
                            Some(cookie) => {
                                let value = Redirect::to(cookie.value());
                                (jar.remove(Cookie::named(RETURN_COOKIE)), value)
                            }
                        };
                        (jar.add(cookie), redirect).into_response()
                    }
                },
                Err(e) => {
                    warn!("Error while getting response from AFDS: {}", e);
                    (StatusCode::FORBIDDEN, "Authorization failed").into_response()
                }
            }
        }
        _ => (StatusCode::INTERNAL_SERVER_ERROR, "SSO not configured").into_response(),
    }
}

async fn buckets(State(state): State<Arc<AppState>>, _jar: CookieJar) -> Response {
    // TODO: filter out buckets user can't see
    (
        StatusCode::OK,
        Json(
            state
                .s3
                .iter()
                .map(|x| x.config.alias.clone())
                .collect::<Vec<String>>(),
        ),
    )
        .into_response()
}

async fn readiness(State(state): State<Arc<AppState>>) -> Response {
    if state.config.s3.buckets.len() != state.s3.len() {
        return (StatusCode::SERVICE_UNAVAILABLE, "S3 is not ready").into_response();
    }
    if state.config.is_sso() {
        match state.config.get_auth_config() {
            AuthConfig::SSOAuth(auth) => {
                let auth_config = auth.read().await;
                if !auth_config.ready() {
                    return (
                        StatusCode::SERVICE_UNAVAILABLE,
                        "Authentication is not ready",
                    )
                        .into_response();
                }
            }
            _ => {
                return (
                    StatusCode::SERVICE_UNAVAILABLE,
                    "Authentication is not ready",
                )
                    .into_response()
            }
        }
    }
    (StatusCode::OK, "Service ready").into_response()
}
#[derive(Deserialize)]
struct BucketQuery {
    bucket: String,
}

static BUCKET_NAME: &str = "bucket.name";
async fn select_bucket(
    State(state): State<Arc<AppState>>,
    jar: CookieJar,
    Form(bucket): Form<BucketQuery>,
) -> Response {
    match state.get_s3(Some(&bucket.bucket)) {
        None => (StatusCode::NOT_FOUND, "Bucket not found").into_response(),
        Some(_) => (
            StatusCode::OK,
            jar.add(
                Cookie::build(BUCKET_NAME, bucket.bucket.clone())
                    .path("/")
                    .http_only(false)
                    .finish(),
            ),
        )
            .into_response(),
    }
}

async fn root(state: State<Arc<AppState>>, jar: CookieJar) -> Response {
    let s3 = match state.get_s3_from_jar(jar).await {
        Ok(s3) => s3,
        Err(response) => return response,
    };
    let list = s3.list("").await;
    match list {
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Ok(list) => (StatusCode::OK, Json(list)).into_response(),
    }
}

async fn list(state: State<Arc<AppState>>, jar: CookieJar, Path(path): Path<String>) -> Response {
    let s3 = match state.get_s3_from_jar(jar).await {
        Ok(s3) => s3,
        Err(response) => return response,
    };
    let list = s3.list(&path).await;
    match list {
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Ok(list) => (StatusCode::OK, Json(list)).into_response(),
    }
}

#[derive(Deserialize)]
struct SearchQuery {
    pattern: String,
}
async fn search(
    state: State<Arc<AppState>>,
    jar: CookieJar,
    Query(search): Query<SearchQuery>,
) -> Response {
    let s3 = match state.get_s3_from_jar(jar).await {
        Ok(s3) => s3,
        Err(response) => return response,
    };
    let list = s3.search(&search.pattern).await;
    match list {
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Ok(list) => (StatusCode::OK, Json(list)).into_response(),
    }
}

async fn upload(
    state: State<Arc<AppState>>,
    jar: CookieJar,
    Path(path): Path<String>,
    body: BodyStream,
) -> Response {
    let s3 = match state.get_s3_from_jar(jar).await {
        Ok(s3) => s3,
        Err(response) => return response,
    };
    match s3.exists(&path).await {
        Ok(true) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, "File already exists").into_response();
        }
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        _ => {}
    };
    let res = match state.config.s3.upload_type {
        S3UploadType::Parallel => s3.upload_parallel(&path, body).await,
        S3UploadType::Serial => s3.upload_serial(&path, body).await,
    };
    match res {
        Ok(_) => (StatusCode::OK, "OK").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn mkdir(state: State<Arc<AppState>>, jar: CookieJar, Path(path): Path<String>) -> Response {
    let s3 = match state.get_s3_from_jar(jar).await {
        Ok(s3) => s3,
        Err(response) => return response,
    };
    match s3.mkdir(&path).await {
        Ok(_) => (StatusCode::OK, "OK").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn download(
    state: State<Arc<AppState>>,
    jar: CookieJar,
    Path(path): Path<String>,
) -> Response {
    let s3 = match state.get_s3_from_jar(jar).await {
        Ok(s3) => s3,
        Err(response) => return response,
    };
    let (file_name, file_size, file_mime) = match s3.prepare_download(&path).await {
        Err(e) => {
            return (StatusCode::NOT_FOUND, e.to_string()).into_response();
        }
        Ok(x) => x,
    };
    let (tx, rx) = duplex(state.config.s3.download_memory_pool);
    spawn(async move {
        if let Err(e) = s3.download(&path, tx).await {
            warn!("Error while downloading file: {}", e);
        }
    });
    let body = AsyncReadBody::new(rx);
    let headers = [
        (CONTENT_TYPE, file_mime),
        (
            CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", file_name),
        ),
        (CONTENT_LENGTH, file_size.to_string()),
    ];
    (headers, body).into_response()
}

async fn del(state: State<Arc<AppState>>, jar: CookieJar, Path(path): Path<String>) -> Response {
    let s3 = match state.get_s3_from_jar(jar).await {
        Ok(s3) => s3,
        Err(response) => return response,
    };
    match s3.delete(&path).await {
        Ok(_) => (StatusCode::OK, "OK").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn delete_folder(
    state: State<Arc<AppState>>,
    jar: CookieJar,
    Path(path): Path<String>,
) -> Response {
    let s3 = match state.get_s3_from_jar(jar).await {
        Ok(s3) => s3,
        Err(response) => return response,
    };
    match s3.delete_prefix(&path).await {
        Ok(_) => (StatusCode::OK, "OK").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// AUTH

async fn bool_check_can_delete(state: Arc<AppState>, headers: HeaderMap, jar: CookieJar) -> bool {
    match state.config.get_auth_config() {
        AuthConfig::None => true,
        AuthConfig::Header(_) => {
            let username = headers
                .get(state.config.get_header_auth_header())
                .unwrap()
                .to_str()
                .unwrap();
            state.config.is_admin(username)
        }
        AuthConfig::SSOConfig(_) => false,
        AuthConfig::SSOAuth(auth_config) => {
            let auth_config = auth_config.read().await;
            if let Some(token) = jar.get(auth_config.get_cookie_name()) {
                let bucket = jar.get(BUCKET_NAME).map(|x| x.value());
                auth_config.can_delete(&state.config, token.value(), bucket)
            } else {
                false
            }
        }
    }
}

async fn bool_check_can_upload(state: Arc<AppState>, headers: HeaderMap, jar: CookieJar) -> bool {
    match state.config.get_auth_config() {
        AuthConfig::None => true,
        AuthConfig::Header(_) => {
            let username = headers
                .get(state.config.get_header_auth_header())
                .unwrap()
                .to_str()
                .unwrap();
            state.config.is_admin(username)
        }
        AuthConfig::SSOConfig(_) => false,
        AuthConfig::SSOAuth(auth_config) => {
            let auth_config = auth_config.read().await;
            if let Some(token) = jar.get(auth_config.get_cookie_name()) {
                let bucket = jar.get(BUCKET_NAME).map(|x| x.value());
                auth_config.can_upload(&state.config, token.value(), bucket)
            } else {
                false
            }
        }
    }
}

async fn check_can_delete(
    state: State<Arc<AppState>>,
    headers: HeaderMap,
    jar: CookieJar,
) -> Response {
    Json(bool_check_can_delete(state.0, headers, jar).await).into_response()
}

async fn check_can_upload(
    state: State<Arc<AppState>>,
    headers: HeaderMap,
    jar: CookieJar,
) -> Response {
    Json(bool_check_can_upload(state.0, headers, jar).await).into_response()
}

async fn can_delete<B>(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    jar: CookieJar,
    req: Request<B>,
    next: Next<B>,
) -> Response {
    if bool_check_can_delete(state, headers, jar).await {
        next.run(req).await
    } else {
        (StatusCode::FORBIDDEN, "403 access denied").into_response()
    }
}

async fn can_upload<B>(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    jar: CookieJar,
    req: Request<B>,
    next: Next<B>,
) -> Response {
    if bool_check_can_upload(state, headers, jar).await {
        next.run(req).await
    } else {
        (StatusCode::FORBIDDEN, "403 access denied").into_response()
    }
}

const RETURN_COOKIE: &'static str = "return_to";

async fn auth_middleware<B>(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    jar: CookieJar,
    req: Request<B>,
    next: Next<B>,
) -> Response {
    match state.config.get_auth_config() {
        AuthConfig::None => {}
        AuthConfig::Header(_) => {
            let username = match headers.get(state.config.get_header_auth_header()) {
                Some(s) => s.to_str().unwrap_or(""),
                None => "",
            };
            if username.is_empty() {
                return (StatusCode::FORBIDDEN, "403 access denied").into_response();
            }
        }
        AuthConfig::SSOConfig(_) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, "500 SSO INIT FAILED").into_response();
        }
        AuthConfig::SSOAuth(auth_config) => {
            let auth_config = auth_config.read().await;
            let mut has_token = false;
            let cookie_name = auth_config.get_cookie_name().to_owned();
            if let Some(cookie) = jar.get(&cookie_name) {
                let bucket = jar.get(BUCKET_NAME).map(|x| x.value());
                has_token = auth_config.can_view(&state.config, cookie.value(), bucket);
            }
            if !has_token {
                let url = auth_config.build_redirect_url();
                if let Err(e) = url {
                    warn!("SSO url is invalid: {e}");
                    return (
                        StatusCode::FORBIDDEN,
                        "You should use SSO but SSO configuration failed",
                    )
                        .into_response();
                }
                let current = req.uri().to_string();
                // Save current URL first to return there later
                let jar = CookieJar::new().add(Cookie::new(RETURN_COOKIE, current));
                return (jar, Redirect::to(url.unwrap().as_str())).into_response();
            }
        }
    }
    next.run(req).await
}
