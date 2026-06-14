FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    git \
    jq \
    make \
    nano \
    openssh-client \
    ripgrep \
    tree \
    unzip \
    vim-tiny \
    zip \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable || true

# Codex CLI는 네트워크 상태에 따라 빌드 시점 설치가 실패할 수 있으므로 postCreate에서도 재확인한다.
RUN npm install -g @openai/codex || true

USER node
