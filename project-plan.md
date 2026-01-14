# YouTube Audio Extractor
## Comprehensive Project Plan

---

## 1. Project Overview

A local web application for extracting and downloading audio from YouTube videos and playlists. The application features a modern React frontend with a FastAPI backend, supporting audio quality up to 320kbps with real-time progress tracking. Designed to handle videos of any length, including 3+ hour content.

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool & dev server |
| Tailwind CSS | 3.x | Utility-first styling |
| shadcn/ui | latest | Pre-built accessible components |
| Framer Motion | 10.x | Animations & transitions |
| Axios | 1.x | HTTP client |
| React Query | 5.x | Server state management |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Runtime |
| FastAPI | 0.100+ | API framework |
| yt-dlp | latest | YouTube downloading |
| FFmpeg | 6.x | Audio encoding |
| Uvicorn | 0.23+ | ASGI server |
| Pydantic | 2.x | Data validation |

---

## 3. Project Structure

```
youtube-audio-extractor/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn components
│   │   │   ├── UrlInput.tsx
│   │   │   ├── VideoPreview.tsx
│   │   │   ├── PlaylistPreview.tsx
│   │   │   ├── BitrateSelector.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── DownloadQueue.tsx
│   │   │   └── DownloadComplete.tsx
│   │   ├── hooks/
│   │   │   ├── useVideoInfo.ts
│   │   │   ├── useDownload.ts
│   │   │   └── useProgress.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── lib/
│   │   │   └── utils.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app entry
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── videos.py              # Single video endpoints
│   │   │   └── playlists.py           # Playlist endpoints
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── youtube.py             # yt-dlp wrapper
│   │   │   └── download_manager.py    # Download queue management
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py             # Pydantic models
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── helpers.py
│   ├── downloads/                     # Output directory
│   ├── requirements.txt
│   └── README.md
│
├── docker-compose.yml                 # Optional containerization
└── README.md
```

---

## 4. Feature Requirements

### 4.1 Single Video Download
- URL input with validation
- Fetch and display video metadata (title, thumbnail, duration, channel)
- Bitrate selection (128, 192, 256, 320 kbps)
- Animated progress bar with percentage, speed, and ETA
- Download button for completed MP3

### 4.2 Playlist Download
- Automatic playlist detection from URL
- Display playlist metadata (title, total videos, total duration)
- Scrollable list preview of all videos
- "Select All" / "Deselect All" functionality
- Individual video selection via checkboxes
- Sequential download with queue visualization
- Per-video progress tracking
- Overall playlist progress (e.g., "5 of 23 complete")
- Batch download as ZIP option
- Individual download links for each completed file
- Summary report (successful, failed, skipped)

### 4.3 Long Video Support (3+ hours)
- Extended socket timeouts
- Chunked/segmented downloading
- Automatic retry on failure (up to 10 attempts)
- Memory-efficient streaming
- "Processing" state during FFmpeg conversion

### 4.4 User Experience
- Responsive design (mobile-friendly)
- Dark/light mode toggle
- Smooth animations for state transitions
- Toast notifications for errors/completion
- Drag-and-drop URL support
- Clipboard paste detection
- Download history (session-based)

---

## 5. API Specification

### 5.1 Endpoints

```
GET  /api/health
     Health check endpoint

POST /api/info
     Body: { url: string }
     Returns: VideoInfo | PlaylistInfo
     Fetches metadata for video or playlist

POST /api/download
     Body: { url: string, bitrate: string, video_ids?: string[] }
     Returns: { session_id: string, is_playlist: boolean }
     Initiates download process

GET  /api/progress/{session_id}
     Returns: Server-Sent Events stream
     Real-time progress updates

GET  /api/download/{session_id}/{filename}
     Returns: MP3 file
     Serves completed audio file

GET  /api/download/{session_id}/zip
     Returns: ZIP file
     Serves all playlist files as ZIP

DELETE /api/session/{session_id}
       Cleans up session files
```

