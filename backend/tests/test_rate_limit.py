import time
from concurrent.futures import ThreadPoolExecutor
from app.core.rate_limit import RateLimiter


def test_calls_are_spaced_even_across_threads():
    limiter = RateLimiter(0.2)
    starts = []

    def call():
        limiter.wait()
        starts.append(time.monotonic())

    with ThreadPoolExecutor(4) as ex:
        for f in [ex.submit(call) for _ in range(4)]:
            f.result()

    starts.sort()
    gaps = [b - a for a, b in zip(starts, starts[1:])]
    assert all(g >= 0.18 for g in gaps), gaps


def test_first_call_does_not_wait():
    t = time.monotonic()
    RateLimiter(5).wait()
    assert time.monotonic() - t < 0.1
