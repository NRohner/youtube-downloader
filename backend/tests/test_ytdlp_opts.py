from app.core.config import settings
from app.core.ytdlp import ytdlp_network_opts
from app.services.youtube_service import YouTubeService


def test_source_address_is_always_ipv6_and_no_provider_means_no_extractor_args(monkeypatch):
    monkeypatch.setattr(settings, "pot_provider_url", None)
    assert ytdlp_network_opts() == {"source_address": "::"}


def test_pot_provider_url_is_passed_to_the_bgutil_plugin(monkeypatch):
    monkeypatch.setattr(settings, "pot_provider_url", "http://bgutil:4416")
    opts = ytdlp_network_opts()
    assert opts["source_address"] == "::"
    assert opts["extractor_args"] == {"youtubepot-bgutilhttp": {"base_url": ["http://bgutil:4416"]}}


def test_info_lookups_use_the_shared_network_options(monkeypatch):
    monkeypatch.setattr(settings, "pot_provider_url", "http://bgutil:4416")
    assert YouTubeService().ydl_opts_info["extractor_args"]["youtubepot-bgutilhttp"]["base_url"] == ["http://bgutil:4416"]
