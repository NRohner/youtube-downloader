import pytest
from app.services.youtube_service import YouTubeService, parse_youtube_url

LIST_ID = "PLRcHmntfmJ8CnSmj4C284-a1euH518aQa"


@pytest.mark.parametrize("url,expected", [
    ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", ("dQw4w9WgXcQ", None)),
    (f"https://www.youtube.com/watch?v=z3hMX65Khtg&list={LIST_ID}", ("z3hMX65Khtg", LIST_ID)),
    (f"https://www.youtube.com/playlist?list={LIST_ID}", (None, LIST_ID)),
    ("https://youtu.be/dQw4w9WgXcQ", ("dQw4w9WgXcQ", None)),
    ("https://www.youtube.com/shorts/dQw4w9WgXcQ", ("dQw4w9WgXcQ", None)),
    ("https://www.youtube.com/embed/dQw4w9WgXcQ", ("dQw4w9WgXcQ", None)),
    ("https://example.com/watch?v=dQw4w9WgXcQ", (None, None)),
    ("https://www.youtube.com/", (None, None)),
    ("https://www.youtube.com/playlist", (None, None)),
    ("not a url", (None, None)),
])
def test_parse_youtube_url(url, expected):
    assert parse_youtube_url(url) == expected


@pytest.mark.parametrize("url,valid", [
    (f"https://www.youtube.com/playlist?list={LIST_ID}", True),
    (f"https://www.youtube.com/watch?v=z3hMX65Khtg&list={LIST_ID}", True),
    ("https://youtu.be/dQw4w9WgXcQ", True),
    ("https://example.com/", False),
])
def test_validate(url, valid):
    assert YouTubeService()._validate_youtube_url(url) is valid


def test_playlist_url_normalized():
    svc = YouTubeService()
    assert svc._playlist_url(f"https://www.youtube.com/watch?v=z3hMX65Khtg&list={LIST_ID}") == \
        f"https://www.youtube.com/playlist?list={LIST_ID}"


def test_schemas_serialize_camel_case_and_accept_snake_case():
    from app.schemas.video import VideoInfo
    v = VideoInfo(video_id="x", title="t", duration=1, thumbnail="")
    assert "videoId" in v.model_dump(by_alias=True)
    assert VideoInfo(videoId="x", title="t", duration=1, thumbnail="").video_id == "x"


def test_parse_playlist_info_uses_flat_entries_without_fetching_videos():
    info = {"id": LIST_ID, "title": "P", "entries": [
        {"id": "dQw4w9WgXcQ", "title": "A", "duration": 213, "channel": "C",
         "thumbnails": [{"url": "small"}, {"url": "big"}]},
        {"id": "jNQXAC9IVRw", "title": "B", "duration": None},
        {"id": "xxxxxxxxxxx", "title": "[Private video]"},
        None,
    ]}
    p = YouTubeService()._parse_playlist_info(info)
    assert [v.video_id for v in p.videos] == ["dQw4w9WgXcQ", "jNQXAC9IVRw"]
    assert p.video_count == 2
    assert p.videos[0].thumbnail == "big" and p.videos[0].duration == 213
    assert p.videos[1].thumbnail.endswith("jNQXAC9IVRw/hqdefault.jpg")


def test_best_video_format_is_listed_first():
    def v(fid, w, h, tbr):
        return {"format_id": fid, "resolution": f"{w}x{h}", "height": h, "tbr": tbr,
                "fps": 24, "vcodec": "avc1", "acodec": "none", "ext": "mp4"}
    info = {"id": "x", "title": "t", "formats": [
        v("lo", 256, 144, 90), v("av1", 1920, 1080, 768), v("h264", 1920, 1080, 1614),
        v("vp9", 1920, 1080, 1124), v("720", 1280, 720, 596),
        {"format_id": "a1", "abr": 48, "acodec": "opus", "vcodec": "none", "ext": "webm"},
        {"format_id": "a2", "abr": 160, "acodec": "opus", "vcodec": "none", "ext": "webm"},
    ]}
    p = YouTubeService()._parse_video_info(info)
    assert [f.format_id for f in p.available_video_formats] == ["h264", "vp9", "av1", "720", "lo"]
    assert p.available_audio_formats[0].format_id == "a2"
