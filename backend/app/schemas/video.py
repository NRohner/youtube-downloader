from typing import List, Optional
from pydantic import HttpUrl
from .base import CamelModel


class VideoFormat(CamelModel):
    format_id: str
    resolution: str
    fps: int
    filesize: Optional[int] = None
    vcodec: str
    ext: str


class AudioFormat(CamelModel):
    format_id: str
    bitrate: float  # Changed to float as yt-dlp can return fractional bitrates
    filesize: Optional[int] = None
    acodec: str
    ext: str


class VideoInfo(CamelModel):
    video_id: str
    title: str
    duration: int  # seconds
    thumbnail: str
    channel: Optional[str] = None
    upload_date: Optional[str] = None
    description: Optional[str] = None
    view_count: Optional[int] = None
    available_video_formats: List[VideoFormat] = []
    available_audio_formats: List[AudioFormat] = []


class PlaylistInfo(CamelModel):
    playlist_id: str
    title: str
    video_count: int
    videos: List[VideoInfo]


class VideoInfoRequest(CamelModel):
    url: HttpUrl


class PlaylistInfoRequest(CamelModel):
    url: HttpUrl