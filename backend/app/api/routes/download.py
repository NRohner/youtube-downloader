import os
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import List

from app.schemas.video import VideoInfo, VideoInfoRequest, PlaylistInfo, PlaylistInfoRequest
from app.schemas.download import (
    DownloadRequest, DownloadTask, PlaylistDownloadRequest, BatchDownloadResponse
)
from app.services.youtube_service import YouTubeService
from app.services.download_service import DownloadService
from app.services.queue_service import QueueService
from app.api.dependencies import get_youtube_service, get_download_service, get_queue_service
from app.core.exceptions import create_http_exception, YouTubeDownloaderException, TaskNotFoundError, DownloadCancelled


router = APIRouter(prefix="/api/v1", tags=["download"])


@router.post("/video/info", response_model=VideoInfo)
async def get_video_info(
    request: VideoInfoRequest,
    youtube_service: YouTubeService = Depends(get_youtube_service)
) -> VideoInfo:
    """Fetch video metadata and available formats"""
    try:
        return await youtube_service.get_video_info(str(request.url))
    except YouTubeDownloaderException as e:
        raise create_http_exception(e)


@router.post("/playlist/info", response_model=PlaylistInfo)
async def get_playlist_info(
    request: PlaylistInfoRequest,
    youtube_service: YouTubeService = Depends(get_youtube_service)
) -> PlaylistInfo:
    """Fetch playlist metadata with all video IDs"""
    try:
        return await youtube_service.get_playlist_info(str(request.url))
    except YouTubeDownloaderException as e:
        raise create_http_exception(e)


@router.post("/download/start", response_model=DownloadTask)
async def start_download(
    request: DownloadRequest,
    background_tasks: BackgroundTasks,
    youtube_service: YouTubeService = Depends(get_youtube_service),
    download_service: DownloadService = Depends(get_download_service),
    queue_service: QueueService = Depends(get_queue_service)
) -> DownloadTask:
    """Initiate a download task"""
    try:
        # First get video info to get the title
        video_info = await youtube_service.get_video_info(str(request.url))

        # Add to queue
        task_id = await queue_service.add_to_queue(request, video_info.title)

        # Start background download
        background_tasks.add_task(
            process_download_task,
            task_id,
            download_service,
            queue_service
        )

        return await queue_service.get_task_status(task_id)

    except YouTubeDownloaderException as e:
        raise create_http_exception(e)


async def process_download_task(
    task_id: str,
    download_service: DownloadService,
    queue_service: QueueService
):
    """Background task to process download"""
    task = None
    try:
        # Paused: wait here (the rest of a batch waits behind us); a cancel also ends the wait
        while queue_service.is_paused() and task_id not in queue_service.cancelled:
            await asyncio.sleep(1)

        task = await queue_service.get_task_status(task_id)
        if task.status == "cancelled":  # cancelled while waiting its turn in a batch
            return

        # yt-dlp calls this from a worker thread, so hand the update back to the event loop
        loop = asyncio.get_running_loop()

        def progress_callback(progress_data: dict):
            if task_id in queue_service.cancelled:
                raise DownloadCancelled()  # aborts the yt-dlp download
            asyncio.run_coroutine_threadsafe(
                queue_service.progress_callback(task_id, progress_data), loop
            )

        # Download based on type
        if task.format_type == "video":
            result = await download_service.download_video(
                task.url,
                task.format_id,
                task.title,
                progress_callback
            )
        else:
            result = await download_service.download_audio(
                task.url,
                task.format_id,
                task.title,
                progress_callback
            )

        # Update task with results
        from app.schemas.download import DownloadTaskUpdate
        await queue_service.update_task(task_id, DownloadTaskUpdate(
            status=result.status,
            progress=result.progress,
            output_path=result.output_path,
            file_size=result.file_size,
            completed_at=result.completed_at,
            error=result.error
        ))

    except Exception as e:
        from app.schemas.download import DownloadTaskUpdate
        if task_id in queue_service.cancelled:
            # status is already "cancelled" (set by cancel_task); just clear the leftovers
            if task:
                download_service.delete_partials(task.title)
            return
        await queue_service.update_task(task_id, DownloadTaskUpdate(
            status="failed",
            error=str(e)
        ))
    finally:
        queue_service.cancelled.discard(task_id)


@router.get("/download/status/{task_id}", response_model=DownloadTask)
async def get_download_status(
    task_id: str,
    queue_service: QueueService = Depends(get_queue_service)
) -> DownloadTask:
    """Get current download progress"""
    try:
        return await queue_service.get_task_status(task_id)
    except YouTubeDownloaderException as e:
        raise create_http_exception(e)


