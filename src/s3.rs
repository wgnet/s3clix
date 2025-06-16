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
use std::io::ErrorKind;
use std::sync::Arc;
use std::time::Duration;

use aho_corasick::AhoCorasickBuilder;
use anyhow::anyhow;
use axum::extract::BodyStream;
use futures_util::{StreamExt, TryStreamExt};
use log::{debug, info};
use mime_guess::mime;
use s3::creds::Credentials;
use s3::serde_types::{CommonPrefix, Object};
use s3::{Bucket, Region};
use serde::Serialize;
use tokio::io::{AsyncWrite, AsyncWriteExt};
use tokio_util::compat::FuturesAsyncReadCompatExt;

use crate::config::{Config, HostAccessStyle, S3Bucket, S3Config};

pub struct S3Client {
    pub config: Arc<S3Bucket>,
    bucket: Box<Bucket>,
    upload_memory_pool: usize,
}

#[derive(Serialize, Debug, Clone)]
pub struct FileList {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub folder: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(default)]
    pub cdn_url: Option<String>,
}

impl From<Object> for FileList {
    fn from(value: Object) -> Self {
        Self {
            name: strip_prefix(&value.key),
            path: value.key,
            size: value.size,
            folder: false,
            cdn_url: None,
        }
    }
}

impl From<CommonPrefix> for FileList {
    fn from(value: CommonPrefix) -> Self {
        Self {
            name: strip_prefix(&value.prefix),
            path: value.prefix,
            size: 0,
            folder: true,
            cdn_url: None,
        }
    }
}

macro_rules! s3_with_timeout {
    ($tries:expr, $timeout:expr, $expr:expr) => {{
        let mut b = 0usize;
        let timeout = Duration::from_secs($timeout);
        loop {
            if let Ok(data) = tokio::time::timeout(timeout, $expr).await {
                break data.map_err(|x| anyhow!(x));
            }
            b += 1;
            if b > $tries {
                break Err(anyhow::anyhow!("Operation timeout / tries exceeded"));
            }
        }
    }};
}
impl S3Client {
    pub async fn new_from_bucket(
        s3_config: &S3Config,
        bucket_config: Arc<S3Bucket>,
    ) -> anyhow::Result<Self> {
        let region = Region::Custom {
            region: "custom".to_owned(),
            endpoint: bucket_config.url.clone(),
        };
        let creds = Credentials::new(
            Some(&bucket_config.access_key),
            Some(&bucket_config.secret_key),
            None,
            None,
            None,
        )?;
        let mut bucket = Bucket::new(&bucket_config.bucket, region, creds)?;
        match &bucket_config.style {
            HostAccessStyle::Path => bucket.set_path_style(),
            HostAccessStyle::Subdomain => bucket.set_subdomain_style(),
        }

        if bucket_config.make_public {
            bucket.add_header("x-amz-acl", "public-read");
        }
        let s = S3Client {
            config: bucket_config,
            bucket,
            upload_memory_pool: s3_config.upload_memory_pool,
        };
        s.list("").await?;
        Ok(s)
    }

    pub async fn new(config: Arc<Config>) -> anyhow::Result<Vec<S3Client>> {
        let mut ret = Vec::new();
        for i in &config.s3.buckets {
            ret.push(S3Client::new_from_bucket(&config.s3, i.clone()).await?);
        }
        Ok(ret)
    }

