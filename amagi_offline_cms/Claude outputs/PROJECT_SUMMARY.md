# Amagi Multimedia Platform — Project Summary

## Overview
**Amagi Multimedia** is a Next.js-based media management platform designed for uploading, organizing, and viewing documents, images, and videos. Files are stored in AWS S3, sessions group uploads, and a universal viewer renders content by MIME type.

**Purpose**: Enable users to upload media files, organize them into playlists, and assign playlists to multiple screens for digital display/signage.

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | Next.js (App Router) | 16.2.4 |
| **UI Library** | React | 19.2.4 |
| **Styling** | Tailwind CSS + shadcn/ui | v4 |
| **Language** | TypeScript | 5 |
| **ORM** | Prisma | 7.8.0 |
| **Database** | PostgreSQL | 16 |
| **Database Driver** | pg (node-postgres) | 8.20.0 |
| **File Storage** | AWS S3 (ap-south-1) | SDK 3.1041.0 |
| **State Management** | React Hooks | — |
| **Notifications** | Sonner | 2.0.7 |
| **Icons** | Lucide React | 1.17.0 |

---

## Folder Structure

```
multi-media/
├── app/
│   ├── (main)/                           # Public-facing application routes
│   │   ├── layout.tsx                    # Main layout with Navbar + Footer
│   │   ├── page.tsx                      # Home page — file upload
│   │   ├── main-screen/
│   │   │   └── page.tsx                  # Dashboard — sessions, playlists, screens
│   │   ├── playlist-builder/
│   │   │   └── page.tsx                  # Playlist creation UI
│   │   ├── playlists/
│   │   │   └── page.tsx                  # Playlists list view
│   │   └── screens/
│   │       └── page.tsx                  # Screens management
│   │
│   ├── (viewer)/                         # Dedicated viewer routes
│   │   └── view/
│   │       ├── [docId]/
│   │       │   ├── page.tsx              # Document viewer (SSR)
│   │       │   └── CloseButton.tsx       # Close button component
│   │       ├── playlist/[playlistId]/
│   │       │   ├── page.tsx              # Playlist viewer
│   │       │   └── PlaylistPlayer.tsx    # Playlist player logic
│   │       ├── screen/[screenId]/
│   │       │   ├── page.tsx              # Screen viewer
│   │       │   └── ScreenPlayer.tsx      # Screen player logic
│   │
│   ├── api/                              # RESTful API routes
│   │   ├── upload/route.ts               # File upload to S3 + DB
│   │   ├── documents/
│   │   │   ├── route.ts                  # List all documents
│   │   │   └── [id]/route.ts             # Get single document
│   │   ├── sessions/
│   │   │   ├── route.ts                  # GET all sessions
│   │   │   └── [id]/route.ts             # GET session with documents
│   │   ├── playlists/
│   │   │   ├── route.ts                  # GET/POST playlists
│   │   │   └── [id]/route.ts             # GET/DELETE playlist
│   │   ├── screens/
│   │   │   ├── route.ts                  # GET/POST screens
│   │   │   └── [screenId]/route.ts       # GET/PATCH/DELETE screen
│   │   └── sessions/[id]/route.ts        # Manage sessions
│   │
│   ├── generated/prisma/                 # Auto-generated Prisma types
│   │   ├── browser.ts                    # Browser client
│   │   ├── client.ts                     # Main client export
│   │   ├── enums.ts                      # Prisma enums
│   │   ├── models/                       # Type definitions
│   │   │   ├── Document.ts
│   │   │   ├── Playlist.ts
│   │   │   ├── PlaylistItem.ts
│   │   │   ├── Screen.ts
│   │   │   └── Session.ts
│   │   └── commonInputTypes.ts
│   │
│   ├── globals.css                       # Global styles (Tailwind)
│   ├── layout.tsx                        # Root layout
│   └── favicon.ico
│
├── components/
│   ├── FileUpload.tsx                    # File drag-drop + upload input
│   ├── Navbar.tsx                        # Top navigation
│   ├── Footer.tsx                        # Bottom footer
│   ├── Toast.tsx                         # Toast notification wrapper
│   ├── UniversalMediaViewer.tsx          # MIME-type based viewer
│   │
│   └── main-screen/
│       ├── SessionSidebar.tsx            # Left sidebar (sessions/playlists)
│       ├── FilePanel.tsx                 # Center panel (document grid)
│       ├── ScreenPanel.tsx               # Right panel (screens + assignment)
│       └── shared.tsx                    # Shared types, utils, StatusBadge
│
├── lib/
│   ├── prisma.ts                         # Singleton Prisma client
│   ├── s3.js                             # S3 upload + presigned URL utilities
│   └── utils.ts                          # General utilities
│
├── prisma/
│   ├── schema.prisma                     # Data model definitions
│   └── migrations/                       # DB migration history
│
├── public/
│   └── [assets]                          # Static assets (icons, logos)
│
├── package.json                          # Dependencies & scripts
├── tsconfig.json                         # TypeScript config
├── next.config.ts                        # Next.js config
├── tailwind.config.ts                    # Tailwind config
├── postcss.config.mjs                    # PostCSS config
├── components.json                       # shadcn/ui config
├── prisma.config.ts                      # Prisma config (custom output)
├── Dockerfile                            # Docker image definition
├── docker-compose.yaml                   # Docker Compose orchestration
├── entrypoint.sh                         # Container startup script
├── .env                                  # Environment variables
├── .env.example                          # Template for .env
├── .gitignore
├── README.md                             # Project documentation
├── AGENTS.md                             # AI agent guidelines
└── CLAUDE.md                             # Claude Code instructions
```

