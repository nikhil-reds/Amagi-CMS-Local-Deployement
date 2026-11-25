# Key Files Reference Guide

Quick guide to understanding what each file does and where to make changes.

---

## Core API Routes

### Upload Management
**File**: `app/api/upload/route.ts`
- **Purpose**: Handle file uploads from the client
- **Methods**: `POST`
- **Flow**:
  1. Validate form data
  2. Create Session (UPLOADING)
  3. For each file: upload to S3 → create Document record
  4. Update Session (COMPLETED)
- **Modifying**: Add validation rules, change S3 path structure, add file size limits

---

### Sessions API
**File**: `app/api/sessions/route.ts`
- **Purpose**: List all upload sessions
- **Methods**: `GET`
- **Returns**: Array of sessions with document counts
- **Modifying**: Add filtering (by date/status), pagination

**File**: `app/api/sessions/[id]/route.ts`
- **Purpose**: Get a single session with all documents
- **Methods**: `GET`
- **Returns**: Session + documents array
- **Modifying**: Add presigned URLs, caching, permission checks

---

### Playlists API
**File**: `app/api/playlists/route.ts`
- **Purpose**: List and create playlists
- **Methods**: `GET` (list), `POST` (create)
- **Key Logic**:
  - Fetch documents by ID
  - Create playlist.json file
  - Upload to S3 at `playlists/{playlistId}.json`
  - Save metadata + relationships in DB
- **Modifying**: Add playlist templates, advanced ordering, validation

**File**: `app/api/playlists/[id]/route.ts`
- **Purpose**: Get, update, or delete a playlist
- **Methods**: `GET`, `DELETE`
- **Key Logic**: Generate presigned URLs for each document
- **Modifying**: Add PATCH for updating playlists, add bulk operations

---

### Screens API
**File**: `app/api/screens/route.ts`
- **Purpose**: List and create screens
- **Methods**: `GET` (list), `POST` (create)
- **Key Logic**:
  - Auto-generate screen names (Screen 01, Screen 02, etc.)
  - Include assigned playlists
- **Modifying**: Add screen groups, location tagging, scheduling

**File**: `app/api/screens/[screenId]/route.ts`
- **Purpose**: Update or delete a specific screen
- **Methods**: `PATCH` (assign playlist), `DELETE`
- **Key Logic**: Link playlist to screen, clear assignment
- **Modifying**: Add status tracking, rotation schedules, permissions

---

## Database & ORM

### Prisma Schema
**File**: `prisma/schema.prisma`
- **Purpose**: Define all database models and relationships
- **Models**:
  - `Session` → groups uploads
  - `Document` → file metadata
  - `Playlist` → ordered collection of documents
  - `PlaylistItem` → join table with order
  - `Screen` → display screen with optional playlist
- **Modifying**:
  - Add new fields: add properties + run migration
  - Add new models: define + test + migrate
  - Change relationships: careful cascading rules

**Commands**:
```bash
npx prisma migrate dev --name <migration_name>  # Create & apply migration
npx prisma migrate deploy                       # Apply existing migrations
npx prisma studio                              # GUI for database
```

---

### Prisma Client Initialization
**File**: `lib/prisma.ts`
- **Purpose**: Singleton Prisma client (prevent connection pool issues in serverless)
- **Usage**: `import { prisma } from '@/lib/prisma'`
- **Don't modify**: Unless changing database driver or adding custom extensions

---

## Storage & Utilities

### S3 Utilities
**File**: `lib/s3.js`
- **Purpose**: AWS S3 operations
- **Functions**:
  - `uploadBuffer(buffer, bucket, key, mimeType)` → Upload file
  - `getPresignedUrl(bucket, key)` → Generate 1-hour signed URL
- **Usage**: `import { uploadBuffer, getPresignedUrl } from '@/lib/s3'`
- **Modifying**: Change presigned URL TTL, add multipart upload, add delete function

---

### General Utilities
**File**: `lib/utils.ts`
- **Purpose**: General helper functions (className merging, etc.)
- **Modifying**: Add domain-specific utilities (formatFileSize, etc.)

---

## UI Components

### Main Dashboard
**File**: `app/(main)/main-screen/page.tsx`
- **Purpose**: Main dashboard component
- **State**:
  - `sessions`, `playlists` (lists)
  - `selectedId`, `detail` (current selection)
  - `activeTab` ('sessions' or 'playlists')
- **Data Fetching**:
  - Initial: GET /api/sessions + /api/playlists
  - On selection: GET /api/sessions/{id} or /api/playlists/{id}
- **Modifying**:
  - Add new tabs or views
  - Change fetch logic
  - Add real-time updates

---