    pub async fn exists(&self, path: &str) -> anyhow::Result<bool> {
        let data = s3_with_timeout!(
            self.config.tries,
            self.config.timeout,
            self.bucket.list(path.to_owned(), None)
        )?;

        for list_result in data {
            if list_result
                .contents
                .into_iter()
                .filter(|x| x.key.eq(path))
                .count()
                > 0
            {
                return Ok(true);
            }
        }
        Ok(false)
    }
    pub async fn list(&self, path: &str) -> anyhow::Result<Vec<FileList>> {
        debug!("s3::list ({})", path);
        let data = s3_with_timeout!(
            self.config.tries,
            self.config.timeout,
            self.bucket.list(path.to_owned(), Some("/".to_owned()))
        )?;

        let mut folders = Vec::new();
        let mut files = Vec::new();
        for list_result in data {
            list_result
                .contents
                .into_iter()
                .filter(|x| x.size > 0)
                .map(|x| x.into())
                .map(|mut x: FileList| {
                    if !self.config.cdn_url.is_empty() {
                        let mut url = self.config.cdn_url.clone();
                        url.push_str(&x.path);
                        x.cdn_url = Some(url);
                    };
                    x
                })
                .for_each(|x| files.push(x));
            list_result
                .common_prefixes
                .into_iter()
                .for_each(|x| x.into_iter().for_each(|x| folders.push(x.into())));
        }
        Ok([folders, files].concat())
    }

    pub async fn search(&self, pattern: &str) -> anyhow::Result<Vec<FileList>> {
        debug!("s3::search ({})", pattern);
        if pattern.is_empty() || pattern.len() < 3 {
            return Ok(Vec::new()); // do not list all :)
        }
        let data = s3_with_timeout!(
            self.config.tries,
            self.config.timeout,
            self.bucket.list("".to_owned(), None)
        )?;

        let ac = AhoCorasickBuilder::new()
            .ascii_case_insensitive(true)
            .build([pattern])?;

        Ok(data
            .into_iter()
            .flat_map(|x| x.contents)
            .filter(|x| x.size > 0)
            .filter(|x| ac.is_match(&x.key))
            .map(|x| x.into())
            .collect())
    }

    pub async fn upload_serial(&self, path: &str, mut stream: BodyStream) -> anyhow::Result<()> {
        debug!("s3::upload(2) for 1 stream to {path}");
        let mime_type = match self.config.guess_mime {
            true => mime_guess::from_path(path).first_or_octet_stream(),
            false => mime::APPLICATION_OCTET_STREAM,
        };
        // let's create thread
        // then upload data there
        let mp = s3_with_timeout!(
            self.config.tries,
            self.config.timeout,
            self.bucket
                .initiate_multipart_upload(path, mime_type.as_ref())
        )?;
        let f = async {
            let mut part_number = 1u32;
            let mut buf = Vec::with_capacity(self.upload_memory_pool);
            let mut parts = Vec::new();
            while let Some(data) = stream.next().await {
                let data = data?;
                let mut last = data.len();
                if data.len() + buf.len() > buf.capacity() {
                    last = buf.capacity() - buf.len();
                }
                buf.extend_from_slice(&data.as_ref()[0..last]);
                if buf.len() == buf.capacity() {
                    debug!("Uploading part {part_number} of {path} size {}", buf.len());
                    parts.push(
                        self.bucket
                            .put_multipart_chunk(
                                buf,
                                path,
                                part_number,
                                &mp.upload_id,
                                mime_type.as_ref(),
                            )
                            .await?,
                    );
                    debug!("Uploaded part {part_number} of {path}");
                    part_number += 1;
                    buf = Vec::with_capacity(self.upload_memory_pool);
                    if last != buf.len() {
                        buf.extend_from_slice(&data.as_ref()[last..]);
                    }
                }
            }
            if !buf.is_empty() {
                debug!(
                    "Uploading last part {part_number} of {path} size {}",
                    buf.len()
                );
                parts.push(
                    self.bucket
                        .put_multipart_chunk(
                            buf.clone(),
                            path,
                            part_number,
                            &mp.upload_id,
                            mime_type.as_ref(),
                        )
                        .await?,
                );
            }
            debug!(
                "Completing multipart upload for {path} with {} parts",
                parts.len()
            );
            s3_with_timeout!(
                self.config.tries,
                self.config.timeout,
                self.bucket
                    .complete_multipart_upload(path, &mp.upload_id, parts.clone())
            )?;
            Ok(())
        }
        .await;
        match f {
            Ok(_) => Ok(()),
            Err(e) => {
                self.bucket.abort_upload(path, &mp.upload_id).await?;
                Err(e)
            }
        }
    }

