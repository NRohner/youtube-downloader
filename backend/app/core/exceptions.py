from fastapi import HTTPException


class YouTubeDownloaderException(Exception):
    """Base exception for YouTube downloader errors"""
    pass


class VideoNotFoundError(YouTubeDownloaderException):
    """Raised when video is not found or unavailable"""
    pass


class UnsupportedFormatError(YouTubeDownloaderException):
    """Raised when requested format is not available"""
    pass


class DownloadError(YouTubeDownloaderException):
    """Raised when download fails"""
    pass


class InvalidURLError(YouTubeDownloaderException):
    """Raised when URL is invalid"""
    pass


class TaskNotFoundError(YouTubeDownloaderException):
    """Raised when download task is not found"""
    pass


def create_http_exception(exc: YouTubeDownloaderException) -> HTTPException:
    """Convert internal exceptions to HTTP exceptions"""
    if isinstance(exc, VideoNotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    elif isinstance(exc, UnsupportedFormatError):
        return HTTPException(status_code=400, detail=str(exc))
    elif isinstance(exc, InvalidURLError):
        return HTTPException(status_code=400, detail=str(exc))
    elif isinstance(exc, TaskNotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    elif isinstance(exc, DownloadError):
        return HTTPException(status_code=500, detail=str(exc))
    else:
        return HTTPException(status_code=500, detail="Internal server error")


class DownloadCancelled(Exception):
    """Raised inside a yt-dlp progress hook to abort a download the user cancelled"""