### Session/Playlist Sidebar
**File**: `components/main-screen/SessionSidebar.tsx`
- **Purpose**: Left panel listing sessions and playlists
- **Props**:
  - `sessions`: Session[]
  - `playlists`: Playlist[]
  - `activeTab`: 'sessions' | 'playlists'
  - `selectedId`: string | null
  - `onSelect(id)`: callback
  - `onTabChange(tab)`: callback
- **Modifying**: Change list layout, add search/filter, add bulk operations

---

### Document Grid Panel
**File**: `components/main-screen/FilePanel.tsx`
- **Purpose**: Center panel showing documents in selected session/playlist
- **Props**:
  - `selectedId`: string | null
  - `detail`: SessionDetail | null
  - `loading`: boolean
- **Renders**: Document grid with:
  - MIME-type icons (from `shared.tsx`)
  - File name, size
  - Status badges
  - Drag handles
- **Modifying**: Add thumbnails, search, bulk selection

---

### Screen Management Panel
**File**: `components/main-screen/ScreenPanel.tsx`
- **Purpose**: Right panel for managing screens and assignments
- **Local State**: Fetches screens directly in component
- **Operations**:
  - CREATE screen: POST /api/screens
  - DELETE screen: DELETE /api/screens/{id}
  - ASSIGN playlist: 
    - POST /api/playlists (create)
    - PATCH /api/screens/{id} (assign)
- **Modifying**: Add screen preview, bulk actions, drag-drop ordering

---

### Shared Types & Utils
**File**: `components/main-screen/shared.tsx`
- **Purpose**: Shared types, components, utilities
- **Exports**:
  - `Session`, `SessionDetail`, `Document` types
  - `StatusBadge` component
  - `FileIcon` component (MIME-type aware)
  - Utility functions
- **Modifying**: Add new shared types, update icon set

---

## File Upload Component
**File**: `components/FileUpload.tsx`
- **Purpose**: File drop-zone and upload handler
- **Features**:
  - Drag-drop zone
  - File picker
  - Progress tracking (per file)
  - Toast notifications
  - Type validation
- **API Call**: POST /api/upload
- **Modifying**: Change supported file types, add preview, change UI

---

## Viewer Components

### Document Viewer
**File**: `app/(viewer)/view/[docId]/page.tsx`
- **Purpose**: SSR page for viewing a single document
- **Server Logic**:
  - Fetch document metadata
  - Generate presigned S3 URL
  - Return page with data
- **Client Logic**: Render `UniversalMediaViewer`
- **Modifying**: Add annotations, download tracking, related documents

---

### Universal Media Viewer
**File**: `components/UniversalMediaViewer.tsx`
- **Purpose**: MIME-type-aware renderer
- **Logic**:
  - `video/*` → `<video>` player
  - `image/*` → `<img>` full-screen
  - `application/pdf` → `<iframe>`
  - default → Download link
- **Modifying**: Add custom players (e.g., audio), change fullscreen behavior

---

### Playlist Player
**File**: `app/(viewer)/view/playlist/[playlistId]/PlaylistPlayer.tsx`
- **Purpose**: Play a sequence of documents
- **State**:
  - `currentIndex` (which document)
  - `loopCount`, `loopUnlimited` (from playlist)
- **Controls**:
  - Next/Prev buttons
  - Play/Pause (for videos)
  - Jump to item
- **Modifying**: Add auto-play, timing controls, transitions

**File**: `app/(viewer)/view/playlist/[playlistId]/page.tsx`
- **Purpose**: Page wrapper (SSR)
- **Server Logic**:
  - Fetch playlist
  - Generate presigned URLs for all documents
  - Pass to client component
- **Modifying**: Add caching, permission checks

---

### Screen Player
**File**: `app/(viewer)/view/screen/[screenId]/ScreenPlayer.tsx`
- **Purpose**: Full-screen display mode for digital signage
- **Features**:
  - Displays assigned playlist
  - Auto-loop
  - Hide UI controls
- **Modifying**: Add time display, status info, background, rotation scheduling

**File**: `app/(viewer)/view/screen/[screenId]/page.tsx`
- **Purpose**: Page wrapper
- **Server Logic**: Fetch screen with playlist
- **Modifying**: Add authentication, activity tracking

---

## Layout & Navigation

### Root Layout
**File**: `app/layout.tsx`
- **Purpose**: Wraps entire app
- **Includes**: Fonts, metadata, theme provider
- **Modifying**: Add global providers (auth, analytics)

---

### Main Group Layout
**File**: `app/(main)/layout.tsx`
- **Purpose**: Layout for main routes
- **Includes**: Navbar, Footer
- **Modifying**: Add sidebar, header changes

---

### Navbar
**File**: `components/Navbar.tsx`
- **Purpose**: Top navigation bar
- **Links**: Home, Dashboard, etc.
- **Modifying**: Add user menu, theme toggle, search

---

### Footer
**File**: `components/Footer.tsx`
- **Purpose**: Bottom footer
- **Modifying**: Add links, copyright, version info

---

## Configuration Files

### Environment Variables
**File**: `.env`
```env
DATABASE_URL=postgresql://...
AWS_ACCESS_KEY=...
AWS_SECRET_KEY=...
BUCKET_NAME=...
AWS_REGION=ap-south-1
```
- **Don't commit**: Contains secrets
- **Template**: `.env.example` (if provided)

---

### Next.js Config
**File**: `next.config.ts`
- **Purpose**: Next.js build and runtime configuration
- **Modifying**: Add redirects, rewrites, custom webpack config

---

### Tailwind Config
**File**: `tailwind.config.ts`
- **Purpose**: Tailwind CSS customization
- **Modifying**: Add custom colors, fonts, breakpoints

---

### TypeScript Config
**File**: `tsconfig.json`
- **Purpose**: TypeScript compiler options and path aliases
- **Key Alias**: `@/*` → `./` (import from root)
- **Modifying**: Add new path aliases

---

### Prisma Config
**File**: `prisma.config.ts`
- **Purpose**: Custom Prisma output location
- **Reason**: Generate types to `app/generated/prisma` instead of default
- **Don't modify**: Unless changing code generation

---

### shadcn/ui Config
**File**: `components.json`
- **Purpose**: Configure shadcn/ui component generation
- **Modifying**: Change component output path, add aliases

---

## Build & Deployment

### Dockerfile
**File**: `Dockerfile`
- **Purpose**: Build production-ready Docker image
- **Stages**:
  1. Build Next.js app
  2. Copy to runtime image
  3. Run on port 3000
- **Modifying**: Change Node version, add build steps

---

### Docker Compose
**File**: `docker-compose.yaml`
- **Purpose**: Orchestrate app + database locally
- **Services**: `app` (Next.js), `db` (PostgreSQL)
- **Modifying**: Add services (Redis, etc.), change port mappings

---

### Entrypoint Script
**File**: `entrypoint.sh`
- **Purpose**: Container startup logic
- **Tasks**:
  1. Run database migrations
  2. Start Next.js server
- **Modifying**: Add initialization steps, health checks

---

## Package Management

### Package.json
**File**: `package.json`
- **Key Dependencies**:
  - `next`, `react`, `react-dom`
  - `@prisma/client`, `@prisma/adapter-pg`, `pg`
  - `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
  - `tailwindcss`, `shadcn`, `lucide-react`, `sonner`
- **Scripts**:
  - `npm run dev` → Development server
  - `npm run build` → Production build
  - `npm start` → Run production build
  - `npm run lint` → Run ESLint
  - `postinstall` → Auto-generate Prisma client
- **Modifying**: Add dependencies carefully (test locally first)

---

## Quick Edit Checklist

### To Add a New Field to Documents
1. Edit `prisma/schema.prisma` (Document model)
2. Run `npx prisma migrate dev --name add_field_name`
3. Update `components/main-screen/shared.tsx` (types)
4. Update `components/main-screen/FilePanel.tsx` (display)

### To Add a New API Endpoint
1. Create `app/api/new-route/route.ts`
2. Define `GET`, `POST`, `PATCH`, `DELETE` functions
3. Import `prisma` and/or `uploadBuffer`, `getPresignedUrl`
4. Update frontend component to call it
5. Test locally: `npm run dev`

### To Change S3 Key Structure
1. Edit `app/api/upload/route.ts` (key generation)
2. Update migrations if needed
3. Test S3 uploads locally

### To Add a New Viewer Type
1. Edit `components/UniversalMediaViewer.tsx` (add MIME type case)
2. Add renderer component or native HTML element
3. Test with sample file

### To Modify Dashboard Layout
1. Edit `app/(main)/main-screen/page.tsx` (state, data fetch)
2. Edit component files (Sidebar, FilePanel, ScreenPanel)
3. Update Tailwind classes for responsiveness

---

## File Editing Best Practices

### Do's
- ✅ Test locally before committing
- ✅ Keep API routes focused (one responsibility)
- ✅ Use TypeScript types from Prisma
- ✅ Handle errors gracefully (500s, 404s, validation)
- ✅ Use presigned URLs for S3 access

### Don'ts
- ❌ Don't modify generated Prisma files (app/generated/*)
- ❌ Don't commit `.env` with real credentials
- ❌ Don't hardcode AWS credentials (use .env)
- ❌ Don't fetch entire document contents in lists
- ❌ Don't store sensitive info in browser state

