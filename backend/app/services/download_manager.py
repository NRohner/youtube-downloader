import asyncio
from typing import AsyncGenerator
from ..utils.helpers import generate_session_id


class DownloadManager:
    """Manages download sessions and progress tracking."""

    def __init__(self):
        """Initialize the download manager."""
        self._sessions: dict[str, dict] = {}
        self._progress_queues: dict[str, asyncio.Queue] = {}

    def create_session(self, url: str, is_playlist: bool) -> str:
        """
        Create a new download session.

        Args:
            url: The YouTube URL being downloaded
            is_playlist: Whether this is a playlist download

        Returns:
            Session ID for tracking the download
        """
        session_id = generate_session_id()
        self._sessions[session_id] = {
            'url': url,
            'is_playlist': is_playlist,
            'status': 'pending',
            'progress': 0,
            'files': []
        }
        self._progress_queues[session_id] = asyncio.Queue()
        return session_id

    def get_session(self, session_id: str) -> dict | None:
        """
        Get session information.

        Args:
            session_id: The session ID to look up

        Returns:
            Session data or None if not found
        """
        return self._sessions.get(session_id)

    async def update_progress(self, session_id: str, progress_data: dict) -> None:
        """
        Update the progress for a session.

        Args:
            session_id: The session ID to update
            progress_data: Progress information to store
        """
        if session_id in self._sessions:
            self._sessions[session_id].update(progress_data)
            if session_id in self._progress_queues:
                await self._progress_queues[session_id].put(progress_data)

    async def get_progress_stream(self, session_id: str) -> AsyncGenerator[dict, None]:
        """
        Get a stream of progress updates for a session.

        Args:
            session_id: The session ID to stream progress for

        Yields:
            Progress update dictionaries
        """
        if session_id not in self._progress_queues:
            return

        queue = self._progress_queues[session_id]

        while True:
            try:
                progress = await asyncio.wait_for(queue.get(), timeout=30.0)
                yield progress

                # Check if download is complete or errored
                if progress.get('status') in ('complete', 'error'):
                    break
            except asyncio.TimeoutError:
                # Send keepalive
                yield {'type': 'keepalive'}

    def cleanup_session(self, session_id: str) -> None:
        """
        Clean up a completed session.

        Args:
            session_id: The session ID to clean up
        """
        self._sessions.pop(session_id, None)
        self._progress_queues.pop(session_id, None)


# Global download manager instance
download_manager = DownloadManager()
