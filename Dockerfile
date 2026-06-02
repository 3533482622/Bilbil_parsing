# Debian 12 + OpenSSL 3.x — BBDown (.NET) needs modern libssl
FROM node:20-bookworm-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    unzip \
    ffmpeg \
    libssl3 \
    libicu72 \
    && rm -rf /var/lib/apt/lists/*

# BBDown linux-x64 (adjust version if release asset name changes)
ARG BBDOWN_VERSION=1.6.3
ARG BBDOWN_BUILD=20240814
RUN set -eux; \
    curl -fsSL -o /tmp/bbdown.zip \
      "https://github.com/nilaoda/BBDown/releases/download/${BBDOWN_VERSION}/BBDown_${BBDOWN_VERSION}_${BBDOWN_BUILD}_linux-x64.zip"; \
    unzip -q /tmp/bbdown.zip -d /tmp/bbdown-extract; \
    BB_BIN="$(find /tmp/bbdown-extract -type f -name BBDown | head -1)"; \
    test -n "$BB_BIN"; \
    mkdir -p /opt/bbdown; \
    cp -a "$(dirname "$BB_BIN")"/. /opt/bbdown/; \
    chmod -R 755 /opt/bbdown; \
    ln -sf /opt/bbdown/BBDown /usr/local/bin/BBDown; \
    test -x /opt/bbdown/BBDown; \
    ls -la /opt/bbdown; \
    rm -rf /tmp/bbdown-extract /tmp/bbdown.zip

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV BBDOWN_PATH=/opt/bbdown/BBDown
ENV PATH=/opt/bbdown:${PATH}
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

EXPOSE 3000

CMD ["npm", "start"]
