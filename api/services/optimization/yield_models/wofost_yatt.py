from __future__ import annotations

import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any

from api.services.optimization.core.contracts import GeoLocation
from api.services.optimization.core.crop_mappings import resolve_busia_crop
from api.services.optimization.yield_models.base import YAttProvider


class WofostYAttProvider:
    """Point-level WOFOST water-limited yield provider.

    The external WOFOST service returns kg/ha. This provider keeps WOFOST
    optional and configurable so KEPHIS remains the default production path.
    """

    def __init__(
        self,
        location: GeoLocation,
        sowing_date: str = "2024-03-15",
        elevation_m: float | None = None,
        service_root: Path | str | None = None,
        service_func: Callable[..., Any] | None = None,
        fallback_provider: YAttProvider | None = None,
    ) -> None:
        self.location = location
        self.sowing_date = sowing_date
        self.elevation_m = elevation_m
        self.service_root = Path(service_root) if service_root is not None else None
        self._service_func = service_func
        self.fallback_provider = fallback_provider

    def get_y_attainable_kg_ha(self, crop: str) -> float:
        mapping = resolve_busia_crop(crop)
        if mapping.wofost_crop is None:
            if self.fallback_provider is None:
                raise ValueError(
                    f"WOFOST Y_att is not available for {mapping.display_name}; "
                    "configure a fallback provider or use KEPHIS."
                )
            return self.fallback_provider.get_y_attainable_kg_ha(crop)

        service_func = self._service_func or self._import_service_func()
        result = service_func(
            lat=self.location.lat,
            lon=self.location.lon,
            crop=mapping.wofost_crop,
            sowing_date=self.sowing_date,
            elevation_m=self.elevation_m,
        )
        value = getattr(result, "water_limited_yield_kg_ha", None)
        if value is None and isinstance(result, dict):
            value = result.get("water_limited_yield_kg_ha")
        if value is None:
            raise RuntimeError("WOFOST service did not return water_limited_yield_kg_ha.")
        return float(value)

    def _import_service_func(self) -> Callable[..., Any]:
        if self.service_root is not None:
            service_path = str(self.service_root)
            if service_path not in sys.path:
                sys.path.insert(0, service_path)
            try:
                from wofost_service import get_water_limited_yield
            except ModuleNotFoundError as exc:
                raise RuntimeError(
                    "WOFOST source selected but external wofost_service is not importable "
                    "from the configured service_root."
                ) from exc
            return get_water_limited_yield

        from api.services.optimization.yield_models.wofost_service import get_water_limited_yield

        return get_water_limited_yield
