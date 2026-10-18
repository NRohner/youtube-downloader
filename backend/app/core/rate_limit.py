import threading
import time

from app.core.config import settings


class RateLimiter:
    """Blocks callers (from any thread) so calls start at least `interval` seconds apart."""

    def __init__(self, interval: float):
        self.interval = interval
        self._lock = threading.Lock()
        self._next = 0.0

    def wait(self) -> None:
        with self._lock:
            now = time.monotonic()
            start = max(now, self._next)
            self._next = start + self.interval
        time.sleep(start - now)


# One limiter shared by every yt-dlp call (info, playlist, download)
youtube_limiter = RateLimiter(settings.youtube_min_interval)
