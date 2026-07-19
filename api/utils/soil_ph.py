"""
Regional soil pH defaults, sourced from a static Kenya-wide soil survey dataset.

Used as a fallback when a user has no lab-tested soil pH: the surveyed
polygon covering (or nearest to) their location supplies a default value.
"""
from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path
from typing import Optional

import pandas as pd
from shapely import wkt
from shapely.geometry import Point
from shapely.geometry.base import BaseGeometry

logger = logging.getLogger(__name__)

DEFAULT_SOIL_PH_CSV = Path(__file__).resolve().parent.parent / "data" / "ken_soil_ph.csv"


class SoilPhLocator:
    """Looks up a default soil pH (PHAQ, pH in water) for a lat/lon point."""

    def __init__(self, csv_path: Path | str = DEFAULT_SOIL_PH_CSV) -> None:
        self.csv_path = Path(csv_path)
        self._regions: list[tuple[BaseGeometry, tuple[float, float, float, float], float]] = []
        self._load()

    def _load(self) -> None:
        if not self.csv_path.exists():
            logger.error(f"Soil pH dataset not found at {self.csv_path}")
            return

        df = pd.read_csv(self.csv_path)
        skipped_no_data = 0
        for _, row in df.iterrows():
            try:
                geom = wkt.loads(row["the_geom"])
                phaq = float(row["PHAQ"])
            except (TypeError, ValueError, KeyError) as e:
                logger.warning(f"Skipping malformed soil pH row: {e}")
                continue
            # PHAQ/PHKC are recorded as 0 for unsurveyed polygons in this dataset
            # (soil pH of 0 is not physically plausible) — treat as missing data.
            if phaq <= 0:
                skipped_no_data += 1
                continue
            self._regions.append((geom, geom.bounds, phaq))

        if skipped_no_data:
            logger.info(f"Skipped {skipped_no_data} soil pH regions with no surveyed data (PHAQ<=0)")

        logger.info(f"Loaded {len(self._regions)} soil pH regions from {self.csv_path}")

    def get_exact_ph(self, latitude: float, longitude: float) -> Optional[float]:
        """Return the surveyed PHAQ for the region containing (lat, lon) exactly.

        Returns None if the point does not fall inside any surveyed polygon
        (no nearest-region fallback) — use this for UI suggestions, where a
        value from a potentially distant region would be misleading.
        """
        point = Point(longitude, latitude)
        for geom, (minx, miny, maxx, maxy), phaq in self._regions:
            if minx <= point.x <= maxx and miny <= point.y <= maxy and geom.contains(point):
                return phaq
        return None

    def get_default_ph(self, latitude: float, longitude: float) -> Optional[float]:
        """Return the surveyed PHAQ for the region containing (lat, lon).

        Falls back to the PHAQ of the nearest region's centroid if no region
        contains the point exactly (e.g. small gaps between survey polygons).
        Returns None only if the dataset failed to load.
        """
        if not self._regions:
            return None

        exact = self.get_exact_ph(latitude, longitude)
        if exact is not None:
            return exact

        point = Point(longitude, latitude)
        nearest_phaq = min(
            self._regions,
            key=lambda region: region[0].centroid.distance(point),
        )[2]
        return nearest_phaq


@lru_cache(maxsize=1)
def get_soil_ph_locator() -> SoilPhLocator:
    return SoilPhLocator()
