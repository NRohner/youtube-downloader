from fastapi import APIRouter, HTTPException
from ..models.schemas import InfoRequest, DownloadRequest, VideoInfo, DownloadResponse
from ..services.youtube import YouTubeService
from ..services.download_manager import download_manager

router = APIRouter(prefix="/api/videos", tags=["videos"])

youtube_service = YouTubeService()


@router.post("/info", response_model=VideoInfo)
async def get_video_info(request: InfoRequest):
    """
    Get information about a single YouTube video.

    Args:
        request: Request containing the video URL

    Returns:
        Video information including title, duration, thumbnail, etc.
    """
    try:
        info = await youtube_service.get_info(request.url)
        if info.type != 'video':
            raise HTTPException(
                status_code=400,
                detail="URL is a playlist, not a single video"
            )
        return info
    except NotImplementedError:
        # Placeholder response for Phase 1
        raise HTTPException(
            status_code=501,
            detail="Video info extraction not yet implemented"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/download", response_model=DownloadResponse)
async def download_video(request: DownloadRequest):
    """
    Start downloading audio from a YouTube video.

    Args:
        request: Request containing the video URL and bitrate

    Returns:
        Session ID for tracking the download progress
    """
    try:
        session_id = download_manager.create_session(
            url=request.url,
            is_playlist=False
        )

        # TODO: Start the actual download in background
        # This will be implemented in Phase 2

        return DownloadResponse(
            session_id=session_id,
            is_playlist=False
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
