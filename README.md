# YouTube Downloader Web Application

A full-stack web application for downloading YouTube videos and audio at original quality, featuring support for long-form content and batch downloads.

## Features

- **High-quality downloads**: video up to the highest resolution available, listed best first and selected by default
- **Audio extraction**: MP3 from any video
- **Embedded subtitles**: uploaded English subtitles are embedded in MP4 downloads automatically when the video has them
- **Playlists**: load a playlist, pick single videos, or "Download all" at a quality preset (best up to 1080p, 720p, 480p, or MP3)
- **Queue controls**: real-time progress, cancel (stops the download and removes partial files), Cancel All, and Pause/Resume Queue
- **Cleanup**: removing a finished download deletes its file and record; old files are also removed automatically
- **Request rate limiting**: every YouTube request is spaced out to avoid bot detection
- **Docker ready**: runs with Docker Compose (tested on OrbStack)

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **yt-dlp**: Advanced YouTube downloader
- **Redis**: Queue management and caching
- **Pydantic**: Data validation and settings management

### Frontend
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **React Query**: Data fetching and caching

## Quick Start

### Option 1: Docker Compose / OrbStack (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd youtube-downloader
```

2. Start the application (on macOS, start [OrbStack](https://orbstack.dev) first with `orb start`; its `docker` CLI and `docker compose` are used as-is):
```bash
docker compose up --build
```

3. Open your browser to `http://localhost:3000` (the API is at `http://localhost:8000`)

Re-run `docker compose up -d --build` after changing code.

#### IPv6 requirement

YouTube rate-limits many IPv4 addresses (`HTTP 429`, "Sign in to confirm you're not a bot"). The backend therefore talks to YouTube over **IPv6 only** (`source_address: '::'` in yt-dlp, and `enable_ipv6: true` on the Compose network). Your network needs working IPv6; check with `curl -6 https://api6.ipify.org`. If you have no IPv6, remove the two `source_address` lines in `backend/app/services/youtube_service.py` and `download_service.py`.

### Option 2: Development Setup

#### Prerequisites
- Python 3.11+
- Node.js 18+
- Redis server
- FFmpeg

Note: the backend forces IPv6 for YouTube requests (see above), so IPv6 is needed here too.

#### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start Redis (if not using Docker):
```bash
redis-server
```

5. Run the backend:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

## Usage

