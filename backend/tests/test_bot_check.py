import asyncio
from types import SimpleNamespace

from app.api.routes.download import process_download_task
from app.core.exceptions import is_bot_check

BOT_ERROR = (
    "ERROR: [youtube] uLJCo0ly_Rc: Sign in to confirm you’re not a bot. "
    "Use --cookies-from-browser or --cookies for the authentication."
)


def test_is_bot_check_matches_curly_and_straight_apostrophes():
    assert is_bot_check(BOT_ERROR)
    assert is_bot_check("Sign in to confirm you're not a bot")
    assert not is_bot_check("ERROR: [youtube] abc: Video unavailable")
    assert not is_bot_check("HTTP Error 429: Too Many Requests")


class FakeQueue:
    def __init__(self):
        self.cancelled = set()
        self.paused = False
        self.updates = []

    def is_paused(self):
        return self.paused

    def set_paused(self, paused):
        self.paused = paused

    async def get_task_status(self, task_id):
        return SimpleNamespace(status="pending", format_type="video", url="u", format_id="f", title="t")

    async def update_task(self, task_id, update):
        self.updates.append(update)


class FailingDownloads:
    def __init__(self, message):
        self.message = message

    async def download_video(self, *args):
        raise RuntimeError(self.message)


def run_failing_task(message):
    queue = FakeQueue()
    asyncio.run(process_download_task("t1", FailingDownloads(message), queue))
    return queue


def test_bot_check_failure_pauses_the_queue_so_the_rest_do_not_hammer_youtube():
    queue = run_failing_task(BOT_ERROR)
    assert queue.paused is True
    assert queue.updates[-1].status == "failed"
    assert "not a bot" in queue.updates[-1].error


def test_other_failures_do_not_pause_the_queue():
    queue = run_failing_task("ERROR: [youtube] abc: Video unavailable")
    assert queue.paused is False
    assert queue.updates[-1].status == "failed"
