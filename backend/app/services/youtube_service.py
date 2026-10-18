import yt_dlp
import re
from typing import List, Optional, Tuple
from urllib.parse import urlparse, parse_qs
from app.schemas.video import VideoInfo, VideoFormat, AudioFormat, PlaylistInfo
from app.core.exceptions import VideoNotFoundError, InvalidURLError
from app.core.rate_limit import youtube_limiter
from app.core.ytdlp import ytdlp_network_opts
import asyncio

_ID = re.compile(r'^[\w-]{11}$')
_YT_HOSTS = {'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
             'youtube-nocookie.com', 'www.youtube-nocookie.com'}


def parse_youtube_url(url: str) -> Tuple[Optional[str], Optional[str]]:
    """Return (video_id, list_id) for a YouTube URL; None for whatever is absent."""
    u = urlparse(url.strip())
    qs = parse_qs(u.query)
    parts = [p for p in u.path.split('/') if p]
    video_id = None
    if u.hostname == 'youtu.be':
        video_id = parts[0] if parts else None
    elif u.hostname in _YT_HOSTS:
        if u.path == '/watch':
            video_id = (qs.get('v') or [None])[0]
        elif len(parts) == 2 and parts[0] in ('embed', 'v', 'shorts', 'live'):
            video_id = parts[1]
    else:
        return None, None
    if video_id and not _ID.match(video_id):
        video_id = None
    list_id = (qs.get('list') or [None])[0]
    return video_id, list_id


class YouTubeService:
    def __init__(self):
        self.ydl_opts_info = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'skip_download': True,
            'socket_timeout': 20,
            'retries': 3,
            'ignoreerrors': False,
            **ytdlp_network_opts(),
            'noplaylist': True,  # watch?v=X&list=Y means video X; playlists go through get_playlist_info
        }

    def _validate_youtube_url(self, url: str) -> bool:
        """Validate if URL is a YouTube video or playlist URL"""
        return any(parse_youtube_url(url))

    def _playlist_url(self, url: str) -> str:
        """Canonical playlist URL for any URL carrying a list id"""
        _, list_id = parse_youtube_url(url)
        if not list_id:
            raise InvalidURLError(f"Invalid YouTube playlist URL: {url}")
        return f"https://www.youtube.com/playlist?list={list_id}"

    async def get_video_info(self, url: str) -> VideoInfo:
        """Extract video information and available formats"""
        if not parse_youtube_url(url)[0]:
            raise InvalidURLError(f"Invalid YouTube URL: {url}")

        try:
            # Run yt-dlp in thread pool to avoid blocking with timeout
            loop = asyncio.get_event_loop()
            # Set a 50 second timeout for extraction
            info = await asyncio.wait_for(
                loop.run_in_executor(
                    None, self._extract_video_info, url
                ),
                timeout=50.0
            )

            return self._parse_video_info(info)
        except asyncio.TimeoutError:
            raise VideoNotFoundError(f"Timeout: Video extraction took too long. Please try again.")
        except Exception as e:
            if "Video unavailable" in str(e) or "Private video" in str(e):
                raise VideoNotFoundError(f"Video not found or unavailable: {url}")
            raise VideoNotFoundError(f"Failed to extract video info: {str(e)}")

    def _extract_video_info(self, url: str) -> dict:
        """Extract video info using yt-dlp"""
        youtube_limiter.wait()
        with yt_dlp.YoutubeDL(self.ydl_opts_info) as ydl:
            return ydl.extract_info(url, download=False)

    def _parse_video_info(self, info: dict) -> VideoInfo:
        """Parse yt-dlp info into VideoInfo schema"""
        # Extract video formats
        video_formats = []
        audio_formats = []

        # Best first: highest resolution, then highest bitrate (so the UI's first pick is the best)
        formats = sorted(info.get('formats', []), key=lambda f: (f.get('height') or 0, f.get('tbr') or 0), reverse=True)
        for fmt in formats:
            if fmt.get('vcodec') != 'none' and fmt.get('acodec') == 'none':
                # Video-only format
                video_formats.append(VideoFormat(
                    format_id=fmt['format_id'],
                    resolution=fmt.get('resolution', 'unknown'),
                    fps=fmt.get('fps', 0),
                    filesize=fmt.get('filesize'),
                    vcodec=fmt.get('vcodec', 'unknown'),
                    ext=fmt.get('ext', 'mp4')
                ))
            elif fmt.get('acodec') != 'none' and fmt.get('vcodec') == 'none':
                # Audio-only format
                audio_formats.append(AudioFormat(
                    format_id=fmt['format_id'],
                    bitrate=float(fmt.get('abr', 0) or 0),  # Ensure it's a float
                    filesize=fmt.get('filesize'),
                    acodec=fmt.get('acodec', 'unknown'),
                    ext=fmt.get('ext', 'm4a')
                ))

        # Sort formats by quality
        audio_formats.sort(key=lambda x: x.bitrate, reverse=True)

        return VideoInfo(
            video_id=info.get('id', ''),
            title=info.get('title', 'Unknown'),
            duration=info.get('duration', 0),
            thumbnail=info.get('thumbnail', ''),
            channel=info.get('uploader') or info.get('channel') or None,
            upload_date=info.get('upload_date') or None,
            description=info.get('description'),
            view_count=info.get('view_count'),
            available_video_formats=video_formats,
            available_audio_formats=audio_formats
        )

    async def get_playlist_info(self, url: str) -> PlaylistInfo:
        """Extract playlist information and video list"""
        url = self._playlist_url(url)

        try:
            loop = asyncio.get_event_loop()
            info = await loop.run_in_executor(
                None, self._extract_playlist_info, url
            )

            return self._parse_playlist_info(info)
        except Exception as e:
            raise VideoNotFoundError(f"Failed to extract playlist info: {str(e)}")

    def _extract_playlist_info(self, url: str) -> dict:
        """Extract playlist info using yt-dlp"""
        youtube_limiter.wait()
        opts = {
            **self.ydl_opts_info,
            'extract_flat': True,
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            return ydl.extract_info(url, download=False)

    def _parse_playlist_info(self, info: dict) -> PlaylistInfo:
        """Build the playlist list from flat entries; formats are fetched per video on selection"""
        videos = []
        for e in info.get('entries') or []:
            if not e or not e.get('id') or (e.get('title') or '').startswith('['):
                continue  # skips private/deleted placeholders like "[Private video]"
            thumbs = e.get('thumbnails') or []
            videos.append(VideoInfo(
                video_id=e['id'],
                title=e.get('title') or 'Unknown',
                duration=int(e.get('duration') or 0),
                thumbnail=thumbs[-1]['url'] if thumbs else f"https://i.ytimg.com/vi/{e['id']}/hqdefault.jpg",
                channel=e.get('channel') or e.get('uploader'),
            ))

        return PlaylistInfo(
            playlist_id=info.get('id', ''),
            title=info.get('title', 'Unknown Playlist'),
            video_count=len(videos),
            videos=videos
        )

    async def get_available_formats(self, url: str) -> tuple[List[VideoFormat], List[AudioFormat]]:
        """Get only the available formats for a video"""
        video_info = await self.get_video_info(url)
        return video_info.available_video_formats, video_info.available_audio_formats