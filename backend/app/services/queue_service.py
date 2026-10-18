import redis
import json
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.config import settings
from app.schemas.download import DownloadTask, DownloadTaskUpdate, DownloadRequest
from app.core.exceptions import TaskNotFoundError


class QueueService:
    def __init__(self):
        self.redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
        self.task_prefix = "download_task:"
        self.queue_key = "download_queue"
        self.active_downloads = "active_downloads"
        self.paused_key = "queue_paused"
        # ids of cancelled tasks; the download thread checks this to abort (single-process only)
        self.cancelled: set[str] = set()

    async def add_to_queue(self, request: DownloadRequest, title: str) -> str:
        """Add a download task to the queue"""
        task_id = str(uuid.uuid4())

        task = DownloadTask(
            task_id=task_id,
            url=str(request.url),
            format_type=request.format_type,
            format_id=request.format_id,
            status="pending",
            title=title,
            created_at=datetime.utcnow()
        )

        # Store task in Redis
        task_key = f"{self.task_prefix}{task_id}"
        self.redis_client.set(task_key, task.model_dump_json())

        # Add to queue
        self.redis_client.lpush(self.queue_key, task_id)

        return task_id

    async def get_task_status(self, task_id: str) -> DownloadTask:
        """Get task status by ID"""
        task_key = f"{self.task_prefix}{task_id}"
        task_data = self.redis_client.get(task_key)

        if not task_data:
            raise TaskNotFoundError(f"Task {task_id} not found")

        return DownloadTask.model_validate_json(task_data)

    async def update_task(self, task_id: str, updates: DownloadTaskUpdate):
        """Update task status and details"""
        task_key = f"{self.task_prefix}{task_id}"
        task_data = self.redis_client.get(task_key)

        if not task_data:
            raise TaskNotFoundError(f"Task {task_id} not found")

        task = DownloadTask.model_validate_json(task_data)

        # Apply updates
        for field, value in updates.model_dump(exclude_unset=True).items():
            if hasattr(task, field) and value is not None:
                setattr(task, field, value)

        # Save updated task
        self.redis_client.set(task_key, task.model_dump_json())

    async def get_next_task(self) -> Optional[DownloadTask]:
        """Get next task from queue"""
        task_id = self.redis_client.rpop(self.queue_key)
        if not task_id:
            return None

        try:
            task = await self.get_task_status(task_id)
            # Mark as active
            self.redis_client.sadd(self.active_downloads, task_id)
            return task
        except TaskNotFoundError:
            # Task was deleted, try next one
            return await self.get_next_task()

    async def complete_task(self, task_id: str):
        """Mark task as complete and remove from active downloads"""
        self.redis_client.srem(self.active_downloads, task_id)

    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a task"""
        try:
            task = await self.get_task_status(task_id)

            if task.status in ["complete", "failed", "cancelled"]:
                return False

            self.cancelled.add(task_id)

            # Update status
            await self.update_task(task_id, DownloadTaskUpdate(
                status="cancelled",
                completed_at=datetime.utcnow()
            ))

            # Remove from active downloads
            self.redis_client.srem(self.active_downloads, task_id)

            return True
        except TaskNotFoundError:
            return False

    async def cancel_all(self) -> int:
        """Cancel every pending or running task; returns how many were cancelled"""
        tasks = await self.get_queue_status()
        results = [await self.cancel_task(t.task_id) for t in tasks]
        return sum(results)

    def set_paused(self, paused: bool) -> None:
        if paused:
            self.redis_client.set(self.paused_key, "1")
        else:
            self.redis_client.delete(self.paused_key)

    def is_paused(self) -> bool:
        return bool(self.redis_client.exists(self.paused_key))

    async def remove_task(self, task_id: str) -> None:
        """Forget a task entirely (record plus queue entries)"""
        self.redis_client.delete(f"{self.task_prefix}{task_id}")
        self.redis_client.lrem(self.queue_key, 0, task_id)
        self.redis_client.srem(self.active_downloads, task_id)

    async def get_queue_status(self) -> List[DownloadTask]:
        """Get all tasks in queue"""
        # Get pending tasks
        pending_ids = self.redis_client.lrange(self.queue_key, 0, -1)

        # Get active tasks
        active_ids = self.redis_client.smembers(self.active_downloads)

        all_ids = set(pending_ids + list(active_ids))
        tasks = []

        for task_id in all_ids:
            try:
                task = await self.get_task_status(task_id)
                tasks.append(task)
            except TaskNotFoundError:
                continue

        # Sort by creation time
        tasks.sort(key=lambda x: x.created_at, reverse=True)
        return tasks

    async def cleanup_completed_tasks(self, max_age_hours: int = 24):
        """Clean up old completed tasks"""
        current_time = datetime.utcnow().timestamp()
        max_age_seconds = max_age_hours * 3600

        # Get all task keys
        task_keys = self.redis_client.keys(f"{self.task_prefix}*")

        for task_key in task_keys:
            task_data = self.redis_client.get(task_key)
            if not task_data:
                continue

            try:
                task = DownloadTask.model_validate_json(task_data)
                if (task.status in ["complete", "failed", "cancelled"] and
                    task.completed_at and
                    (current_time - task.completed_at.timestamp()) > max_age_seconds):
                    self.redis_client.delete(task_key)
            except Exception:
                # Delete corrupted task data
                self.redis_client.delete(task_key)

    def get_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        pending_count = self.redis_client.llen(self.queue_key)
        active_count = self.redis_client.scard(self.active_downloads)
        total_tasks = len(self.redis_client.keys(f"{self.task_prefix}*"))

        return {
            "pending": pending_count,
            "active": active_count,
            "total_tasks": total_tasks
        }

    async def progress_callback(self, task_id: str, progress_data: dict):
        """Callback for download progress updates"""
        try:
            progress = 0
            status = "downloading"

            if progress_data['status'] == 'downloading':
                if 'total_bytes' in progress_data and progress_data['total_bytes']:
                    progress = (progress_data['downloaded_bytes'] / progress_data['total_bytes']) * 100
                elif 'total_bytes_estimate' in progress_data and progress_data['total_bytes_estimate']:
                    progress = (progress_data['downloaded_bytes'] / progress_data['total_bytes_estimate']) * 100
                status = "downloading"
            elif progress_data['status'] == 'finished':
                progress = 100.0
                status = "processing"

            await self.update_task(task_id, DownloadTaskUpdate(
                progress=progress,
                status=status
            ))
        except Exception as e:
            print(f"Progress callback error: {e}")


# Simplified background worker function (without Celery for this MVP)
class BackgroundWorker:
    def __init__(self, queue_service: QueueService):
        self.queue_service = queue_service
        self.is_running = False

    async def start(self):
        """Start the background worker"""
        self.is_running = True
        # In a real implementation, this would be a proper background task
        # For now, we'll process tasks synchronously when requested


# Global instances
queue_service = QueueService()
background_worker = BackgroundWorker(queue_service)