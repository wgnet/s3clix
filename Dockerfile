FROM rust:slim-bullseye AS rust-builder
RUN apt -y update && apt -y upgrade
RUN apt -y install libssl-dev pkg-config perl
RUN mkdir /src
ADD /Cargo.lock /Cargo.toml /src/
COPY /src/ /src/src
WORKDIR /src
RUN cargo build --release


FROM node:20.19-bullseye-slim AS js-builder
RUN apt -y update && apt -y upgrade

RUN mkdir /src
WORKDIR /src
COPY ./ui/ ./

RUN  mkdir -p /build && \
 npm install -g @angular/cli && \
 npm install &&  \
 ng build --output-path /build

FROM debian:bullseye-slim
RUN apt -y update && apt -y upgrade
COPY --from=js-builder /build/browser /web
COPY --from=rust-builder /src/target/release/s3clix /usr/local/bin
COPY /s3clix.yaml /etc/s3clix.yaml
RUN chmod 644 /etc/s3clix.yaml
USER 1000
ENV RUST_LOG="info,s3clix=debug"
WORKDIR /
ENTRYPOINT ["/usr/local/bin/s3clix", "-c", "/etc/s3clix.yaml"]
