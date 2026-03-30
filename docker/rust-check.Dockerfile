# Linux environment to compile-check the `holobro` Tauri crate without a local MSVC/Rust setup.
# This validates Rust + Tauri (Linux); it does NOT produce a Windows installer.
#
#   docker build -f docker/rust-check.Dockerfile -t holobro-rust-check .
#
# Requires the repo root as build context.
# CI also runs native `cargo check` on Ubuntu, Windows, and macOS (see `.github/workflows/ci.yml`).

FROM rust:1-bookworm

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libayatana-appindicator3-dev \
    libgtk-3-dev \
    librsvg2-dev \
    libssl-dev \
    libwebkit2gtk-4.1-dev \
    pkg-config \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /src

COPY . .

# `tauri::generate_context!()` resolves `build.frontendDist` at compile time; it must exist even for `cargo check`.
RUN mkdir -p dist \
  && printf '%s\n' '<!DOCTYPE html><html><head><meta charset="utf-8"><title>docker stub</title></head><body></body></html>' > dist/index.html \
  && cargo check -p holobro --locked