1. **Enter a YouTube URL**: a video, or any URL carrying a playlist (`playlist?list=...` or `watch?v=...&list=...`)
2. **Single video**: pick a format (best is preselected; entries with the same resolution differ by codec, and H.264 MP4 is the most compatible) and click Start Download
3. **Playlist**: the whole playlist is listed. Click **Select** on a video to download it individually, or choose a quality and click **Download all** (you are asked to confirm the count). Videos download one at a time.
4. **Queue**: watch progress, **Pause Queue** (the current download finishes, nothing new starts), **Cancel All**, or use the X on a row (cancels a running download, deletes a finished one's file)
5. **Get the files**: use the download button on a completed row. Files live in the `downloads` Docker volume and are deleted after `MAX_FILE_AGE_HOURS`.

## API Documentation

When running the backend, visit `http://localhost:8000/docs` for interactive API documentation.

### Key Endpoints

- `POST /api/v1/video/info` - Get video metadata and formats
- `POST /api/v1/playlist/info` - List a playlist's videos
- `POST /api/v1/playlist/download` - Queue a whole playlist at a quality preset (`best`, `720p`, `480p`, `audio`)
- `POST /api/v1/download/start` - Start a download task
- `GET /api/v1/download/status/{task_id}` - Check download progress
- `GET /api/v1/download/file/{task_id}` - Download completed file
- `DELETE /api/v1/download/{task_id}` - Cancel a download (aborts it if running)
- `DELETE /api/v1/download/{task_id}/remove` - Delete a finished task's file and record
- `GET /api/v1/queue/status` - Get queue status
- `POST /api/v1/queue/cancel-all` - Cancel every pending and running download
- `POST /api/v1/queue/pause`, `POST /api/v1/queue/resume`, `GET /api/v1/queue/state` - Pause or resume starting new downloads

JSON uses camelCase (e.g. `videoId`, `formatId`); snake_case is also accepted in requests.

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Backend
REDIS_URL=redis://localhost:6379/0
DOWNLOAD_DIR=./downloads
MAX_CONCURRENT_DOWNLOADS=3
MAX_FILE_AGE_HOURS=12
YOUTUBE_MIN_INTERVAL=3
DEBUG=false

# Frontend
VITE_API_URL=http://localhost:8000/api/v1
```

### Download Settings

- **MAX_CONCURRENT_DOWNLOADS**: Maximum simultaneous downloads (default: 3)
- **MAX_FILE_AGE_HOURS**: Auto-cleanup completed downloads after hours (default: 12)
- **YOUTUBE_MIN_INTERVAL**: Minimum seconds between YouTube requests, shared by info lookups and downloads (default: 3)
- **DOWNLOAD_DIR**: Directory to store downloaded files

## Architecture

### Backend Components

- **YouTube Service**: Handles video metadata extraction using yt-dlp
- **Download Service**: Manages chunked downloading with retry logic
- **Queue Service**: Redis-based task queue for download management
- **API Routes**: RESTful endpoints for frontend communication

### Frontend Components

- **URL Input**: YouTube URL validation and submission
- **Video Preview**: Displays video metadata and thumbnail
- **Format Selector**: Quality and format selection interface
- **Download Queue**: Real-time progress tracking and file management

## Performance Optimizations

### For Long Videos
- Chunked downloading (8MB chunks)
- Fragment retry logic
- Resume capability for interrupted downloads
- Stream copying without re-encoding

### Frontend
- Real-time progress polling
- Efficient state management
- Optimistic UI updates
- Lazy loading for components

## Troubleshooting

### Common Issues

1. **"This video is not available" or "Sign in to confirm you're not a bot"**
   - Often YouTube rate-limiting your IPv4 address rather than a missing video. Test with `yt-dlp -4 -F <url>` on the host: if that fails with `429` but `-6` works, make sure IPv6 works inside the containers (see IPv6 requirement)
   - Otherwise the video may be private, geo-blocked, or removed

2. **Download fails with network error**
   - Check internet connection
   - Restart the backend service
   - Clear Redis cache: `docker compose exec redis redis-cli FLUSHALL`

3. **Frontend can't connect to backend**
   - Verify backend is running on port 8000
   - Check CORS settings in backend configuration
   - Ensure VITE_API_URL is correctly set

4. **Redis connection errors**
   - Ensure Redis server is running
   - Check REDIS_URL configuration
   - Verify Redis port (6379) is not blocked

### Logs and Debugging

- Backend logs: Check Docker logs or terminal output
- Redis status: `docker compose exec redis redis-cli ping`
- API health: `curl http://localhost:8000/health`

## Development

### Project Structure

```
youtube-downloader/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # API endpoints
│   │   ├── core/                # Configuration, exceptions, YouTube rate limiter
│   │   ├── services/            # Business logic
│   │   ├── schemas/             # Pydantic models
│   │   └── main.py             # FastAPI application
│   ├── tests/                   # pytest tests (run inside the container, see below)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/          # React components (download, playlist, queue)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API client
│   │   ├── store/              # State management
│   │   ├── types/              # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

### Running tests

```bash
docker compose run --rm --no-deps -v "$PWD/backend":/app backend sh -c "pip install -q pytest && python -m pytest -q tests"
```

### Adding Features

1. **New Download Formats**: Extend the format selection in `youtube_service.py`
2. **Auto-generated captions**: set `writeautomaticsub` in `download_service.py`
3. **User Authentication**: Add user accounts and download history

## License

This project is for educational purposes. Respect YouTube's Terms of Service and copyright laws when using this application.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation at `/docs`
3. Open an issue on GitHub

---

Built with FastAPI, React, and yt-dlp