    pub async fn upload_parallel(&self, path: &str, stream: BodyStream) -> anyhow::Result<()> {
        debug!("s3::upload for 1 stream to {path}");
        let mime_type = match self.config.guess_mime {
            true => mime_guess::from_path(path).first_or_octet_stream(),
            false => mime::APPLICATION_OCTET_STREAM,
        };

        let mut ar = stream
            .map_err(|x| std::io::Error::new(ErrorKind::BrokenPipe, x))
            .into_async_read()
            .compat();

        s3_with_timeout!(
            self.config.tries,
            self.config.timeout,
            self.bucket
                .put_object_stream_with_content_type(&mut ar, path, mime_type.clone())
        )?;
        Ok(())
    }
    pub async fn prepare_download(&self, path: &str) -> anyhow::Result<(String, u64, String)> {
        let mut file = self.list(path).await?;
        if file.len() != 1 {
            return Err(anyhow!(
                "File not found or multiple files found (folders are not downloadable)"
            ));
        }
        let file = file.pop().unwrap(); // Safety: we checked numbers of members
        let mime = mime_guess::from_path(&file.name)
            .first_or_octet_stream()
            .as_ref()
            .to_owned();
        let name = file.name;
        let size = file.size;
        Ok((name, size, mime))
    }
    pub async fn download<W: AsyncWrite + Send + Unpin>(
        &self,
        path: &str,
        mut stream: W,
    ) -> anyhow::Result<()> {
        info!("downloading file: {}", path);
        let url = s3_with_timeout!(
            self.config.tries,
            self.config.timeout,
            self.bucket.presign_get(path, 86400, None)
        )?;
        let mut s = reqwest::get(url).await?.bytes_stream();
        while let Some(s) = StreamExt::next(&mut s).await {
            match s {
                Ok(b) => {
                    stream.write_all(b.as_ref()).await?;
                }
                Err(e) => return Err(anyhow!(e)),
            }
        }
        Ok(())
    }
    pub async fn mkdir(&self, path: &str) -> anyhow::Result<()> {
        info!("creating folder: {}", path);
        s3_with_timeout!(
            self.config.tries,
            self.config.timeout,
            self.bucket.put_object(format!("{path}/.placeholder"), &[])
        )
        .map(|_| ())
    }
    #[allow(unused)]
    pub async fn rename(&self) {}

    pub async fn delete(&self, path: &str) -> anyhow::Result<()> {
        info!("Deleting {path}");
        s3_with_timeout!(
            self.config.tries,
            self.config.timeout,
            self.bucket.delete_object(path)
        )
        .map(|_| ())
    }

    pub async fn delete_prefix(&self, path: &str) -> anyhow::Result<()> {
        info!("Deleting {path} (recursive)");
        let mut data = vec![path.to_owned()];
        let mut delete_list = vec![format!("{}.placeholder", path)];
        let mut folder_delete_list = vec![path.to_owned()];

        loop {
            let mut temp = Vec::new();
            while let Some(folder) = data.pop() {
                self.list(&folder)
                    .await?
                    .into_iter()
                    .for_each(|x| match x.folder {
                        true => {
                            delete_list.push(format!("{}.placeholder", x.path));
                            folder_delete_list.push(x.path.clone());
                            temp.push(x.path);
                        }
                        false => {
                            delete_list.push(x.path);
                        }
                    })
            }
            data.append(&mut temp);
            if data.is_empty() {
                break;
            }
        }
        for deletion in delete_list {
            s3_with_timeout!(
                self.config.tries,
                self.config.timeout,
                self.bucket.delete_object(&deletion)
            )?;
        }
        for deletion in folder_delete_list {
            s3_with_timeout!(
                self.config.tries,
                self.config.timeout,
                self.bucket.delete_object(&deletion)
            )?;
        }
        Ok(())
    }
}

fn strip_prefix(data: &str) -> String {
    match data[0..data.len() - 1].rfind('/') {
        Some(idx) => data[idx + 1..data.len()].to_owned(),
        None => data.to_owned(),
    }
}
