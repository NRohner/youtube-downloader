from typing import Optional, Literal, List
from pydantic import HttpUrl
from datetime import datetime
from .base import CamelModel


class DownloadRequest(CamelModel):
    url: HttpUrl
    format_type: Literal["video", "audio"]
    format_id: str
    output_filename: Optional[str] = None


class DownloadTask(CamelModel):
    task_id: str
    url: str
    format_type: Literal["video", "audio"]
    format_id: str
    status: Literal["pending", "downloading", "processing", "complete", "failed", "cancelled"]
    progress: float = 0.0  # 0-100
    error: Optional[str] = None
    title: str
    output_path: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class DownloadTaskUpdate(CamelModel):
    status: Optional[Literal["pending", "downloading", "processing", "complete", "failed", "cancelled"]] = None
    progress: Optional[float] = None
    error: Optional[str] = None
    output_path: Optional[str] = None
    file_size: Optional[int] = None
    completed_at: Optional[datetime] = None


class PlaylistDownloadRequest(CamelModel):
    playlist_url: HttpUrl
    quality: Literal["best", "2160p", "1080p", "720p", "480p", "audio"]


class BatchDownloadResponse(CamelModel):
    batch_id: str
    task_ids: List[str]
    total_videos: int