# YouTube Audio Extractor

A local web application for extracting and downloading audio from YouTube videos and playlists. Features a modern React frontend with a FastAPI backend, supporting audio quality up to 320kbps with real-time progress tracking.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)

## Features

- **Single Video Download** - Extract audio from any YouTube video
- **Playlist Support** - Download entire playlists with selective video picking
- **Quality Options** - Choose bitrate: 128, 192, 256, or 320 kbps
- **Real-time Progress** - Live progress tracking with speed and ETA
- **Long Video Support** - Handles 3+ hour videos with retry logic
- **Modern UI** - Dark/light mode, smooth animations, responsive design
- **Batch Download** - Download playlist as ZIP file

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Python | 3.11+ | `python3 --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| FFmpeg | 6.x | `ffmpeg -version` |

### Installing Prerequisites

#### macOS (using Homebrew)

```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python
brew install python@3.11

# Install Node.js
brew install node

# Install FFmpeg (required for audio conversion)
brew install ffmpeg
```

#### Ubuntu/Debian

```bash
# Update package list
sudo apt update

# Install Python
sudo apt install python3.11 python3.11-venv python3-pip

# Install Node.js (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Install FFmpeg
sudo apt install ffmpeg
```

#### Windows

1. **Python**: Download from [python.org](https://www.python.org/downloads/) (check "Add to PATH")
2. **Node.js**: Download from [nodejs.org](https://nodejs.org/)
3. **FFmpeg**: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd youtube-downloader
```

### 2. Run Setup

The setup script will create a Python virtual environment, install all dependencies, and configure the project:

```bash
./setup.sh
```

### 3. Start the Application

```bash
./start.sh
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Manual Setup

If you prefer to set up manually or the scripts don't work on your system:

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
# Navigate to frontend directory (in a new terminal)
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Project Structure

```
youtube-downloader/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── models/
│   │   │   └── schemas.py       # Pydantic data models
│   │   ├── routers/
│   │   │   ├── videos.py        # Single video endpoints
│   │   │   └── playlists.py     # Playlist endpoints
│   │   ├── services/
│   │   │   ├── youtube.py       # yt-dlp wrapper
│   │   │   └── download_manager.py
│   │   └── utils/
│   │       └── helpers.py       # Utility functions
│   ├── downloads/               # Downloaded files (auto-cleaned)
│   ├── venv/                    # Python virtual environment
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/
│   │   │   └── api.ts           # API client
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript interfaces
│   │   ├── lib/
│   │   │   └── utils.ts         # Utility functions
│   │   ├── App.tsx              # Main application component
│   │   └── main.tsx             # Application entry point
│   ├── package.json
│   └── vite.config.ts
│
├── setup.sh                     # One-command setup script
├── start.sh                     # Start both servers
├── project-plan.md              # Detailed project plan
└── README.md                    # This file
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/info` | Fetch video/playlist metadata |
| POST | `/api/download` | Start download process |
| GET | `/api/progress/{session_id}` | SSE progress stream |
| GET | `/api/download/{session_id}/{filename}` | Download completed file |
| GET | `/api/download/{session_id}/zip` | Download playlist as ZIP |
| DELETE | `/api/session/{session_id}` | Clean up session |

### Example: Fetch Video Info

```bash
curl -X POST http://localhost:8000/api/info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_PORT` | 8000 | Backend server port |
| `FRONTEND_PORT` | 5173 | Frontend dev server port |
| `DOWNLOAD_DIR` | `backend/downloads` | Where files are saved |
| `MAX_FILE_AGE` | 3600 | Auto-cleanup time (seconds) |

### Bitrate Options

| Bitrate | Quality | File Size (approx.) |
|---------|---------|---------------------|
| 128 kbps | Good | ~1 MB/min |
| 192 kbps | Better | ~1.5 MB/min |
| 256 kbps | Great | ~2 MB/min |
| 320 kbps | Best | ~2.5 MB/min |

## Troubleshooting

### Common Issues

#### "FFmpeg not found"

FFmpeg is required for audio conversion. Install it using your package manager:
- macOS: `brew install ffmpeg`
- Ubuntu: `sudo apt install ffmpeg`
- Windows: Download from ffmpeg.org and add to PATH

#### "Port already in use"

If port 8000 or 5173 is in use:
```bash
# Find process using port 8000
lsof -i :8000
# Kill the process
kill -9 <PID>
```

Or change the port:
```bash
# Backend
uvicorn app.main:app --reload --port 8001

# Frontend (in vite.config.ts)
server: { port: 5174 }
```

#### "Module not found" errors (Python)

Ensure you've activated the virtual environment:
```bash
cd backend
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows
```

#### "CORS errors" in browser

The backend is configured to allow all origins in development. If you still see CORS errors, check that:
1. Backend is running on port 8000
2. Frontend proxy is configured in `vite.config.ts`

#### "Download failed" or "Video unavailable"

Some videos may be:
- Age-restricted (requires authentication)
- Region-locked
- Private or deleted
- Live streams (not supported)

### Logs

Backend logs appear in the terminal where you ran `uvicorn`. For more verbose logging:
```bash
uvicorn app.main:app --reload --log-level debug
```

## Development

### Running Tests

```bash
# Backend tests
cd backend
source venv/bin/activate
pytest

# Frontend tests
cd frontend
npm test
```

### Code Formatting

```bash
# Backend (Python)
pip install black
black app/

# Frontend (TypeScript)
npm run lint
```

## Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Framer Motion** - Animations
- **React Query** - Server state
- **Axios** - HTTP client

### Backend
- **FastAPI** - API framework
- **Python 3.11+** - Runtime
- **yt-dlp** - YouTube downloading
- **FFmpeg** - Audio encoding
- **Pydantic** - Validation
- **SSE-Starlette** - Server-sent events

## Legal Disclaimer

This tool is for personal use only. Respect YouTube's Terms of Service and copyright laws. Only download content you have the right to download. The developers are not responsible for misuse of this tool.

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube downloading
- [FFmpeg](https://ffmpeg.org/) - Audio processing
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Lucide](https://lucide.dev/) - Icons
