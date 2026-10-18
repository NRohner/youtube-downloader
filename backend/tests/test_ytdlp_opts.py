from app.core.config import settings
from app.core.ytdlp import ytdlp_network_opts
from app.services.youtube_service import YouTubeService


def test_source_address_is_ipv6_when_forced_and_no_provider_means_no_extractor_args(monkeypatch):
    monkeypatch.setattr(settings, "pot_provider_url", None)
    monkeypatch.setattr(settings, "force_ipv6", True)
    assert ytdlp_network_opts() == {"source_address": "::"}


def test_pot_provider_url_is_passed_to_the_bgutil_plugin(monkeypatch):
    monkeypatch.setattr(settings, "pot_provider_url", "http://bgutil:4416")
    monkeypatch.setattr(settings, "force_ipv6", True)
    opts = ytdlp_network_opts()
    assert opts["source_address"] == "::"
    assert opts["extractor_args"] == {"youtubepot-bgutilhttp": {"base_url": ["http://bgutil:4416"]}}


def test_info_lookups_use_the_shared_network_options(monkeypatch):
    monkeypatch.setattr(settings, "pot_provider_url", "http://bgutil:4416")
    assert YouTubeService().ydl_opts_info["extractor_args"]["youtubepot-bgutilhttp"]["base_url"] == ["http://bgutil:4416"]


def test_no_source_address_when_ipv6_is_not_forced(monkeypatch):
    monkeypatch.setattr(settings, "pot_provider_url", None)
    monkeypatch.setattr(settings, "force_ipv6", False)
    assert ytdlp_network_opts() == {}


def test_info_lookups_follow_the_setting_without_a_new_service(monkeypatch):
    service = YouTubeService()
    monkeypatch.setattr(settings, "force_ipv6", True)
    assert service.ydl_opts_info["source_address"] == "::"
    monkeypatch.setattr(settings, "force_ipv6", False)
    assert "source_address" not in service.ydl_opts_info
