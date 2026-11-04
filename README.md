# mini XOS — Multimedia Console

A self-hosted screen management platform. Upload documents, images, and videos; assign them to displays; control playback in real time from any browser.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| Language | TypeScript 5 |
| ORM | Prisma 7 |
| Database | PostgreSQL 16 |
| File Storage | SeaweedFS (S3-compatible) |
| Realtime | Centrifugo (WebSocket) |
| Desktop Player | Electron (XOS) |
| Dev Stack | Docker Compose |

---

## Features

- **Document library** — Upload PDFs, images (JPG, PNG, GIF), and videos (MP4, MOV); browse by session
- **Multi-screen layout** — Assign assets to numbered screens; manage from a single console
- **Real-time media controls** — Control PDF page, video playback, zoom, rotation, and more from `/control` — changes reach screens within ~1 second
- **XOS Desktop Player** — Electron kiosk app for Windows; full-screen playback with live sync via Centrifugo
- **Role-based access** — ADMIN and EDITOR roles; account creation restricted to administrators
- **News simulation** — Per-screen news ticker/overlay configurable via API
- **Presigned URLs** — Short-lived signed storage URLs; players never receive storage credentials
- **Toast notifications** — Success/error feedback throughout the UI

---

## Project Structure

```
├── app/
│   ├── (auth)/login/              # Sign-in page
│   ├── (main)/
│   │   ├── dashboard/             # Overview — stats, recent activity
│   │   ├── documents/             # Document library
│   │   ├── screens/               # Screen management
│   │   ├── control/               # Real-time media control panel
│   │   ├── users/                 # User management (admin only)
│   │   └── news-simulation/       # News simulation config
│   ├── (viewer)/view/screen/[id]/ # Public screen player
│   └── api/
│       ├── auth/                  # login, logout, /me
│       ├── screens/[id]/
│       │   ├── assets/            # Screen asset assignments
│       │   ├── controls/          # GET + PATCH media controls
│       │   └── pdf/[assetId]/     # PDF proxy with byte-range support
│       ├── documents/             # Document CRUD
│       ├── users/                 # User CRUD
│       └── news-simulation/       # News ticker API
├── components/
│   ├── AppShell.tsx               # Root layout: sidebar + navbar
│   ├── AppSidebar.tsx             # Navigation rail (mini XOS brand)
│   ├── Navbar.tsx                 # Top bar
│   ├── LogoutButton.tsx           # User account + logout
│   ├── ControlledMedia.tsx        # Media player with control bindings
│   └── auth/                      # Login form, layout, fields
├── desktop/                       # Electron XOS player
├── lib/
│   ├── auth.ts                    # Session helpers
│   ├── prisma.ts                  # Singleton Prisma client
│   └── media-controls.ts          # Control read/write helpers
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── scripts/
    ├── media-controls.test.ts     # Isolated unit tests
    ├── control-audit.ts           # Integration audit
    └── prepare-media.cjs          # PDF.js asset preparation
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- Docker Desktop (for PostgreSQL, SeaweedFS, and Centrifugo)
- No AWS account required

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Set unique values for `MINIO_SECRET_KEY`, `CENTRIFUGO_API_KEY`, and `CENTRIFUGO_TOKEN_SECRET`. The local `.env` uses PostgreSQL on `localhost:5433`. Docker Compose overrides internal service addresses automatically.

```env
# Realtime (Centrifugo)
CENTRIFUGO_HTTP_URL=http://centrifugo:8000
CENTRIFUGO_PUBLIC_URL=ws://YOUR-LAN-IP:8000/connection/websocket
CENTRIFUGO_API_KEY=replace-with-a-long-random-value
CENTRIFUGO_TOKEN_SECRET=replace-with-a-different-long-random-value
```

> Replace `YOUR-LAN-IP` with the CMS machine's LAN IP for players on other devices.

### 3. Start services

```bash
docker compose up -d db minio centrifugo
```

### 4. Run migrations

```bash
npx prisma migrate deploy
```

### 5. Seed the database

```bash
npx prisma db seed
```

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) (or the configured `APP_PORT`).

---

## Deploy Locally with Docker (Auto-starts on Reboot)

Runs the full stack — Next.js, PostgreSQL, SeaweedFS, and Centrifugo — with `restart: always`.

### Step 1 — Enable Docker Desktop auto-start

**Docker Desktop → Settings → General → "Start Docker Desktop when you log in"**

### Step 2 — Configure `.env`

```bash
cp .env.example .env
```

Set `MINIO_SECRET_KEY`, `CENTRIFUGO_API_KEY`, and `CENTRIFUGO_TOKEN_SECRET`.

### Step 3 — Build and start

```bash
docker compose up -d --build
```

### Step 4 — Migrations run automatically

To run manually:

```bash
docker compose exec app npx prisma migrate deploy
```

### Step 5 — Open the app

Visit [http://localhost:3000](http://localhost:3000) (or your configured `APP_PORT`).

---

### Common Docker Commands

| Command | Description |
|---|---|
| `docker compose up -d --build` | Build and start all services |
| `docker compose up -d` | Start all services (no rebuild) |
| `docker compose down` | Stop all services |
| `docker compose down -v` | Stop and delete all data volumes |
| `docker compose logs -f app` | Stream app logs |
| `docker compose logs -f db` | Stream database logs |
| `docker compose exec app npx prisma studio` | Open Prisma database GUI |
| `docker compose restart app` | Restart only the app container |
| `docker compose build app` | Rebuild the app image after code changes |

### Update after code changes

```bash
docker compose build app
docker compose up -d
```

---

## Local Ports

| Service | Host port env var | Default |
|---|---|---|
| CMS (Next.js) | `APP_PORT` | `3000` |
| PostgreSQL | `POSTGRES_PORT` | `5433` |
| Storage S3 API | `MINIO_API_PORT` | `9000` |
| Storage filer UI | `MINIO_CONSOLE_PORT` | `9001` |
| Centrifugo WebSocket | `CENTRIFUGO_PORT` | `8000` |

For players on other devices, set `CENTRIFUGO_PUBLIC_URL` to `ws://<CMS-PC-LAN-IP>:8000/connection/websocket` and use `http://<CMS-PC-LAN-IP>:3000` as the player server address.

