from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import videos_router, playlists_router

app = FastAPI(
    title="YouTube Audio Extractor",
    description="API for extracting and downloading audio from YouTube videos and playlists",
    version="1.0.0"
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(videos_router)
app.include_router(playlists_router)


@app.get("/api/health")
async def health_check():
    """
    Health check endpoint.

    Returns:
        Status indicating the API is running
    """
    return {"status": "healthy", "message": "YouTube Audio Extractor API is running"}


@app.get("/")
async def root():
    """
    Root endpoint with API information.

    Returns:
        Basic API information and available endpoints
    """
    return {
        "name": "YouTube Audio Extractor API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }
