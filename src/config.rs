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
use crate::sso::{SSOAuthConfig, SSOConfig};
use log::error;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Arc;
use std::{fs, mem};
use tokio::sync::RwLock;

#[derive(Serialize, Deserialize, Debug)]
pub struct Config {
    pub threads: Option<usize>,
    web: WebConfig,
    auth: AuthConfig,
    pub s3: S3Config,
}

#[derive(Serialize, Deserialize, Debug)]
struct WebConfig {
    path: String,
    port: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(default)]
    ssl: Option<SSLConfig>,
}

#[derive(Serialize, Deserialize, Debug)]
struct SSLConfig {
    ssl_port: u16,
    certificate: String,
    certificate_key: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum AuthConfig {
    None,
    Header(HeaderAuth),
    SSOConfig(Box<SSOAuthConfig>),
    #[serde(skip)]
    SSOAuth(Arc<RwLock<SSOConfig>>),
}
#[derive(Serialize, Deserialize, Debug)]
pub struct HeaderAuth {
    pub header: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    #[serde(default)]
    pub admins: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct S3Config {
    pub upload_type: S3UploadType,
    pub workers: usize,
    pub upload_memory_pool: usize,
    pub download_memory_pool: usize,
    pub buckets: Vec<Arc<S3Bucket>>,
}
#[derive(Serialize, Deserialize, Debug)]
pub enum S3UploadType {
    Parallel,
    Serial,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum HostAccessStyle {
    Path,
    Subdomain,
}

impl Default for HostAccessStyle {
    fn default() -> Self {
        Self::Path
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct S3Bucket {
    #[serde(default)]
    pub alias: String,
    #[serde(default)]
    pub cdn_url: String,
    #[serde(default = "default_make_pubic")]
    pub make_public: bool,
    #[serde(default)]
    pub style: HostAccessStyle,
    pub bucket: String,
    pub access_key: String,
    pub secret_key: String,
    pub url: String,
    pub sso_group_prefix: Option<String>,
    #[serde(default = "default_guess_mime")]
    pub guess_mime: bool,
    #[serde(default = "default_timeout")]
    pub timeout: u64,
    #[serde(default = "default_tries")]
    pub tries: usize,
}

fn default_timeout() -> u64 {
    15
}
fn default_tries() -> usize {
    3
}
fn default_make_pubic() -> bool {
    false
}
fn default_guess_mime() -> bool {
    false
}

impl Config {
    pub fn new<P: AsRef<Path>>(filename: P) -> anyhow::Result<Self> {
        let fd = fs::File::open(filename)?;
        let mut config: Self = serde_yaml::from_reader(fd).map_err(anyhow::Error::new)?;

        config.s3.buckets = config
            .s3
            .buckets
            .into_iter()
            .map(|x| {
                let mut b = Arc::unwrap_or_clone(x);
                if b.alias.is_empty() {
                    b.alias.clone_from(&b.bucket)
                }
                Arc::new(b)
            })
            .collect();
        Ok(config)
    }
    pub fn get_web_path(&self) -> &str {
        self.web.path.as_ref()
    }

    pub fn get_header_auth_header(&self) -> &str {
        match &self.auth {
            AuthConfig::Header(x) => x.header.as_str(),
            _ => "",
        }
    }
    pub fn get_web_port(&self) -> u16 {
        self.web.port
    }

    pub fn get_ssl(&self) -> (bool, Option<&str>, Option<&str>) {
        match self.web.ssl.as_ref() {
            None => (false, None, None),
            Some(ssl) => (
                true,
                Some(ssl.certificate.as_str()),
                Some(ssl.certificate_key.as_str()),
            ),
        }
    }

    pub fn is_sso(&self) -> bool {
        matches!(
            &self.auth,
            AuthConfig::SSOAuth(_) | AuthConfig::SSOConfig(_)
        )
    }

    pub fn get_auth_config(&self) -> &AuthConfig {
        &self.auth
    }

    pub async fn init_sso(&mut self) -> anyhow::Result<()> {
        if !self.is_sso() {
            anyhow::bail!("Non-SSO auth type");
        }
        let auth_config = mem::replace(&mut self.auth, AuthConfig::None);
        match auth_config {
            AuthConfig::SSOConfig(config) => {
                let auth = Arc::new(RwLock::new(config.into()));
                SSOConfig::update(auth.clone()).await?;
                self.auth = AuthConfig::SSOAuth(auth.clone());
                tokio::spawn(async move {
                    loop {
                        tokio::time::sleep(tokio::time::Duration::from_secs(3600)).await;
                        if let Err(e) = SSOConfig::update(auth.clone()).await {
                            error!("SSO update failed: {e}");
                        }
                    }
                });
            }
            AuthConfig::SSOAuth(config) => {
                self.auth = AuthConfig::SSOAuth(config);
            }
            _ => unreachable!(),
        }
        Ok(())
    }

    pub fn is_admin(&self, username: &str) -> bool {
        match &self.auth {
            AuthConfig::Header(header) => header.admins.iter().any(|x| x.as_str().eq(username)),
            _ => false,
        }
    }
}

#[cfg(test)]
mod test {
    use std::sync::Arc;

    use crate::config::{Config, S3Bucket};
    use crate::sso::SSOAuthConfig;

    #[test]
    fn test_config_inout() {
        let conf = Config {
            threads: None,
            web: crate::config::WebConfig {
                path: "web".to_string(),
                port: 8080,
                ssl: None,
            },
            auth: crate::config::AuthConfig::SSOConfig(Box::new(SSOAuthConfig {
                redirect: "http://localhost:8080/_redirect/".to_string(),
                resource: "s3clix".to_string(),
                client_id: "s3clix".to_string(),
                secret: "XXXXXXXXXXXXXXX".to_string(),
                username_claim: "username".to_string(),
                groups_claim: "group".to_string(),
                cookie_name: "sessionid".to_string(),
                login_group: None,
                upload_group: None,
                well_known:
                    "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration"
                        .to_string(),
                scope: "".to_string(),
                delete_group: None,
            })),
            s3: crate::config::S3Config {
                upload_type: crate::config::S3UploadType::Parallel,
                workers: 0,
                upload_memory_pool: 0,
                download_memory_pool: 0,
                buckets: vec![Arc::new(S3Bucket {
                    alias: "".to_string(),
                    cdn_url: "".to_string(),
                    make_public: false,
                    style: Default::default(),
                    bucket: "xxx".to_string(),
                    access_key: "xxx".to_string(),
                    secret_key: "xxxx".to_string(),
                    url: "xxxx".to_string(),
                    sso_group_prefix: None,
                    guess_mime: false,
                    timeout: 10,
                    tries: 2,
                })],
            },
        };
        let yml = serde_yaml::to_string(&conf).unwrap();
        let _: Config = serde_yaml::from_str(&yml).unwrap();
    }
}
