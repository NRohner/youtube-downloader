from fastapi.testclient import TestClient
from app.core.config import settings
from app.main import app

client = TestClient(app)


def test_get_returns_current_value(monkeypatch):
    monkeypatch.setattr(settings, "force_ipv6", True)
    assert client.get("/api/v1/settings").json() == {"forceIpv6": True}


def test_put_changes_the_setting(monkeypatch):
    monkeypatch.setattr(settings, "force_ipv6", True)
    r = client.put("/api/v1/settings", json={"forceIpv6": False})
    assert r.json() == {"forceIpv6": False}
    assert settings.force_ipv6 is False
