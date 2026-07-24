# syntax=docker/dockerfile:1

# ---------- Stage 1: build the Vue frontend ----------
FROM node:20-bookworm AS client-build
WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ---------- Stage 2: install server deps (compiles better-sqlite3) ----------
FROM node:20-bookworm AS server-build
WORKDIR /app/server
# build tools for native modules
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY server/package.json ./
RUN npm install --omit=dev
COPY server/ ./

# ---------- Stage 3: runtime ----------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
# ffmpeg + ffprobe for media processing
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_ROOT=/data/duix_avatar_data \
    APP_DATA=/data/app

COPY --from=server-build /app/server /app/server
COPY --from=client-build /app/client/dist /app/client/dist

EXPOSE 3000
WORKDIR /app/server
CMD ["node", "src/index.js"]
