# Amagi Multimedia — Architecture & Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Browser (React 19 + Next.js 16 App Router)                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                                                                       │   │
│  │  ┌─────────────────────┐  ┌──────────────────┐  ┌────────────────┐  │   │
│  │  │  Upload Page        │  │  Dashboard       │  │  Viewer Pages  │  │   │
│  │  │  (/)                │  │  (/main-screen)  │  │  (/view/*)     │  │   │
│  │  │                     │  │                  │  │                │  │   │
│  │  │ • FileUpload        │  │ • SessionSidebar │  │ • DocViewer    │  │   │
│  │  │ • XHR progress      │  │ • FilePanel      │  │ • PlaylistPl.. │  │   │
│  │  │ • Toast notif       │  │ • ScreenPanel    │  │ • ScreenPlayer │  │   │
│  │  │                     │  │                  │  │                │  │   │
│  │  └─────────────────────┘  └──────────────────┘  └────────────────┘  │   │
│  │           │                       │                      │            │   │
│  └───────────┼───────────────────────┼──────────────────────┼────────────┘   │
│              │                       │                      │                │
└──────────────┼───────────────────────┼──────────────────────┼────────────────┘
               │                       │                      │
               │ HTTP/JSON             │ HTTP/JSON            │ HTTP/JSON
               │                       │                      │
┌──────────────┼───────────────────────┼──────────────────────┼────────────────┐
│              │                       │                      │                │
│   ┌──────────▼────────────┐  ┌───────▼──────────┐  ┌───────▼────────────┐  │
│   │  API LAYER            │  │ API ROUTES       │  │  BUSINESS LOGIC    │  │
│   │  (Next.js Routes)     │  │                  │  │  (Prisma + S3)     │  │
│   ├──────────────────────┤  ├──────────────────┤  ├────────────────────┤  │
│   │                      │  │                  │  │                    │  │
│   │ POST /upload         │  │ • uploadBuffer() │  │ • Session creation │  │
│   │ GET /sessions        │  │ • getPresignedUrl│  │ • Document CRUD    │  │
│   │ GET /sessions/{id}   │  │ • prisma queries │  │ • Playlist build   │  │
│   │ GET /playlists       │  │                  │  │ • Screen mgmt      │  │
│   │ POST /playlists      │  │                  │  │                    │  │
│   │ GET /playlists/{id}  │  │                  │  │                    │  │
│   │ GET /screens         │  │                  │  │                    │  │
│   │ POST /screens        │  │                  │  │                    │  │
│   │ DELETE /screens/{id} │  │                  │  │                    │  │
│   │ ...                  │  │                  │  │                    │  │
│   │                      │  │                  │  │                    │  │
│   └──────────┬───────────┘  └────────┬─────────┘  └────────┬───────────┘  │
│              │                       │                      │              │
└──────────────┼───────────────────────┼──────────────────────┼──────────────┘
               │                       │                      │
               │ Prisma ORM            │ AWS SDK              │
               │                       │                      │
┌──────────────┼───────────────────────┼──────────────────────┼──────────────┐
│              │                       │                      │              │
│   ┌──────────▼────────────┐  ┌───────▼──────────┐  ┌───────▼────────────┐  │
│   │  DATA LAYER           │  │ STORAGE LAYER    │  │  EXTERNAL SERVICES │  │
│   │  (PostgreSQL)         │  │  (AWS S3)        │  │                    │  │
│   ├──────────────────────┤  ├──────────────────┤  ├────────────────────┤  │
│   │                      │  │                  │  │                    │  │
│   │ Sessions             │  │ /sessions        │  │ AWS S3             │  │
│   │ Documents            │  │ /playlists       │  │ • PutObject        │  │
│   │ Playlists            │  │ /files           │  │ • GetObject        │  │
│   │ PlaylistItems        │  │                  │  │ • PresignedURLs    │  │
│   │ Screens              │  │ Presigned URLs   │  │                    │  │
│   │ (+ Relationships)    │  │ (1-hour TTL)     │  │ Region: ap-south-1 │  │
│   │                      │  │                  │  │                    │  │
│   └──────────────────────┘  └──────────────────┘  └────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Upload Flow (Detailed)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER UPLOAD FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

1. USER INTERACTION
   ┌──────────────────────┐
   │ Select files         │
   │ (drag-drop or browse)│
   └──────────────────────┘
            │
            │ FileUpload.tsx validates
            │
            ▼
   ┌──────────────────────────────────────┐
   │ FormData with files                  │
   └──────────────────────────────────────┘

2. CLIENT UPLOAD
   ┌──────────────────────────────────────┐
   │ POST /api/upload (XHR)               │
   │ • Progress tracking per file         │
   │ • Toast notifications                │
   └──────────────────────────────────────┘
            │
            ▼

3. SERVER PROCESSING
   ┌──────────────────────────────────────┐
   │ Receive FormData                     │
   │ Extract files array                  │
   └──────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────┐
   │ prisma.session.create()              │
   │ { status: 'UPLOADING' }              │
   └──────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────┐
   │ FOR EACH FILE:                       │
   │                                      │
   │ • Convert to Buffer                  │
   │ • Sanitize filename                  │
   │ • Generate S3 key:                   │
   │   sessions/{sessionId}/{ts}-{name}   │
   │                                      │
   └──────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────┐
   │ uploadBuffer(buffer, bucket, key)    │
   │ (AWS SDK S3 PutObject)               │
   │                                      │
   │ Returns: s3Url                       │
   └──────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────┐
   │ prisma.document.create()             │
   │ {                                    │
   │   sessionId: session.id,             │
   │   name, size, mimeType,              │
   │   s3Bucket, s3Key, s3Url,            │
   │   status: 'UPLOADED'                 │
   │ }                                    │
   └──────────────────────────────────────┘
            │
            │ (Loop for all files)
            │
            ▼
   ┌──────────────────────────────────────┐
   │ prisma.session.update()              │
   │ { status: 'COMPLETED' }              │
   │ .include({ documents: true })        │
   └──────────────────────────────────────┘

4. RESPONSE & REDIRECT
   ┌──────────────────────────────────────┐
   │ Return: 201 + Session + Documents    │
   │                                      │
   │ {                                    │
   │   id: "...",                         │
   │   status: "COMPLETED",               │
   │   documents: [{ ... }, { ... }]      │
   │ }                                    │
   └──────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────┐
   │ Client:                              │
   │ • Show success toast                 │
   │ • Redirect to /main-screen           │
   └──────────────────────────────────────┘
```

---

## Dashboard Flow (Main Screen)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DASHBOARD DATA FLOW                                   │
│                        (/main-screen)                                        │
└─────────────────────────────────────────────────────────────────────────────┘

INITIAL PAGE LOAD
├─ MainScreen Component (Client)
│  │
│  ├─ useEffect #1
│  │  ├─ GET /api/sessions
│  │  │  └─ prisma.session.findMany()
│  │  │     └─ return: [{ id, status, documents }, ...]
│  │  │
│  │  └─ GET /api/playlists
│  │     └─ prisma.playlist.findMany()
│  │        ├─ .include({ items: { ...documents } })
│  │        └─ return: [{ id, name, items: [docs] }, ...]
│  │
│  └─ setState(sessions, playlists)
│
├─ Render: 3-panel layout
│  │
│  ├─ LEFT: SessionSidebar
│  │  │
│  │  ├─ Tab 1: Sessions
│  │  │  ├─ Sessions list (clickable)
│  │  │  └─ onclick(sessionId) → setState(selectedId, activeTab='sessions')
│  │  │
│  │  └─ Tab 2: Playlists
│  │     ├─ Playlists list (clickable)
│  │     └─ onclick(playlistId) → setState(selectedId, activeTab='playlists')
│  │
│  ├─ CENTER: FilePanel
│  │  │
│  │  ├─ useEffect #2 (depends on: selectedId, activeTab)
│  │  │  │
│  │  │  ├─ IF activeTab === 'sessions':
│  │  │  │  └─ GET /api/sessions/{selectedId}
│  │  │  │     └─ prisma.session.findUnique()
│  │  │  │        ├─ .include({ documents: true })
│  │  │  │        └─ setState(detail)
│  │  │  │
│  │  │  └─ IF activeTab === 'playlists':
│  │  │     └─ GET /api/playlists/{selectedId}
│  │  │        └─ prisma.playlist.findUnique()
│  │  │           ├─ .include({ items: { ...documents } })
│  │  │           └─ Transform items → detail.documents
│  │  │              └─ setState(detail)
│  │  │
│  │  └─ Render: Document Grid
│  │     ├─ For each document:
│  │     │  ├─ Display thumbnail/icon (by MIME type)
│  │     │  ├─ File name
│  │     │  ├─ Size, type
│  │     │  └─ Drag handle (for playlist builder)
│  │     │
│  │     └─ onclick(docId) → window.open(/view/{docId}, '_blank')
│  │
│  └─ RIGHT: ScreenPanel
│     │
│     ├─ GET /api/screens → prisma.screen.findMany()
│     │  └─ .include({ playlist: { items: { documents } } })
│     │
│     ├─ Render: Screen Cards
│     │  ├─ For each screen:
│     │  │  ├─ Screen name
│     │  │  ├─ Assigned playlist (if any)
│     │  │  ├─ Add/Remove buttons
│     │  │  │
│     │  │  ├─ Drag document → 
│     │  │  │  ├─ POST /api/playlists
│     │  │  │  │  └─ Create new playlist from selected docs
│     │  │  │  │
│     │  │  │  └─ PATCH /api/screens/{screenId}
│     │  │  │     └─ Assign playlist to screen
│     │  │  │
│     │  │  └─ Create new screen button
│     │  │     └─ POST /api/screens
│     │  │        └─ prisma.screen.create()
│     │  │
│     │  └─ Delete screen
│     │     └─ DELETE /api/screens/{screenId}
│     │        └─ prisma.screen.delete()
│     │
│     └─ View in display mode
│        └─ onclick(screenId) → window.open(/view/screen/{screenId}, '_blank')
```

---

## Viewer Flow (Rendering Content)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VIEWER ROUTING & RENDERING                               │
└─────────────────────────────────────────────────────────────────────────────┘

DOCUMENT VIEWER: /view/{docId}
├─ Page Component (SSR)
│  │
│  ├─ Fetch document from DB
│  │  └─ prisma.document.findUnique({ where: { id } })
│  │
│  ├─ Generate presigned S3 URL
│  │  └─ getPresignedUrl(bucket, s3Key)
│  │     └─ AWS SDK S3.getSignedUrl() → valid for 1 hour
│  │
│  └─ Render UniversalMediaViewer
│     │
│     └─ Switch(mimeType)
│        │
│        ├─ video/*
│        │  └─ <video controls src={presignedUrl} />
│        │
│        ├─ image/*
│        │  └─ <img src={presignedUrl} style={{ maxWidth: '100vw' }} />
│        │
│        ├─ application/pdf
│        │  └─ <iframe src={presignedUrl} />
│        │
│        └─ default
│           └─ <a href={presignedUrl}>Download</a>


PLAYLIST VIEWER: /view/playlist/{playlistId}
├─ Page Component (SSR)
│  │
│  ├─ Fetch playlist
│  │  └─ prisma.playlist.findUnique({
│  │     include: { items: { documents } }
│  │  })
│  │
│  ├─ Generate presigned URLs for ALL documents
│  │  └─ For each document.s3Key:
│  │     └─ getPresignedUrl() → 1-hour TTL
│  │
│  └─ Render PlaylistPlayer
│     │
│     └─ ClientComponent (playlist state in React)
│        │
│        ├─ Initialize: currentIndex = 0, loopCount
│        │
│        ├─ Render current document (MIME-aware)
│        │
│        ├─ Navigate: Next/Prev buttons
│        │  ├─ onNext: increment index → wrap if loopUnlimited
│        │  └─ onPrev: decrement index
│        │
│        ├─ Loop logic:
│        │  ├─ If loopUnlimited: cycle forever
│        │  └─ If loopCount: stop after N iterations
│        │
│        └─ Controls:
│           ├─ Play/Pause
│           ├─ Jump to item
│           └─ Exit


SCREEN VIEWER: /view/screen/{screenId}
├─ Page Component (SSR)
│  │
│  ├─ Fetch screen with playlist
│  │  └─ prisma.screen.findUnique({
│  │     include: { playlist: { items: { documents } } }
│  │  })
│  │
│  ├─ If screen.playlistId:
│  │  │
│  │  ├─ Generate presigned URLs
│  │  │
│  │  └─ Render ScreenPlayer
│  │     │
│  │     └─ Full-screen playlist display
│  │        ├─ Optional: auto-play
│  │        ├─ Optional: hide controls
│  │        ├─ Focus on content (e.g., for digital signage)
│  │        └─ Respects playlist loopCount/loopUnlimited
│  │
│  └─ If no playlist:
│     └─ Show: "No playlist assigned"
```

---

## Database Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RELATIONAL MODEL                                      │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────┐
                          │   Session   │
                          ├─────────────┤
                          │ id (PK)     │
                          │ status      │
                          │ createdAt   │
                          │ updatedAt   │
                          └──────┬──────┘
                                 │ 1:N
                                 │
                ┌────────────────▼────────────────┐
                │       Document                  │
                ├─────────────────────────────────┤
                │ id (PK)                         │
                │ sessionId (FK)  ─────────────┐  │
                │ name                         │  │
                │ size                         │  │
                │ mimeType                     │  │
                │ s3Bucket, s3Key, s3Url       │  │
                │ status                       │  │
                │ createdAt, updatedAt         │  │
                └────────────────┬──────────────┘  │
                                 │ 1:N            │
                                 │                │
                    ┌────────────▼──────────┐     │
                    │   PlaylistItem        │     │
                    ├──────────────────────┤     │
                    │ id (PK)              │     │
                    │ playlistId (FK)  ────┼──┐  │
                    │ documentId (FK)  ────┼──┼──┘
                    │ order                │  │
                    │ Unique(playlistId,   │  │
                    │        order)        │  │
                    └──────────────────────┘  │
                                 ▲            │
                                 │ 1:N        │
                                 │            │
                          ┌──────┴───────────┐
                          │    Playlist     │
                          ├────────────────┤
                          │ id (PK)        │
                          │ name           │
                          │ loopCount      │
                          │ loopUnlimited  │
                          │ s3Bucket       │
                          │ s3Key          │
                          │ s3Url          │
                          │ createdAt      │
                          │ updatedAt      │
                          └────────┬───────┘
                                   │ 1:N
                                   │
                           ┌───────▼────────┐
                           │     Screen     │
                           ├────────────────┤
                           │ id (PK)        │
                           │ name           │
                           │ playlistId(FK) │
                           │ createdAt      │
                           │ updatedAt      │
                           └────────────────┘

KEY:
PK = Primary Key
FK = Foreign Key
1:N = One-to-Many relationship
```

---

## State Management & Props Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│          REACT COMPONENT STATE & PROPS (Main Screen)                        │
└─────────────────────────────────────────────────────────────────────────────┘

<MainScreen> (Dashboard Page)
├─ State:
│  ├─ sessions: Session[]
│  ├─ playlists: Playlist[]
│  ├─ activeTab: 'sessions' | 'playlists'
│  ├─ selectedId: string | null
│  ├─ detail: SessionDetail | null
│  └─ loadingStates: boolean
│
├─ PASS DOWN ↓
│
├─ <SessionSidebar>
│  ├─ Props IN:
│  │  ├─ sessions: Session[]
│  │  ├─ playlists: Playlist[]
│  │  ├─ activeTab: 'sessions' | 'playlists'
│  │  ├─ selectedId: string | null
│  │  ├─ onSelect(id): void
│  │  └─ onTabChange(tab): void
│  │
│  └─ Handlers:
│     ├─ onclick(sessionId) → onSelect(sessionId)
│     └─ onTabChange('playlists') → refresh data
│
├─ <FilePanel>
│  ├─ Props IN:
│  │  ├─ selectedId: string | null
│  │  ├─ detail: SessionDetail | null
│  │  ├─ loading: boolean
│  │
│  └─ Render:
│     ├─ IF loading: <Skeleton>
│     ├─ ELSE IF detail: <DocumentGrid>
│     └─ ELSE: "Select a session"
│
└─ <ScreenPanel>
   ├─ Props IN: (none from parent)
   │  └─ Local fetch: GET /api/screens
   │
   └─ Handlers:
      ├─ CREATE screen: POST /api/screens
      ├─ DELETE screen: DELETE /api/screens/{id}
      ├─ ASSIGN playlist:
      │  ├─ Create playlist: POST /api/playlists
      │  └─ Link to screen: PATCH /api/screens/{screenId}
      └─ OPEN viewer: window.open(/view/screen/{screenId})
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING & RECOVERY                                │
└─────────────────────────────────────────────────────────────────────────────┘

UPLOAD ERROR
├─ Try Block Fails
│  ├─ File validation fails? → Return 400
│  ├─ S3 upload fails?
│  │  └─ Catch & rollback:
│  │     └─ prisma.session.update({ status: 'FAILED' })
│  │        └─ Toast: "Upload failed"
│  └─ DB write fails?
│     └─ Same rollback flow
│
└─ Client shows toast & redirects to home

DATABASE FETCH ERROR
├─ GET /api/sessions (or any route)
│  ├─ Prisma error caught
│  │  └─ console.error()
│  │
│  └─ Return: 500 + { error: 'Failed to fetch...' }
│
└─ Client state:
   ├─ setState(detail, null)
   └─ Toast: "Failed to load"

MISSING RESOURCE
├─ GET /api/sessions/{id} but session doesn't exist
│  └─ prisma.session.findUnique() → null
│     └─ Return: 404 + { error: 'Session not found' }
│
└─ Client: displays "Not found" message

S3 PRESIGNED URL GENERATION FAILS
├─ getPresignedUrl() throws
│  ├─ console.error()
│  └─ Fall back to stored s3Url
│
└─ Content still loads (may expire after 1 hour)
```

---

## Key Performance Considerations

### Database Queries
```
.include({ documents: true })      → Load related documents
.include({ items: { documents } }) → Eager load nested relationships
.orderBy({ createdAt: 'desc' })    → Index on createdAt for efficiency
```

### S3 Operations
```
Presigned URLs
├─ Generated on-demand
├─ 1-hour TTL (security)
└─ No repeated generation for same doc

Upload Optimization
├─ XHR-based for progress tracking
├─ Client-side file validation
└─ S3 multipart upload (implicit in AWS SDK)
```

### API Response Optimization
```
GET /sessions        → List view (minimal data)
GET /sessions/{id}   → Detailed view (with documents)
GET /playlists/{id}  → Fetch + generate presigned URLs
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DOCKER COMPOSE SETUP                                    │
└─────────────────────────────────────────────────────────────────────────────┘

docker-compose.yaml
├─ Service: app
│  ├─ Image: custom Next.js image (Dockerfile)
│  ├─ Ports: 3000:3000
│  ├─ Depends on: db (healthcheck)
│  ├─ Environment:
│  │  ├─ DATABASE_URL (points to 'db' service)
│  │  ├─ AWS_ACCESS_KEY
│  │  ├─ AWS_SECRET_KEY
│  │  ├─ BUCKET_NAME
│  │  └─ AWS_REGION
│  │
│  └─ Restart: always
│
└─ Service: db
   ├─ Image: postgres:16
   ├─ Ports: 5432:5432
   ├─ Volumes:
   │  └─ postgres_data (persistent)
   ├─ Environment:
   │  ├─ POSTGRES_DB=multimedia
   │  └─ POSTGRES_PASSWORD=...
   │
   └─ Restart: always

Both containers restart on:
├─ System reboot (if Docker Desktop auto-start enabled)
├─ Docker daemon restart
└─ Explicit restart command
```

---

## Summary Flow Diagram

```
USER INPUT
    │
    ├─── FILE UPLOAD ──────┬──────── API /upload ──────┬──── S3 + DB
    │                      │                            │
    ├─── SELECT SESSION ───┼──────── API /sessions/{id} ┼──── View Documents
    │                      │                            │
    ├─── CREATE PLAYLIST ──┼──────── API /playlists ────┼──── S3 + DB
    │                      │                            │
    ├─── ASSIGN SCREEN ────┼──────── API /screens ──────┼──── DB Update
    │                      │                            │
    └─── VIEW CONTENT ─────┼──────── API /view/{*} ─────┼──── Render MIME

All flows:
• Generate S3 presigned URLs (1hr TTL)
• Show toast notifications
• Handle errors gracefully
• Update UI state
```