### 5.2 Data Models

```typescript
// Frontend Types (types/index.ts)

interface VideoInfo {
  type: 'video';
  id: string;
  title: string;
  duration: number;
  durationFormatted: string;
  thumbnail: string;
  channel: string;
}

interface PlaylistInfo {
  type: 'playlist';
  id: string;
  title: string;
  videoCount: number;
  thumbnail: string;
  videos: PlaylistVideo[];
}

interface PlaylistVideo {
  id: string;
  title: string;
  duration: number;
  durationFormatted: string;
  selected: boolean;
}

interface DownloadProgress {
  status: 'starting' | 'downloading' | 'processing' | 'complete' | 'error';
  percent: number;
  speed?: string;
  eta?: string;
  currentVideo?: number;
  totalVideos?: number;
  currentTitle?: string;
  filename?: string;
  files?: CompletedFile[];
  error?: string;
}

interface CompletedFile {
  title: string;
  filename?: string;
  error?: string;
}

type Bitrate = '128' | '192' | '256' | '320';
```

```python
# Backend Models (models/schemas.py)

class InfoRequest(BaseModel):
    url: str

class DownloadRequest(BaseModel):
    url: str
    bitrate: Literal['128', '192', '256', '320'] = '320'
    video_ids: list[str] | None = None

class VideoInfo(BaseModel):
    type: Literal['video'] = 'video'
    id: str
    title: str
    duration: int
    duration_formatted: str
    thumbnail: str
    channel: str

class PlaylistVideo(BaseModel):
    id: str
    title: str
    duration: int
    duration_formatted: str

class PlaylistInfo(BaseModel):
    type: Literal['playlist'] = 'playlist'
    id: str
    title: str
    video_count: int
    thumbnail: str
    videos: list[PlaylistVideo]

class DownloadResponse(BaseModel):
    session_id: str
    is_playlist: bool
```

---

## 6. Implementation Phases

### Phase 1: Project Setup (Day 1-2)

**Backend Tasks:**
- [ ] Initialize Python project with virtual environment
- [ ] Install dependencies (FastAPI, yt-dlp, uvicorn, etc.)
- [ ] Verify FFmpeg installation
- [ ] Create project structure
- [ ] Set up FastAPI app with CORS middleware
- [ ] Implement health check endpoint
- [ ] Create Pydantic models

**Frontend Tasks:**
- [ ] Initialize Vite + React + TypeScript project
- [ ] Install dependencies (Tailwind, Framer Motion, Axios, React Query)
- [ ] Configure Tailwind CSS
- [ ] Install and configure shadcn/ui
- [ ] Set up project structure
- [ ] Create TypeScript interfaces
- [ ] Configure API service with Axios

**Deliverables:**
- Running backend server on port 8000
- Running frontend dev server on port 5173
- Basic "Hello World" connection between frontend and backend

---

### Phase 2: Core Backend Logic (Day 3-5)

**YouTube Service (services/youtube.py):**
- [ ] URL validation (video vs playlist detection)
- [ ] Video metadata fetching
- [ ] Playlist metadata fetching
- [ ] Audio download with progress hooks
- [ ] FFmpeg post-processing configuration
- [ ] Long video optimizations (timeouts, retries, chunking)

**Download Manager (services/download_manager.py):**
- [ ] Session management (create, track, cleanup)
- [ ] Thread-safe progress storage
- [ ] Background download workers
- [ ] Playlist queue processing
- [ ] ZIP file generation for playlists

**API Routes:**
- [ ] POST /api/info - fetch video/playlist metadata
- [ ] POST /api/download - initiate download
- [ ] GET /api/progress/{session_id} - SSE progress stream
- [ ] GET /api/download/{session_id}/{filename} - file serving
- [ ] GET /api/download/{session_id}/zip - ZIP serving

**Deliverables:**
- Fully functional API (testable via Swagger UI at /docs)
- Successful download of single video via API
- Successful download of playlist via API

