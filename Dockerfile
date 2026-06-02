# Debian 12 + OpenSSL 3.x — BBDown (.NET) needs modern libssl
FROM node:20-bookworm-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    unzip \
    ffmpeg \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# BBDown linux-x64 (adjust version if release asset name changes)
ARG BBDOWN_VERSION=1.6.3
ARG BBDOWN_BUILD=20240814
RUN curl -fsSL -o /tmp/bbdown.zip \
      "https://github.com/nilaoda/BBDown/releases/download/${BBDOWN_VERSION}/BBDown_${BBDOWN_VERSION}_${BBDOWN_BUILD}_linux-x64.zip" \
    && unzip -q /tmp/bbdown.zip -d /tmp/bbdown \
    && install -m 755 /tmp/bbdown/BBDown /usr/local/bin/BBDown \
    && rm -rf /tmp/bbdown /tmp/bbdown.zip

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV BBDOWN_PATH=/usr/local/bin/BBDown
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

EXPOSE 3000

CMD ["npm", "start"]
