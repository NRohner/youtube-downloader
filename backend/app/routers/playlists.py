from fastapi import APIRouter, HTTPException
from ..models.schemas import InfoRequest, DownloadRequest, PlaylistInfo, DownloadResponse
from ..services.youtube import YouTubeService
from ..services.download_manager import download_manager

router = APIRouter(prefix="/api/playlists", tags=["playlists"])

youtube_service = YouTubeService()


@router.post("/info", response_model=PlaylistInfo)
async def get_playlist_info(request: InfoRequest):
    """
    Get information about a YouTube playlist.

    Args:
        request: Request containing the playlist URL

    Returns:
        Playlist information including title, video count, and video list
    """
    try:
        info = await youtube_service.get_info(request.url)
        if info.type != 'playlist':
            raise HTTPException(
                status_code=400,
                detail="URL is a single video, not a playlist"
            )
        return info
    except NotImplementedError:
        # Placeholder response for Phase 1
        raise HTTPException(
            status_code=501,
            detail="Playlist info extraction not yet implemented"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/download", response_model=DownloadResponse)
async def download_playlist(request: DownloadRequest):
    """
    Start downloading audio from a YouTube playlist.

    Args:
        request: Request containing the playlist URL, bitrate, and optional video IDs

    Returns:
        Session ID for tracking the download progress
    """
    try:
        session_id = download_manager.create_session(
            url=request.url,
            is_playlist=True
        )

        # TODO: Start the actual download in background
        # This will be implemented in Phase 2

        return DownloadResponse(
            session_id=session_id,
            is_playlist=True
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
