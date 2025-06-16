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
use std::process::exit;
use std::sync::Arc;

use clap::Parser;
use log::{error, info};

use crate::http::HttpServer;

mod config;
mod http;
mod s3;
mod sso;

/// S3 Client with web interface and SSO integration
#[derive(Parser)]
#[command(author, version, about)]
struct Args {
    /// path to configuration file
    #[arg(short, long, default_value = "s3clix.yaml")]
    config: String,
    /// Threads for multithread runtime
    #[arg(short, long)]
    threads: Option<usize>,
    /// Use single thread runtime?
    #[arg(short, long, default_value = "false")]
    single: bool,
}

fn main() {
    env_logger::init();
    let args = Args::parse();
    // create tokio runtime
    let Ok(mut config) = config::Config::new(args.config) else {
        error!("Configuration not found / not parsed properly");
        exit(-1);
    };
    let threads = match config.threads {
        Some(threads) => args.threads.unwrap_or(threads),
        None => args.threads.unwrap_or(10),
    };
    let rt = match args.single {
        true => tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build(),
        false => tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .worker_threads(threads)
            .build(),
    };
    let Ok(rt) = rt else {
        error!("Tokio runtime tech failed");
        exit(-1);
    };

    if let Err(e) = rt.block_on(async move {
        if config.is_sso() {
            info!("The application is running in SSO integration mode");
            config.init_sso().await?;
        }
        // now let's shadow the config forever
        let config = Arc::new(config);
        HttpServer::start(config.clone()).await
    }) {
        error!("Program exited with error: {}", e)
    };
}
