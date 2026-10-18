import os
import re
import asyncio
import yt_dlp
import aiofiles
from typing import Callable, Optional
from datetime import datetime
from app.core.config import settings
from app.core.exceptions import DownloadError
from app.core.rate_limit import youtube_limiter
from app.schemas.download import DownloadTask
import uuid


# Quality presets for playlist downloads: format ids differ per video, so these are selectors
PRESET_FORMATS = {
    "best": "bv*+ba/b",
    "720p": "bv*[height<=720]+ba/b[height<=720]/b",
    "480p": "bv*[height<=480]+ba/b[height<=480]/b",
    "audio": "bestaudio/best",
}

# "best" ranks by resolution, fps, then bitrate. yt-dlp's default ranks codec above bitrate,
# so it can pick a lower-bitrate AV1/VP9 stream over a higher-bitrate one at the same resolution
PRESET_SORT = {"best": ["res", "fps", "br"]}


class DownloadService:
    def __init__(self):
        self.chunk_size = settings.download_chunk_size
        self.download_dir = settings.download_dir
        self.download_semaphore = asyncio.Semaphore(settings.max_concurrent_downloads)

    async def download_video(
        self,
        url: str,
        format_id: str,
        title: str,
        progress_callback: Optional[Callable] = None
    ) -> DownloadTask:
        """Download video with specified format"""
        task_id = str(uuid.uuid4())
        task = DownloadTask(
            task_id=task_id,
            url=url,
            format_type="video",
            format_id=format_id,
            status="pending",
            title=title,
            created_at=datetime.utcnow()
        )

        async with self.download_semaphore:
            try:
                await self._download_with_ytdlp(
                    url, format_id, task, "video", progress_callback
                )
            except Exception as e:
                task.status = "failed"
                task.error = str(e)
                raise DownloadError(f"Download failed: {str(e)}")

        return task

    async def download_audio(
        self,
        url: str,
        format_id: str,
        title: str,
        progress_callback: Optional[Callable] = None
    ) -> DownloadTask:
        """Download audio with specified format"""
        task_id = str(uuid.uuid4())
        task = DownloadTask(
            task_id=task_id,
            url=url,
            format_type="audio",
            format_id=format_id,
            status="pending",
            title=title,
            created_at=datetime.utcnow()
        )

        async with self.download_semaphore:
            try:
                await self._download_with_ytdlp(
                    url, format_id, task, "audio", progress_callback
                )
            except Exception as e:
                task.status = "failed"
                task.error = str(e)
                raise DownloadError(f"Download failed: {str(e)}")

        return task

    async def _download_with_ytdlp(
        self,
        url: str,
        format_id: str,
        task: DownloadTask,
        download_type: str,
        progress_callback: Optional[Callable] = None
    ):
        """Download using yt-dlp with optimized settings"""

        # Sanitize filename
        safe_title = self._sanitize_filename(task.title)
        output_filename = f"{safe_title}.%(ext)s"
        output_path = os.path.join(self.download_dir, output_filename)

        # Progress hook
        def progress_hook(d):
            if progress_callback:
                progress_callback(d)

            if d['status'] == 'downloading':
                if 'total_bytes' in d and d['total_bytes']:
                    task.progress = (d['downloaded_bytes'] / d['total_bytes']) * 100
                elif 'total_bytes_estimate' in d and d['total_bytes_estimate']:
                    task.progress = (d['downloaded_bytes'] / d['total_bytes_estimate']) * 100
                task.status = "downloading"
            elif d['status'] == 'finished':
                task.progress = 100.0
                task.status = "processing"

        # Configure yt-dlp options
        ydl_opts = {
            'format': self._get_format_string(format_id, download_type),
            **({'format_sort': sort} if (sort := self._get_format_sort(format_id)) else {}),
            'outtmpl': output_path,
            'source_address': '::',  # IPv6 only: the IPv4 address is rate-limited by YouTube
            'progress_hooks': [progress_hook],

            # Optimization for long videos
            'retries': 10,
            'fragment_retries': 10,
            'skip_unavailable_fragments': False,
            'buffersize': self.chunk_size,
            'http_chunk_size': settings.http_chunk_size,
            'concurrent_fragment_downloads': 4,

            # Quality preservation
            'prefer_ffmpeg': True,
            'keepvideo': False,
            'merge_output_format': 'mp4' if download_type == 'video' else None,

            # Embed uploaded English subtitles into the MP4 when the video has them
            # ponytail: manual subs only; add 'writeautomaticsub': True for auto-captions too
            **({
                'writesubtitles': True,
                'subtitleslangs': ['en', 'en-US', 'en-GB'],  # not 'en.*': that matches auto-translations like en-af
            } if download_type == 'video' else {}),

            # Audio: extract to mp3. Video: embed subtitles (a no-op when none were downloaded)
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '0',
            }] if download_type == 'audio' else [{'key': 'FFmpegEmbedSubtitle'}],

            'quiet': True,
            'no_warnings': True,
        }

        # Download in thread pool
        loop = asyncio.get_event_loop()
        try:
            task.status = "downloading"
            task.output_path = await loop.run_in_executor(None, self._download_sync, ydl_opts, url)

            task.status = "complete"
            task.progress = 100.0
            task.completed_at = datetime.utcnow()

            # Get file size
            if task.output_path and os.path.exists(task.output_path):
                task.file_size = os.path.getsize(task.output_path)

        except Exception as e:
            task.status = "failed"
            task.error = str(e)
            raise

    def _download_sync(self, ydl_opts: dict, url: str) -> str:
        """Synchronous download function for thread pool; returns the final (merged) file path"""
        youtube_limiter.wait()
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            return info['requested_downloads'][0]['filepath']

    def _get_format_string(self, format_id: str, download_type: str) -> str:
        """Get format string for yt-dlp"""
        if format_id.startswith("preset:"):
            return PRESET_FORMATS[format_id.removeprefix("preset:")]
        if download_type == "video":
            return f"{format_id}+bestaudio/best"
        else:
            return f"{format_id}/bestaudio/best"

    def _get_format_sort(self, format_id: str) -> Optional[list[str]]:
        """yt-dlp format_sort override for a preset, or None for the default ranking"""
        return PRESET_SORT.get(format_id.removeprefix("preset:")) if format_id.startswith("preset:") else None

    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename for safe filesystem operations"""
        # Remove/replace problematic characters
        import re
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        filename = re.sub(r'[^\w\s-]', '', filename).strip()
        filename = re.sub(r'[-\s]+', '-', filename)
        return filename[:100]  # Limit length

    async def get_file_stream(self, file_path: str, chunk_size: int = 8192):
        """Stream file for download"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        async with aiofiles.open(file_path, 'rb') as f:
            while chunk := await f.read(chunk_size):
                yield chunk

    async def cleanup_old_files(self):
        """Clean up old downloaded files"""
        if not settings.auto_cleanup_enabled:
            return

        try:
            current_time = datetime.utcnow().timestamp()
            max_age_seconds = settings.max_file_age_hours * 3600

            for filename in os.listdir(self.download_dir):
                file_path = os.path.join(self.download_dir, filename)
                if os.path.isfile(file_path):
                    file_age = current_time - os.path.getctime(file_path)
                    if file_age > max_age_seconds:
                        os.remove(file_path)

        except Exception as e:
            print(f"Cleanup error: {e}")  # Log this properly in production

    def delete_file(self, file_path: str) -> bool:
        """Delete a downloaded file; refuses anything outside the download directory"""
        root = os.path.realpath(self.download_dir)
        path = os.path.realpath(file_path)
        if os.path.commonpath([root, path]) != root or not os.path.isfile(path):
            return False
        os.remove(path)
        return True

    def delete_partials(self, title: str) -> None:
        """Remove yt-dlp leftovers (.part, per-stream f### files, subtitles) of an aborted download"""
        stem = re.escape(self._sanitize_filename(title))
        leftover = re.compile(rf"^{stem}\.(f[\w-]+\..*|.*\.part|.*\.ytdl|.*\.vtt)$")
        for name in os.listdir(self.download_dir):
            if leftover.match(name):
                self.delete_file(os.path.join(self.download_dir, name))

    def cancel_download(self, task_id: str) -> bool:
        """Cancel an ongoing download"""
        # This is a simplified implementation
        # In a real system, you'd need to track active downloads
        # and signal them to stop
        return True