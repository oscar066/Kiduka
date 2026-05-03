from __future__ import annotations

from pathlib import Path

from api.services.optimization.core.contracts import GeoLocation, YAttConfig, YAttSource
from api.services.optimization.yield_models.base import YAttProvider
from api.services.optimization.yield_models.kephis_yatt import KephisYAttProvider
from api.services.optimization.yield_models.wofost_yatt import WofostYAttProvider


def build_yatt_provider(config: YAttConfig | None = None) -> YAttProvider:
    resolved = config or YAttConfig()
    source = YAttSource(resolved.source)
    if source == YAttSource.KEPHIS:
        return KephisYAttProvider(quantile=resolved.kephis_quantile)
    if source == YAttSource.WOFOST:
        if resolved.location is None:
            raise ValueError("WOFOST Y_att source requires a GeoLocation.")
        fallback_provider = (
            KephisYAttProvider(quantile=resolved.kephis_quantile)
            if resolved.wofost_fallback_to_kephis
            else None
        )
        return WofostYAttProvider(
            location=resolved.location,
            sowing_date=resolved.wofost_sowing_date,
            elevation_m=resolved.wofost_elevation_m,
            service_root=resolved.wofost_service_root,
            fallback_provider=fallback_provider,
        )
    raise ValueError(f"Unsupported Y_att source: {resolved.source}")


def default_kephis_yatt_config() -> YAttConfig:
    return YAttConfig(source=YAttSource.KEPHIS, kephis_quantile=0.01)


def wofost_yatt_config(
    lat: float,
    lon: float,
    *,
    sowing_date: str = "2024-03-15",
    elevation_m: float | None = None,
    service_root: Path | str | None = None,
    fallback_to_kephis: bool = True,
) -> YAttConfig:
    return YAttConfig(
        source=YAttSource.WOFOST,
        location=GeoLocation(lat=lat, lon=lon),
        wofost_sowing_date=sowing_date,
        wofost_elevation_m=elevation_m,
        wofost_service_root=Path(service_root) if service_root is not None else None,
        wofost_fallback_to_kephis=fallback_to_kephis,
    )
