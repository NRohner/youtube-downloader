from app.services.download_service import DownloadService


def make(tmp_path):
    svc = DownloadService()
    svc.download_dir = str(tmp_path / "downloads")
    (tmp_path / "downloads").mkdir()
    return svc


def test_delete_file_removes_file_inside_download_dir(tmp_path):
    svc = make(tmp_path)
    f = tmp_path / "downloads" / "a.mp4"
    f.write_text("x")
    assert svc.delete_file(str(f)) is True
    assert not f.exists()


def test_delete_file_refuses_paths_outside_download_dir(tmp_path):
    svc = make(tmp_path)
    outside = tmp_path / "secret.txt"
    outside.write_text("x")
    sneaky = str(tmp_path / "downloads" / ".." / "secret.txt")
    assert svc.delete_file(str(outside)) is False
    assert svc.delete_file(sneaky) is False
    assert outside.exists()


def test_delete_file_missing_is_not_an_error(tmp_path):
    assert make(tmp_path).delete_file(str(tmp_path / "downloads" / "nope.mp4")) is False


def test_format_string_for_presets_and_explicit_ids():
    svc = DownloadService()
    assert svc._get_format_string("137", "video") == "137+bestaudio/best"
    assert svc._get_format_string("140", "audio") == "140/bestaudio/best"
    assert svc._get_format_string("preset:best", "video") == "bv*+ba/b"
    assert svc._get_format_string("preset:2160p", "video") == "bv*[height<=2160]+ba/b[height<=2160]/b"
    assert svc._get_format_string("preset:1080p", "video") == "bv*[height<=1080]+ba/b[height<=1080]/b"
    assert svc._get_format_string("preset:720p", "video") == "bv*[height<=720]+ba/b[height<=720]/b"
    assert svc._get_format_string("preset:480p", "video") == "bv*[height<=480]+ba/b[height<=480]/b"
    assert svc._get_format_string("preset:audio", "audio") == "bestaudio/best"


def test_best_preset_sorts_by_resolution_then_bitrate_not_codec():
    svc = DownloadService()
    for fid in ("preset:best", "preset:2160p", "preset:1080p"):
        assert svc._get_format_sort(fid) == ["res", "fps", "br"]
    # lower presets and explicit ids keep yt-dlp's default sort
    for fid in ("preset:720p", "preset:480p", "preset:audio", "137"):
        assert svc._get_format_sort(fid) is None


def test_delete_partials_removes_leftovers_but_keeps_finished_files(tmp_path):
    svc = make(tmp_path)
    d = tmp_path / "downloads"
    leftovers = ["My-Video.f137.mp4.part", "My-Video.f137.mp4", "My-Video.f251.webm",
                 "My-Video.f251.webm.ytdl", "My-Video.en.vtt"]
    keep = ["My-Video.mp4", "My-Video.mp3", "My-Video-2.f137.mp4.part", "Other.f137.mp4.part"]
    for name in leftovers + keep:
        (d / name).write_text("x")
    svc.delete_partials("My Video")  # title is sanitized the same way as at download time
    assert sorted(p.name for p in d.iterdir()) == sorted(keep)