---

## Data Model (Prisma Schema)

### Core Models

```
Session
├── id (CUID, primary key)
├── status (PENDING | UPLOADING | COMPLETED | FAILED)
├── createdAt
├── updatedAt
└── documents[] (relationship)

Document
├── id (CUID, primary key)
├── sessionId (FK to Session)
├── name
├── size
├── mimeType
├── s3Bucket, s3Key, s3Url (AWS S3 metadata)
├── status (PENDING | UPLOADING | UPLOADED | FAILED)
├── createdAt
├── updatedAt
├── session (relationship)
└── playlistItems[] (relationship)

Playlist
├── id (UUID)
├── name
├── loopCount
├── loopUnlimited
├── s3Bucket, s3Key, s3Url (playlist.json in S3)
├── createdAt
├── updatedAt
├── items[] (PlaylistItem relationship)
└── screens[] (relationship)

PlaylistItem
├── id (CUID, primary key)
├── playlistId (FK to Playlist)
├── documentId (FK to Document)
├── order (position in playlist)
├── playlist (relationship)
└── document (relationship)
└── @@unique([playlistId, order])

Screen
├── id (CUID, primary key)
├── name
├── playlistId (FK to Playlist, optional)
├── playlist (relationship)
├── createdAt
└── updatedAt
```

---

## Application Flow

### 1. File Upload Flow
```
User selects files (drag-drop or file picker)
  ↓
POST /api/upload (with FormData)
  ├── Create Session { status: UPLOADING }
  ├── For each file:
  │   ├── Convert to Buffer
  │   ├── Sanitize filename
  │   ├── Upload to S3 (sessions/{sessionId}/{timestamp}-{filename})
  │   └── Create Document record { s3Url, s3Key, status: UPLOADED }
  ├── Update Session { status: COMPLETED }
  └── Return Session + Documents
  ↓
Toast notification → Redirect to /main-screen
```

### 2. Session & Playlist Management Flow
```
Dashboard (/main-screen)
  ├── Left Sidebar (SessionSidebar)
  │   ├── Tabs: Sessions | Playlists
  │   ├── GET /api/sessions → List all sessions
  │   ├── GET /api/playlists → List all playlists
  │   └── Click to select
  │
  ├── Center Panel (FilePanel)
  │   ├── GET /api/sessions/{id} → Fetch documents
  │   ├── GET /api/playlists/{id} → Fetch playlist items
  │   └── Render document grid with MIME-type icons
  │
  └── Right Panel (ScreenPanel)
      ├── GET /api/screens → Fetch all screens
      ├── Each screen can have a playlist assigned
      ├── Drag documents → Create playlists
      └── Drag playlists → Assign to screens
```