---

### Phase 3: Frontend Components (Day 6-9)

**Core Components:**

1. **UrlInput.tsx**
   - [ ] Text input with paste button
   - [ ] URL validation feedback
   - [ ] Loading state during fetch
   - [ ] Framer Motion focus animations

2. **VideoPreview.tsx**
   - [ ] Thumbnail display
   - [ ] Title, channel, duration
   - [ ] Fade-in animation on load

3. **PlaylistPreview.tsx**
   - [ ] Playlist header (title, count)
   - [ ] Scrollable video list with virtualization
   - [ ] Checkbox selection per video
   - [ ] Select All / Deselect All buttons
   - [ ] Total selected count display

4. **BitrateSelector.tsx**
   - [ ] Radio group or dropdown
   - [ ] Visual indicator of quality/file size tradeoff

5. **ProgressBar.tsx**
   - [ ] Animated progress fill
   - [ ] Percentage, speed, ETA display
   - [ ] Pulsing animation during processing
   - [ ] Color transitions based on state

6. **DownloadQueue.tsx**
   - [ ] List of videos being processed
   - [ ] Current video highlight
   - [ ] Completed checkmarks
   - [ ] Error indicators
   - [ ] Staggered list animations

7. **DownloadComplete.tsx**
   - [ ] Success animation (confetti optional)
   - [ ] Download button(s)
   - [ ] "Download All as ZIP" for playlists
   - [ ] Summary statistics

**Custom Hooks:**
- [ ] useVideoInfo - React Query wrapper for /api/info
- [ ] useDownload - mutation for /api/download
- [ ] useProgress - SSE connection management

**Deliverables:**
- All components built and styled
- Components responding to mock data
- Smooth animations throughout

---

### Phase 4: Integration & State Management (Day 10-12)

**Integration Tasks:**
- [ ] Connect UrlInput to useVideoInfo hook
- [ ] Wire up download button to useDownload mutation
- [ ] Implement SSE progress subscription
- [ ] Handle all loading/error/success states
- [ ] Implement toast notifications

**State Flow:**
```
URL Input → Fetch Info → Display Preview → Select Options 
    → Start Download → Show Progress → Complete → Download Files
```

**Edge Cases:**
- [ ] Invalid URL handling
- [ ] Network error recovery
- [ ] Empty playlist handling
- [ ] Private/age-restricted video handling
- [ ] Download cancellation (stretch goal)

**Deliverables:**
- Fully functional single video download flow
- Fully functional playlist download flow
- Error handling for all failure modes

---

### Phase 5: Polish & Optimization (Day 13-15)

**UI/UX Polish:**
- [ ] Dark/light mode implementation
- [ ] Responsive design testing
- [ ] Loading skeletons
- [ ] Micro-interactions refinement
- [ ] Accessibility audit (keyboard nav, screen readers)

**Performance:**
- [ ] Frontend bundle optimization
- [ ] API response caching
- [ ] Lazy loading for playlist videos
- [ ] Memory usage optimization for long playlists

**Backend Cleanup:**
- [ ] Automatic file cleanup (files older than 1 hour)
- [ ] Session expiration
- [ ] Logging implementation
- [ ] Error handling standardization

**Documentation:**
- [ ] README with setup instructions
- [ ] API documentation
- [ ] Environment variable documentation

**Deliverables:**
- Production-ready application
- Complete documentation
- Optimized performance

---

