import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API Settings
    api_title: str = "YouTube Downloader API"
    api_version: str = "1.0.0"
    debug: bool = False

    # Download Settings
    download_dir: str = os.path.join(os.getcwd(), "downloads")
    max_concurrent_downloads: int = 3
    download_chunk_size: int = 8 * 1024 * 1024  # 8MB
    http_chunk_size: int = 10 * 1024 * 1024  # 10MB for yt-dlp
    cleanup_interval_hours: int = 24
    max_file_age_hours: int = 12

    # Minimum seconds between YouTube requests (avoids bot detection / 429s)
    youtube_min_interval: float = 3.0

    # Talk to YouTube over IPv6 only (IPv4 is often rate-limited); turn off on a VPN without IPv6.
    # Changed at runtime via PUT /api/v1/settings; this is the startup default.
    force_ipv6: bool = True

    # URL of the bgutil PO token server (e.g. http://bgutil:4416); unset means no token provider
    pot_provider_url: Optional[str] = None

    # Redis Settings
    redis_url: str = "redis://localhost:6379/0"

    # CORS Settings
    allowed_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # File cleanup settings
    auto_cleanup_enabled: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

# Ensure download directory exists
os.makedirs(settings.download_dir, exist_ok=True)