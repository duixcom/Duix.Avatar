# Duix.Avatar — Web (containerized browser client)

A browser-based replacement for the Duix.Avatar Electron desktop app. It lets you
**create avatars** and **synthesize videos** from any device with a browser, while
the heavy AI work stays on your existing Duix backend containers (TTS + ASR +
video generation). Ships as a single Docker container.

```
┌────────────┐    HTTP     ┌──────────────────────┐   HTTP    ┌─────────────────────┐
│  Browser   │ ──────────► │  duix-avatar-web     │ ────────► │  Duix backend       │
│ (anywhere) │  (this UI)  │  BFF + static SPA    │  network  │  containers (GPU)   │
└────────────┘             │  (this container)    │           │  tts / asr / video  │
                           └──────────┬───────────┘           └──────────┬──────────┘
                                      │  shared file volume (duix_avatar_data)        │
                                      └───────────────────────────────────────────────┘
```

## Why a BFF (backend-for-frontend)?

The Duix backend containers **exchange media by file path, not HTTP upload**
(e.g. `POST /easy/submit { audio_url, video_url }` where those are paths inside
the container's mounted volume). A pure browser app cannot write to that volume.

So this container runs a small Node/Express service that:

- Re-implements the desktop app's logic (SQLite metadata DB, `ffmpeg`
  transcode/audio-extraction, task queue + status polling).
- Talks to the TTS and video-generation containers over the network.
- Writes/reads media on the **shared `duix_avatar_data` volume** exactly the way
  the desktop app did, so your existing backend keeps working unchanged.
- Serves the Vue web UI and a REST API to the browser.

Because of the shared-volume requirement, **deploy this container on the same host
(or a host with access to the same volume) as the backend containers.** The
browser can be anywhere on the network.

## Configure the backend server IP

Three ways (highest priority wins):

1. **In-app Settings page** — enter the IP at runtime; persisted in the DB.
2. `TTS_BASE_URL` / `FACE2FACE_BASE_URL` — full URLs.
3. `DUIX_SERVER_HOST` + `TTS_PORT` (18180) + `FACE2FACE_PORT` (8383).

## Run with Docker Compose

```bash
cd web
cp .env.example .env          # edit DUIX_SERVER_HOST + DUIX_DATA_DIR
docker compose -f docker-compose.web.yml up -d --build
# open http://<this-host>:8080
```

`.env` keys:

| Key                | Meaning                                                        |
| ------------------ | -------------------------------------------------------------- |
| `DUIX_SERVER_HOST` | IP/hostname of the backend containers.                         |
| `DUIX_DATA_DIR`    | Host path mounted by the backend as its data volume.           |
| `WEB_PORT`         | Port the UI is published on (default 8080).                    |

> The `DUIX_DATA_DIR` must be the **same** directory the backend `docker-compose`
> mounts (`d:/duix_avatar_data` on Windows, or your Linux path). It contains
> `face2face/` and `voice/` subfolders.

## Run locally (dev)

```bash
# Terminal 1 — BFF
cd web/server
npm install
DATA_ROOT=/path/to/duix_avatar_data DUIX_SERVER_HOST=192.168.1.100 npm run dev

# Terminal 2 — Vue dev server (proxies /api to the BFF)
cd web/client
npm install
npm run dev        # http://localhost:5173
```

Requires `ffmpeg`/`ffprobe` on PATH (or set `FFMPEG_PATH` / `FFPROBE_PATH`).

## Features

- **Create Avatar** — upload a short front-facing video (≥ 8s). The BFF transcodes
  to H.264, extracts the audio, and trains a cloned voice via the TTS service.
- **Create Video** — pick an avatar, type a script (text-to-speech with the
  avatar's cloned voice, with in-browser voice preview), and synthesize. Jobs are
  queued and polled; finished videos appear under **My Works**.
- **Playback & download** — generated videos stream over HTTP with range/seek
  support (progressive streaming on playback).
- **Configurable backend** — point at any backend host from the Settings page.

## About real-time streaming

The **open-source** Duix backend containers perform **asynchronous, non-real-time**
video synthesis (submit → poll → download). Real-time interactive digital-human
streaming is **not provided** by these containers (per the project README it is a
commercial DUIX platform capability). This app therefore streams the synthesized
video on playback; true live avatar streaming would require the DUIX real-time
service and is out of scope for these containers.

## REST API (BFF)

| Method | Path                     | Purpose                          |
| ------ | ------------------------ | -------------------------------- |
| GET    | `/api/health`            | Liveness.                        |
| GET/POST | `/api/config`          | Read / set backend server host.  |
| GET    | `/api/models`            | List avatars (paged).            |
| POST   | `/api/models`            | Create avatar (multipart video). |
| GET    | `/api/models/:id/video`  | Stream a model's source video.   |
| DELETE | `/api/models/:id`        | Delete avatar.                   |
| GET    | `/api/videos`            | List works (poll for progress).  |
| POST   | `/api/videos`            | Save draft.                      |
| POST   | `/api/videos/:id/make`   | Queue synthesis.                 |
| GET    | `/api/videos/:id/file`   | Stream / download result.        |
| DELETE | `/api/videos/:id`        | Delete work.                     |
| POST   | `/api/voice/audition`    | Preview a voice (returns WAV).   |