## 7. UI/UX Design Specifications

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  🎵 YouTube Audio Extractor            [🌙/☀️ Toggle]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔗 Paste YouTube URL...              [Fetch]    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ┌──────┐                                        │   │
│  │ │ IMG  │  Video/Playlist Title                  │   │
│  │ │      │  Channel • Duration                    │   │
│  │ └──────┘                                        │   │
│  │                                                 │   │
│  │  [For Playlists: Scrollable video list]        │   │
│  │  ☑ Video 1                          3:45       │   │
│  │  ☑ Video 2                          5:12       │   │
│  │  ☐ Video 3                          2:30       │   │
│  │                                                 │   │
│  │  Bitrate: [128] [192] [256] [●320]             │   │
│  │                                                 │   │
│  │           [ 🎵 Download Audio ]                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Downloading: "Video Title"                     │   │
│  │  ████████████████░░░░░░░░  67%  2.3 MB/s  ETA 45s │
│  │                                                 │   │
│  │  Progress: 3 of 12 videos complete              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Color Palette (Dark Mode)
- Background: slate-900 (#0f172a)
- Card: slate-800 (#1e293b)
- Primary: rose-500 (#f43f5e)
- Success: emerald-500 (#10b981)
- Text: slate-100 (#f1f5f9)
- Muted: slate-400 (#94a3b8)

### Animations (Framer Motion)
- Page load: Fade in + slight upward motion
- Card appearance: Scale from 0.95 + fade
- Progress bar: Spring animation on value change
- List items: Staggered fade-in
- Buttons: Scale on hover (1.02), tap (0.98)
- Success state: Checkmark draw animation

---

## 8. Testing Strategy

### Backend Testing
- Unit tests for URL validation
- Unit tests for duration formatting
- Integration tests for yt-dlp wrapper
- API endpoint tests with pytest

### Frontend Testing
- Component unit tests with Vitest
- Hook testing with React Testing Library
- E2E tests with Playwright (stretch goal)

### Manual Testing Checklist
- [ ] Short video (<5 min)
- [ ] Medium video (30-60 min)
- [ ] Long video (3+ hours)
- [ ] Small playlist (5-10 videos)
- [ ] Large playlist (50+ videos)
- [ ] Invalid URL handling
- [ ] Network interruption recovery
- [ ] Mobile responsiveness

---

## 9. Potential Challenges & Mitigations

| Challenge | Risk | Mitigation |
|-----------|------|------------|
| yt-dlp rate limiting | Medium | Implement delays, retry logic |
| Long video memory usage | Medium | Stream processing, chunked downloads |
| FFmpeg processing time | Low | Show "processing" state, async handling |
| Playlist with 100+ videos | Medium | Pagination, virtualized lists |
| CORS issues | Low | Proper FastAPI CORS configuration |
| SSE connection drops | Medium | Auto-reconnect logic in frontend |

---

## 10. Future Enhancements (Post-MVP)

- [ ] Download queue persistence across page refreshes
- [ ] Audio format options (MP3, AAC, FLAC, WAV)
- [ ] Video download option
- [ ] Batch URL input (multiple videos at once)
- [ ] Download scheduling
- [ ] Browser extension for one-click downloads
- [ ] Docker containerization
- [ ] Cloud deployment option

---

## 11. Dependencies & Requirements

### System Requirements
- Python 3.11+
- Node.js 18+
- FFmpeg 6.x installed and in PATH

### Backend Dependencies (requirements.txt)
```
fastapi>=0.100.0
uvicorn[standard]>=0.23.0
yt-dlp>=2023.10.0
pydantic>=2.0.0
sse-starlette>=1.6.0
python-multipart>=0.0.6
aiofiles>=23.0.0
```

### Frontend Dependencies (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.5.0",
    "framer-motion": "^10.16.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^1.14.0",
    "lucide-react": "^0.290.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 12. Getting Started Commands

```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend setup
cd frontend
npm install
npx shadcn-ui@latest init
npm run dev

# Verify FFmpeg
ffmpeg -version
```

---

## Timeline Summary

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 1: Setup | 2 days | Project scaffolding complete |
| Phase 2: Backend | 3 days | API fully functional |
| Phase 3: Frontend | 4 days | All components built |
| Phase 4: Integration | 3 days | End-to-end flow working |
| Phase 5: Polish | 3 days | Production ready |
| **Total** | **15 days** | **MVP Complete** |