---

## Real-time (Centrifugo)

The browser player, XOS desktop player, and Control page use **WebSocket-only Centrifugo subscriptions**. Each connection performs one credential request and one initial snapshot read after subscribing. Media and control updates arrive as publications — there is no polling, no recurring CMS requests, and no retry queues.

### Control sessions

Select a screen on `/control` and click **Connect**. The session lasts **5 minutes** (local timer). Controls are disabled while disconnected. The API validates a signed, user- and screen-scoped 5-minute credential on every control write. Player subscriptions are independent and remain active after the controller disconnects.

### Write behaviour

Writes commit to PostgreSQL first, then publish the latest screen snapshot. A monotonic database timestamp prevents stale publications from overwriting newer state. Publication failure is reported separately from database success. A deleted screen closes its subscriptions.

> **Note:** No background recovery is scheduled. Clients must explicitly reconnect to read state saved while they were offline.

---

## Media Controls

Open `/control`, select a screen, then pick an assigned item in its media panel. Settings save automatically per screen assignment — two PDFs on the same screen have independent settings. Changes normally reach an open browser or XOS player within **~1 second**.

### API

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/screens/:id/controls` | Screen + ordered assignments with sources, kinds, and saved settings. Public. |
| `PATCH` | `/api/screens/:id/controls` | `{ assetId, patch }` — partial merge. Requires ADMIN or EDITOR session. |
| `GET` | `/api/screens/:id/pdf/:assetId` | Streams PDF with byte-range support. Excludes non-PDF/unassigned assets. |

### Settings reference

**PDF:** `page`, `zoom` (25–300), `scale` (`width`/`page`/`actual`), `rotation` (0/90/180/270), `toolbar`, `thumbnails`

**Video:** `paused`, `position` (seconds), `volume` (0–100), `rate` (0.25–4), `loop`, `autoplay`, `fit` (`contain`/`cover`/`none`)

**Image:** `rotation`, `fit`, `background` (`black`/`white`/`transparent`)

**Website:** `url` (HTTP/HTTPS), `zoom`, `refresh` (seconds, 0 = off), `reload` (numeric revision)

> The video timeline is estimated from the saved command timestamp, not device telemetry. Websites must permit iframe embedding. PDF toolbar/index starts hidden by default.

### Local verification

```powershell
# Unit tests (isolated, no server needed)
node node_modules/tsx/dist/cli.mjs --test scripts/media-controls.test.ts

