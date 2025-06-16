FROM rust:1-alpine3.20 as rust-builder
RUN apk update && apk upgrade && \
 apk add --no-cache gcc musl-dev perl automake make curl protoc pkgconfig openssl-dev openssl  && \
 rm -rf /var/cache/apk/*
RUN mkdir /src
ADD /Cargo.lock /Cargo.toml /src/
COPY /src/ /src/src
WORKDIR /src
RUN cargo build --release


FROM node:20-alpine3.20 as js-builder

RUN apk update && apk upgrade && \
 apk add --no-cache git  && \
 rm -rf /var/cache/apk/* \

RUN mkdir /src
WORKDIR /src
COPY ./ui/ ./

RUN  mkdir -p /build && \
 npm install -g @angular/cli && \
 npm install &&  \
 ng build --output-path /build

FROM alpine:3.20
RUN apk add --no-cache perl openssl ca-certificates curl
COPY --from=js-builder /build /web
COPY --from=rust-builder /src/target/release/s3clix /usr/local/bin
COPY /entry.sh /entry.sh
COPY /s3clix.yaml /etc/s3clix.yaml
RUN chmod 755 /entry.sh
RUN chmod 644 /etc/s3clix.yaml
USER 1000
ENV RUST_LOG="info,s3clix=debug"
WORKDIR /
ENTRYPOINT ["/usr/local/bin/s3clix", "-c", "/etc/s3clix.yaml"]
