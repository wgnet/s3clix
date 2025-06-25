# S3clix

*Blazing fast (tm)*  S3 web client with SSO support.

### Rationale

S3 is a great way to store data, but it's hard to control access to S3. Access keys are easily leaked anywhere.

S3Clix provides an easy interface to upload-and-download functions for anyone but denies deletion.
It never stores your data locally, so you may not be afraid of data leaks.

Also, it provides automatic de-duplication.

### Dependencies

S3Clix doesn't depend on any external services except S3 itself.

### Compatibility with S3 providers

S3Clix uses [rust-s3](https://crates.io/crates/rust-s3) crate and is compatible with all providers as the original
crate.
We tested it with

- Amazon S3
- Alibaba S3
- G-Core S3
- ( add yours if you have tested it)

### How to run

#### In a container

- Edit [s3clix.yaml](/s3clix.yaml)
- Run ```podman / docker build```
- Run with the port you need

#### Outside a container

- Download and install [rust toolchain](http://https://www.rust-lang.org/tools/install)
- Download and install [npm toolkit](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- Install
- Build backend with ```cargo build``` command
- Build front-end with ```npm install / ng build``` command in /ui/ directory
- Edit [s3clix.yaml](/s3clix.yaml)
- Run via ```cargo run -- -c s3clix.yaml```
- Add logging if necessary (```RUST_LOG=debug```)

### Configuration

```yaml
threads: 10 # tokio runtime threads limit, for K8S and stuff
web:
  path: web # from which folder server index.html
  port: 8080 # port
  # optional
  ssl:
    ssl_port: 8443 # ssl port
    certificate: cert.crt
    certificate_key: cert.key

# auth: None # use this to disable authentication 
# auth: !Header # use this for header-based authentication
#  header: X-Username-Header # header to use 
#  admins: # list of administator users
#    - j_doe
#    - j_doe2

auth: !SSOConfig # for Oauth2 integration
  redirect: https://[domain.site.com]/_redirect/
  resource: [ given from Auth Provider ]
  client_id: [ given from Auth Provider ]
  secret: [ given from Auth Provider ]
  well_known: [ given from Auth Provider ]
  cookie_name: sessionid # cookie for ID token
  username_claim: username # [given from Auth Provider
  groups_claim: groups  # [given from Auth Provider]
  login_group: s3clix-users # optional, a group to be able to view and download files
  upload_group: s3clix-admins # optional, a group to be able to upload files
  delete_group: s3clix-admins # optional, a group to be able to delete files
  scope: "openid groups" # [given from Auth Provider]


s3:
  upload_type: Parallel # Parralel or Serial. Parralel is faster, Serial is more reliable 
  workers: 4 # How many workers to spawn, has no effect on Serial
  upload_memory_pool: 400000000 # memory limits in bytes, shall not exceed K8S limits
  download_memory_pool: 400000000 # memory limits in bytes, shall not exceed K8S limits
  buckets:
    - bucket: default # name in S3
      alias: first # user-defined alias
      access_key: "******"
      secret_key: "******"
      url: eu-central-1 # specify region for AWS
      style: Path # S3 access style, optional, Path is default
    - bucket: second
      alias: second-bucket
      access_key: "******"
      secret_key: "******"
      cdn_url: https://web.site.com/bucket3/ # optional. allows users to obtain direct links to files
      make_public: true # optional, default false. Makes file publicly available via direct links
      guess_mime: true # optional, default false. Sets mime/type based on file extension, otherwise application/octet-stream
      sso_group_prefix: second_ # optional. If set, for this bucket groups will be prefixed for this prefix for access control
      style: Subdomain # S3 access style optional
      url: https://***** # specify exact URL if necessary
```

### Contribution

See [CONTRIBUTION](/CONTRIBUTION.md)

### Project team

See [MAINTAINERS](/MAINTAINERS.md)

### License

This code is released under [Apache 2.0 License](/LICENSE.md)