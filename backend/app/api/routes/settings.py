from fastapi import APIRouter

from app.core.config import settings
from app.schemas.base import CamelModel

router = APIRouter(prefix="/api/v1", tags=["settings"])


class AppSettings(CamelModel):
    force_ipv6: bool


@router.get("/settings", response_model=AppSettings)
async def get_settings() -> AppSettings:
    return AppSettings(force_ipv6=settings.force_ipv6)


@router.put("/settings", response_model=AppSettings)
async def update_settings(body: AppSettings) -> AppSettings:
    # ponytail: in-memory, resets to the FORCE_IPV6 default on restart; persist in Redis if that annoys
    settings.force_ipv6 = body.force_ipv6
    return body
