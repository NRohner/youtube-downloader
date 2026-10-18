from app.core.config import settings


def ytdlp_network_opts() -> dict:
    """Network options shared by every yt-dlp call (info, playlist, download)"""
    opts = {
        'source_address': '::',  # IPv6 only: the IPv4 address is rate-limited by YouTube
    }
    if settings.pot_provider_url:
        # PO token sidecar (bgutil): tokens help get past YouTube's "confirm you're not a bot" wall
        opts['extractor_args'] = {'youtubepot-bgutilhttp': {'base_url': [settings.pot_provider_url]}}
    return opts