@router.get("/download/file/{task_id}")
async def download_file(
    task_id: str,
    queue_service: QueueService = Depends(get_queue_service),
    download_service: DownloadService = Depends(get_download_service)
):
    """Stream the completed file to client"""
    try:
        task = await queue_service.get_task_status(task_id)

        if task.status != "complete":
            raise HTTPException(status_code=400, detail="Download not complete")

        if not task.output_path or not os.path.exists(task.output_path):
            raise HTTPException(status_code=404, detail="File not found")

        file_size = os.path.getsize(task.output_path)
        filename = os.path.basename(task.output_path)

        return StreamingResponse(
            download_service.get_file_stream(task.output_path),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(file_size),
            }
        )
    except YouTubeDownloaderException as e:
        raise create_http_exception(e)


@router.post("/playlist/download", response_model=BatchDownloadResponse)
async def download_playlist(
    request: PlaylistDownloadRequest,
    background_tasks: BackgroundTasks,
    youtube_service: YouTubeService = Depends(get_youtube_service),
    download_service: DownloadService = Depends(get_download_service),
    queue_service: QueueService = Depends(get_queue_service)
) -> BatchDownloadResponse:
    """Queue every video in a playlist at a quality preset; they download one after another"""
    try:
        playlist_info = await youtube_service.get_playlist_info(str(request.playlist_url))
        format_type = "audio" if request.quality == "audio" else "video"

        task_ids = []
        for video in playlist_info.videos:
            download_request = DownloadRequest(
                url=f"https://www.youtube.com/watch?v={video.video_id}",
                format_type=format_type,
                format_id=f"preset:{request.quality}"
            )
            task_id = await queue_service.add_to_queue(download_request, video.title)
            task_ids.append(task_id)
            # Background tasks run sequentially, which also keeps YouTube request volume gentle
            background_tasks.add_task(process_download_task, task_id, download_service, queue_service)

        return BatchDownloadResponse(
            batch_id=f"batch_{playlist_info.playlist_id}",
            task_ids=task_ids,
            total_videos=len(task_ids)
        )

    except YouTubeDownloaderException as e:
        raise create_http_exception(e)


@router.delete("/download/{task_id}")
async def cancel_download(
    task_id: str,
    queue_service: QueueService = Depends(get_queue_service)
) -> dict:
    """Cancel an in-progress download"""
    try:
        success = await queue_service.cancel_task(task_id)
        return {"cancelled": success}
    except YouTubeDownloaderException as e:
        raise create_http_exception(e)


@router.delete("/download/{task_id}/remove")
async def remove_download(
    task_id: str,
    queue_service: QueueService = Depends(get_queue_service),
    download_service: DownloadService = Depends(get_download_service)
) -> dict:
    """Delete a finished task's file and forget the task (idempotent)"""
    try:
        task = await queue_service.get_task_status(task_id)
    except TaskNotFoundError:
        return {"removed": False}
    if task.status not in ("complete", "failed", "cancelled"):
        raise HTTPException(status_code=409, detail="Task is still in progress; cancel it first")
    if task.output_path:
        download_service.delete_file(task.output_path)
    await queue_service.remove_task(task_id)
    return {"removed": True}


@router.post("/queue/cancel-all")
async def cancel_all(
    queue_service: QueueService = Depends(get_queue_service)
) -> dict:
    """Cancel every pending and running download"""
    return {"cancelled": await queue_service.cancel_all()}


@router.post("/queue/pause")
async def pause_queue(
    queue_service: QueueService = Depends(get_queue_service)
) -> dict:
    """Stop starting new downloads (the running one finishes)"""
    queue_service.set_paused(True)
    return {"paused": True}


@router.post("/queue/resume")
async def resume_queue(
    queue_service: QueueService = Depends(get_queue_service)
) -> dict:
    queue_service.set_paused(False)
    return {"paused": False}


@router.get("/queue/state")
async def get_queue_state(
    queue_service: QueueService = Depends(get_queue_service)
) -> dict:
    return {"paused": queue_service.is_paused()}


@router.get("/queue/status", response_model=List[DownloadTask])
async def get_queue_status(
    queue_service: QueueService = Depends(get_queue_service)
) -> List[DownloadTask]:
    """Get all tasks in queue with their status"""
    try:
        return await queue_service.get_queue_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/queue/stats")
async def get_queue_stats(
    queue_service: QueueService = Depends(get_queue_service)
) -> dict:
    """Get queue statistics"""
    return queue_service.get_stats()


# Import asyncio for the background task
import asyncio