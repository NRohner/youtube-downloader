from functools import lru_cache
from app.services.youtube_service import YouTubeService
from app.services.download_service import DownloadService
from app.services.queue_service import queue_service


def get_youtube_service() -> YouTubeService:
    """Dependency to get YouTube service instance"""
    return YouTubeService()


@lru_cache
def get_download_service() -> DownloadService:
    """Dependency to get the shared download service (so the concurrency limit is global)"""
    return DownloadService()


def get_queue_service():
    """Dependency to get queue service instance"""
    return queue_service