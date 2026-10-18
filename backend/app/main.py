from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.routes.download import router as download_router
from app.api.routes.settings import router as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    print("Starting YouTube Downloader API...")

    # Start background cleanup task
    import asyncio
    from app.services.download_service import DownloadService
    download_service = DownloadService()

    async def cleanup_task():
        while True:
            await asyncio.sleep(3600)  # Run every hour
            await download_service.cleanup_old_files()

    # Start cleanup task in background
    asyncio.create_task(cleanup_task())

    yield

    # Shutdown
    print("Shutting down YouTube Downloader API...")


# Create FastAPI app
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    debug=settings.debug,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(download_router)
app.include_router(settings_router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "YouTube Downloader API",
        "version": settings.api_version,
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}