### 3. Playlist Creation Flow
```
User selects documents and creates a playlist
  ↓
POST /api/playlists
  ├── Validate documentIds
  ├── Fetch Document records
  ├── Maintain order from client
  ├── Generate playlist.json (metadata + S3 URLs)
  ├── Upload playlist.json to S3 (playlists/{playlistId}.json)
  ├── Create Playlist record + PlaylistItems
  └── Return Playlist with items
  ↓
Playlist assigned to a Screen
  ↓
POST /api/screens/{screenId}
  ├── PATCH Screen { playlistId }
  └── Screen now displays that playlist's content
```

### 4. Viewer Flow
```
Click document → /view/{docId}
  ├── SSR fetch Document metadata
  ├── Generate presigned S3 URL (1-hour expiry)
  └── Render based on MIME type:
      ├── video/* → <video> native player
      ├── image/* → Full-screen image
      ├── application/pdf → <iframe>
      └── other → Download link

Click playlist → /view/playlist/{playlistId}
  ├── Fetch Playlist with items
  ├── Generate presigned URLs for each document
  └── PlaylistPlayer manages looping & sequencing

Click screen → /view/screen/{screenId}
  ├── Fetch Screen with playlist
  ├── ScreenPlayer renders assigned playlist
  └── Optionally loop content
```

---

## Key API Routes

### Sessions (Upload Management)
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/upload` | Upload files → creates Session + Documents |
| GET | `/api/sessions` | List all sessions with document counts |
| GET | `/api/sessions/{id}` | Get session with all documents |
| GET | `/api/documents/{id}` | Get single document metadata |

### Playlists (Content Organization)
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/playlists` | List all playlists |
| POST | `/api/playlists` | Create a new playlist from document IDs |
| GET | `/api/playlists/{id}` | Get playlist with presigned URLs |
| DELETE | `/api/playlists/{id}` | Delete a playlist |

### Screens (Display Management)
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/screens` | List all screens with assigned playlists |
| POST | `/api/screens` | Create a new screen |
| PATCH | `/api/screens/{id}` | Assign a playlist to a screen |
| DELETE | `/api/screens/{id}` | Delete a screen |

---

## Component Hierarchy

```
<root layout>
  ├── <Navbar />
  │
  ├── <(main) layout>
  │   ├── <page> (home — file upload)
  │   │   └── <FileUpload />
  │   │       └── XHR progress tracking
  │   │
  │   ├── <main-screen>
  │   │   └── <MainScreen> (dashboard)
  │   │       ├── <SessionSidebar />
  │   │       │   └── Session/Playlist list
  │   │       ├── <FilePanel />
  │   │       │   └── Document grid (MIME-type icons)
  │   │       └── <ScreenPanel />
  │   │           └── Screen management + playlist assignment
  │   │
  │   └── <playlists> / <screens> (secondary views)
  │
  ├── <(viewer) layout>
  │   ├── <view/[docId]>
  │   │   ├── <UniversalMediaViewer />
  │   │   └── <CloseButton />
  │   │
  │   ├── <view/playlist/[playlistId]>
  │   │   ├── <PlaylistPlayer />
  │   │   └── Loops through documents
  │   │
  │   └── <view/screen/[screenId]>
  │       ├── <ScreenPlayer />
  │       └── Displays assigned playlist
  │
  └── <Footer />
```

---

## S3 Storage Structure

```
s3://{BUCKET_NAME}/
├── sessions/
│   ├── {sessionId}/
│   │   ├── {timestamp}-filename1.pdf
│   │   ├── {timestamp}-filename2.jpg
│   │   └── {timestamp}-filename3.mp4
│   └── ...
│
└── playlists/
    ├── {playlistId}.json
    └── ...
```

**Presigned URLs**: Generated at request time with 1-hour expiry for security.

---

## Key Features

### 1. Multi-file Upload
- Drag-and-drop or browse interface
- XHR-based progress tracking per batch
- Supported types: PDF, images (JPG, PNG, GIF), videos (MP4, MOV)

### 2. Session Management
- Groups upload batches with status tracking
- States: `PENDING` → `UPLOADING` → `COMPLETED` / `FAILED`
- Document metadata stored in DB; files in S3

### 3. Playlist Builder
- Drag documents to create ordered playlists
- Loop settings: fixed count or unlimited
- Playlist metadata saved as JSON in S3

### 4. Screen Management
- Create multiple named screens
- Assign playlists to screens dynamically
- Each screen can display different content

### 5. Universal Viewer
- Auto-detects MIME type and renders appropriately:
  - `video/*` → Native HTML5 player
  - `image/*` → Full-screen responsive display
  - `application/pdf` → Embedded iframe
  - Other types → Download link
- Presigned S3 URLs for secure access

### 6. Toast Notifications
- Real-time feedback for upload, creation, and error states

---

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Set up environment variables (.env)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/multimedia
AWS_ACCESS_KEY=...
AWS_SECRET_KEY=...
BUCKET_NAME=...
AWS_REGION=ap-south-1

# Start PostgreSQL (Docker)
docker-compose up -d

# Run database migrations
npx prisma migrate deploy

# Start dev server
npm run dev

# Open http://localhost:3000
```

### Docker Deployment
```bash
# Build and start all services
docker compose up -d --build

# Run migrations in container
docker compose exec app npx prisma migrate deploy

# View logs
docker compose logs -f app
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                          │
├──────────────┬──────────────────────┬──────────────────────┤
│   Upload     │   Dashboard          │   Viewers            │
│   (home)     │   (main-screen)      │   (viewer routes)    │
└──────────────┴──────────────────────┴──────────────────────┘
       │                   │                      │
       │                   │                      │
       ▼                   ▼                      ▼
    POST /upload        GET /sessions          GET /view/{docId}
    POST /upload        GET /playlists         GET /view/playlist/{id}
                        GET /screens           GET /view/screen/{id}
       │                   │                      │
       │                   │                      │
       ▼                   ▼                      ▼
┌──────────────────────────────────────────────────────────────┐
│                   Next.js API Routes                         │
│  (Upload | Sessions | Playlists | Screens | Documents)      │
└──────────────────────────────────────────────────────────────┘
       │                   │                      │
       ├───────────────────┼──────────────────────┤
       │                   │                      │
       ▼                   ▼                      ▼
┌────────────┐      ┌────────────┐          ┌────────────┐
│ AWS S3     │      │ PostgreSQL │          │ Prisma ORM │
│            │      │            │          │            │
│ - Files    │◄────►│ - Sessions │◄────────►│ - Queries  │
│ - Playlists│      │ - Documents│          │ - Mutations│
│            │      │ - Playlists│          │            │
│            │      │ - Screens  │          │            │
└────────────┘      └────────────┘          └────────────┘
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database_name

# AWS S3
AWS_ACCESS_KEY=your_access_key_id
AWS_SECRET_KEY=your_secret_access_key
BUCKET_NAME=your_s3_bucket_name
AWS_REGION=ap-south-1
```

---

## Current State & Capabilities

✅ **Implemented**:
- Multi-file upload with progress tracking
- Session & document management
- Playlist creation from documents
- Screen management with playlist assignment
- Universal MIME-type aware viewer
- Presigned S3 URLs for secure access
- Toast notifications
- Responsive UI with Tailwind CSS

🔄 **In Progress / Future**:
- Advanced playlist scheduling
- Screen content analytics
- User authentication / roles
- Batch operations
- Content preview thumbnails
- Playlist templates

---

## Key Dependencies & Their Roles

| Package | Purpose |
|---|---|
| **Next.js 16** | Full-stack React framework with App Router |
| **React 19** | UI component library |
| **Prisma 7** | Type-safe ORM for database operations |
| **PostgreSQL** | Relational database for metadata |
| **AWS SDK S3** | File upload & retrieval from cloud storage |
| **Tailwind CSS** | Utility-first styling framework |
| **shadcn/ui** | Pre-built accessible UI components |
| **Sonner** | Toast notification library |
| **Lucide React** | Icon library for MIME-type indicators |

---

## Summary

**Amagi Multimedia** is a production-ready media management system that:
1. **Ingests** files via drag-drop upload
2. **Stores** files in AWS S3 with metadata in PostgreSQL
3. **Organizes** content into playlists with configurable looping
4. **Distributes** playlists across multiple screens
5. **Serves** content via presigned URLs with proper MIME-type rendering

The architecture is modular, scalable, and uses industry-standard tools (Next.js, Prisma, PostgreSQL, S3) to handle enterprise media workflows.
