from typing import Literal
from pydantic import BaseModel


class InfoRequest(BaseModel):
    """Request model for fetching video/playlist info."""
    url: str


class DownloadRequest(BaseModel):
    """Request model for downloading audio."""
    url: str
    bitrate: Literal['128', '192', '256', '320'] = '320'
    video_ids: list[str] | None = None


class VideoInfo(BaseModel):
    """Response model for single video information."""
    type: Literal['video'] = 'video'
    id: str
    title: str
    duration: int
    duration_formatted: str
    thumbnail: str
    channel: str


class PlaylistVideo(BaseModel):
    """Model for a video within a playlist."""
    id: str
    title: str
    duration: int
    duration_formatted: str


class PlaylistInfo(BaseModel):
    """Response model for playlist information."""
    type: Literal['playlist'] = 'playlist'
    id: str
    title: str
    video_count: int
    thumbnail: str
    videos: list[PlaylistVideo]


class DownloadResponse(BaseModel):
    """Response model for download initiation."""
    session_id: str
    is_playlist: bool
