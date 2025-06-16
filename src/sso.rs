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
use crate::config::Config;
use anyhow::{anyhow, bail};
use base64::Engine;
use jwt_simple::common::VerificationOptions;
use jwt_simple::prelude::{RS256PublicKey, RSAPublicKeyLike};
use log::{debug, warn};
use reqwest::Url;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Deserialize)]
pub struct WellKnownConfiguration {
    pub authorization_endpoint: String,
    pub token_endpoint: String,
    pub jwks_uri: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct JWKey {
    #[serde(default = "default_alg")]
    pub alg: String,
    #[serde(rename = "use")]
    pub r#use: String,
    pub kid: String,
    pub e: String,
    pub kty: String,
    pub n: String,
}

fn default_alg() -> String {
    "RS256".to_owned()
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Jwks {
    pub keys: Vec<JWKey>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SSOAuthConfig {
    /** server configuration **/
    pub redirect: String,
    pub resource: String,
    pub client_id: String,
    pub secret: String,
    #[serde(default = "default_username")]
    pub username_claim: String,
    #[serde(default = "default_groups")]
    pub groups_claim: String,
    #[serde(default = "default_scope")]
    pub scope: String,
    pub well_known: String,
    /** application configuration **/
    #[serde(default = "default_cookie_name")]
    pub cookie_name: String,
    #[serde(default)]
    pub login_group: Option<String>,
    #[serde(default)]
    pub upload_group: Option<String>,
    #[serde(default)]
    pub delete_group: Option<String>,
}

fn default_username() -> String {
    "username".to_owned()
}

fn default_groups() -> String {
    "groups".to_owned()
}

fn default_scope() -> String {
    "openid".to_owned()
}

fn default_cookie_name() -> String {
    "sessionid".to_owned()
}
impl Default for SSOAuthConfig {
    fn default() -> Self {
        Self {
            redirect: "".to_string(),
            resource: "".to_string(),
            client_id: "".to_string(),
            secret: "".to_string(),
            username_claim: "username".to_string(),
            groups_claim: "groups".to_string(),
            scope: "openid".to_string(),
            well_known: "".to_string(),
            cookie_name: "session".to_string(),
            login_group: None,
            upload_group: None,
            delete_group: None,
        }
    }
}
#[derive(Debug, Default)]
pub struct SSOConfig {
    config: Box<SSOAuthConfig>,
    keys: Vec<RS256PublicKey>,
    token_endpoint: String,
    authorize_endpoint: String,
    jwks_endpoint: String,
}

#[derive(Serialize, Deserialize)]
struct AuthClaims(Value);

impl From<SSOAuthConfig> for SSOConfig {
    fn from(config: SSOAuthConfig) -> Self {
        SSOConfig {
            config: Box::new(config),
            ..Default::default()
        }
    }
}

impl From<Box<SSOAuthConfig>> for SSOConfig {
    fn from(config: Box<SSOAuthConfig>) -> Self {
        SSOConfig {
            config,
            ..Default::default()
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct RedirectCode {
    code: String,
}

#[derive(Deserialize, Debug)]
#[serde(untagged)]
#[allow(unused)]
pub enum U64orString {
    U64(u64),
    String(String),
}
#[derive(Deserialize, Debug)]
#[allow(unused)]
pub struct TokenResponse {
    pub access_token: String,
    pub id_token: Option<String>,
    pub refresh_token: Option<String>,
    pub expires_in: U64orString,
}

#[derive(Debug)]
enum Action {
    View,
    Delete,
    Upload,
}

impl SSOConfig {
    pub fn ready(&self) -> bool {
        self.keys.len() > 0
            && !(self.token_endpoint.is_empty() || self.authorize_endpoint.is_empty())
    }
    pub async fn update(sso_auth: Arc<RwLock<SSOConfig>>) -> anyhow::Result<()> {
        let mut sso_auth = sso_auth.write().await;
        let well_known: WellKnownConfiguration = reqwest::get(&sso_auth.config.well_known)
            .await?
            .json()
            .await?;
        sso_auth.authorize_endpoint = well_known.authorization_endpoint;
        sso_auth.token_endpoint = well_known.token_endpoint;
        sso_auth.jwks_endpoint = well_known.jwks_uri;
        sso_auth.keys.clear();
        debug!("Loaded endpoints from SSO well-known configuration");
        let jwks: Jwks = reqwest::get(&sso_auth.jwks_endpoint).await?.json().await?;
        debug!("Loaded JWKS with {} keys", jwks.keys.len());
        for key in jwks.keys {
            let e = base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(&key.e)?;
            let n = base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(&key.n)?;
            match key.alg.as_str() {
                "RS256" => {
                    sso_auth.keys.push(RS256PublicKey::from_components(&n, &e)?);
                }
                x => {
                    warn!("Only RS256 keys are supported, not {x}");
                }
            }
        }
        Ok(())
    }
    pub fn get_cookie_name(&self) -> &str {
        self.config.cookie_name.as_str()
    }
    fn verify(&self, token: &str) -> anyhow::Result<AuthClaims> {
        let opts = VerificationOptions {
            allowed_audiences: Some(HashSet::from([self.config.resource.to_owned()])),
            ..Default::default()
        };
        let mut last_err = None;
        for key in &self.keys {
            match key.verify_token::<AuthClaims>(token, Some(opts.clone())) {
                Ok(claims) => return Ok(claims.custom),
                Err(e) => {
                    last_err = Some(e);
                }
            }
        }
        if let Some(last_err) = last_err {
            warn!("Verification failed: {last_err}");
        }
        Err(anyhow!("Verification failed"))
    }
    pub fn build_redirect_url(&self) -> anyhow::Result<Url> {
        let mut url = Url::parse(&self.authorize_endpoint)?;
        url.query_pairs_mut()
            .append_pair("client_id", &self.config.client_id)
            .append_pair("redirect_uri", &self.config.redirect)
            .append_pair("response_type", "code")
            .append_pair("scope", &self.config.scope)
            .finish();
        debug!("URL is set: {}", url);
        Ok(url)
    }

    pub async fn code_exchange(&self, code: &RedirectCode) -> anyhow::Result<TokenResponse> {
        let cli = reqwest::Client::new();
        let mut query: HashMap<&str, &str> = HashMap::new();
        query.insert("code", &code.code);
        query.insert("client_id", &self.config.client_id);
        query.insert("client_secret", &self.config.secret);
        query.insert("redirect_uri", &self.config.redirect);
        query.insert("grant_type", "authorization_code");
        Ok(cli
            .post(&self.token_endpoint)
            .form(&query)
            .send()
            .await?
            .json()
            .await?)
    }

    fn eject_username_groups(&self, token: &str) -> anyhow::Result<(String, Vec<String>)> {
        let claims = self.verify(token)?;
        let Value::Object(kv) = claims.0 else {
            bail!("unknown claims received");
        };
        let username = match kv.get(&self.config.username_claim) {
            None => {
                bail!("username claim not found!");
            }
            Some(Value::String(username)) => username.clone(),
            Some(_) => bail!("username claim is in wrong format!"),
        };
        let groups = match kv.get(&self.config.groups_claim) {
            None => bail!("groups claim not found"),
            Some(Value::String(group)) => vec![group.clone()],
            Some(Value::Array(groups)) => groups
                .iter()
                .filter_map(|x| x.as_str())
                .map(|x| x.to_owned())
                .collect(),
            _ => bail!("groups claim in wrong format!"),
        };
        debug!("ejecting username and groups: {username}, {groups:?}");
        Ok((username, groups))
    }

    fn can_action(
        &self,
        action: Action,
        global_config: &Config,
        token: &str,
        bucket: Option<&str>,
    ) -> bool {
        let (_username, groups) = match self.eject_username_groups(token) {
            Ok(x) => x,
            Err(e) => {
                warn!("eject_username_group failed: {e}");
                return false;
            }
        };
        let Some(bucket) = (match bucket {
            None => global_config.s3.buckets.first(),
            Some(str) => global_config.s3.buckets.iter().find(|x| x.alias.eq(str)),
        }) else {
            debug!("action {action:?} denied as bucket not found");
            return false;
        };
        let Some(group) = (match action {
            Action::View => self.config.login_group.as_ref(),
            Action::Delete => self.config.delete_group.as_ref(),
            Action::Upload => self.config.upload_group.as_ref(),
        }) else {
            debug!("action {action:?} allowed as corresponding group is allowed");
            return true;
        };
        if let Some(prefix) = bucket.sso_group_prefix.as_ref() {
            let new_group = format!("{}{}", prefix, group);
            groups.iter().any(|x| x.eq(&new_group))
        } else {
            groups.iter().any(|x| x.eq(group))
        }
    }
    pub fn can_view(&self, config: &Config, token: &str, bucket: Option<&str>) -> bool {
        self.can_action(Action::View, config, token, bucket)
    }

    pub fn can_upload(&self, config: &Config, token: &str, bucket: Option<&str>) -> bool {
        self.can_action(Action::Upload, config, token, bucket)
    }

    pub fn can_delete(&self, config: &Config, token: &str, bucket: Option<&str>) -> bool {
        self.can_action(Action::Delete, config, token, bucket)
    }
}