# Integration audit (requires running CMS + DB)
node node_modules/tsx/dist/cli.mjs scripts/control-audit.ts
```

The audit creates disposable test screens/accounts and removes them on success. Use `--keep-fixtures` to retain them for UI inspection; `--cleanup` to remove afterward. **Do not run against production.**

---

## XOS Desktop Player (`desktop/`)

An Electron kiosk app that plays a screen's assigned content full-screen on a Windows PC, with live sync via Centrifugo.

**Flow:** open `XOS.exe` → full screen → enter Server URL + Screen ID → content plays

| Key | Action |
|---|---|
| `Ctrl + R` / `F5` | Reopens the Screen ID modal (does not reload) |
| `Esc` | Closes the modal, returns to current content |
| `Ctrl + Shift + Q` | Quits the player |

- Config saved to `%APPDATA%\Amagi Screen Player\config.json`
- Default server: `http://localhost:3000` — use the CMS host's LAN IP for other machines
- Receives live control updates via Centrifugo WebSocket; no polling

### Build

```bash
cd desktop
npm install
npm start          # run locally
npm run dist       # builds desktop/dist/AmagiScreenPlayer-1.0.0.exe
```

Copy the built `.exe` to `public/XOS.exe` for the sidebar download link.

> Rebuild XOS after any renderer or PDF.js changes, then copy the new `.exe` to `public/XOS.exe`.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run test:realtime` | Isolated realtime lifecycle tests |
| `npm run test:realtime:integration` | Full integration (needs CMS + DB + Centrifugo) |
| `npm run test:realtime:browser` | Browser tests via Chrome (Connect, expiry, media reuse) |
| `npx prisma studio` | Open Prisma database GUI |
| `npx prisma migrate dev` | Create and apply a new migration |

> Live test suites default to `http://localhost:3001`. Set `REALTIME_TEST_ORIGIN` to override. They load credentials from `.env`.

---

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Sign in |
| `POST` | `/api/auth/logout` | Session | Sign out |
| `GET` | `/api/auth/me` | Session | Current user |
| `GET` | `/api/documents` | Session | List documents |
| `POST` | `/api/documents` | EDITOR+ | Upload document |
| `DELETE` | `/api/documents/:id` | EDITOR+ | Delete document |
| `GET` | `/api/screens` | Session | List screens |
| `POST` | `/api/screens` | EDITOR+ | Create screen |
| `GET` | `/api/screens/:id/assets` | Public | Screen asset list |
| `POST` | `/api/screens/:id/assets` | EDITOR+ | Assign asset to screen |
| `GET` | `/api/screens/:id/controls` | Public | Media control state |
| `PATCH` | `/api/screens/:id/controls` | EDITOR+ | Update media controls |
| `GET` | `/api/screens/:id/pdf/:assetId` | Public | Stream PDF |
| `GET` | `/api/users` | ADMIN | List users |
| `POST` | `/api/users` | ADMIN | Create user |
| `PATCH` | `/api/users/:id` | ADMIN | Update user |
| `DELETE` | `/api/users/:id` | ADMIN | Delete user |
| `GET` | `/api/news-simulation/:screen` | Public | News ticker config |
