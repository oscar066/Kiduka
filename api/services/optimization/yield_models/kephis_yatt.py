from __future__ import annotations

import csv
import math
from functools import lru_cache
from pathlib import Path

from api.services.optimization.core.crop_mappings import resolve_busia_crop


DEFAULT_QUANTILES_CSV = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "kephis_yatt_quantiles_busia.csv"
)


def _quantile_column(index: int) -> str:
    return f"q_{index // 100}_{index % 100:02d}"


class KephisYAttProvider:
    """Lookup Busia KEPHIS attainable-yield proxy values.

    The source CSV stores dry t/ha. This provider returns dry kg/ha.
    """

    def __init__(
        self,
        quantiles_csv: Path | str = DEFAULT_QUANTILES_CSV,
        quantile: float = 0.01,
    ) -> None:
        self.quantiles_csv = Path(quantiles_csv)
        self.quantile = float(quantile)

    @lru_cache(maxsize=1)
    def _table(self) -> dict[str, dict[str, float]]:
        if not self.quantiles_csv.exists():
            raise FileNotFoundError(f"Missing KEPHIS Y_att CSV: {self.quantiles_csv}")
        table: dict[str, dict[str, float]] = {}
        with self.quantiles_csv.open(newline="", encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                crop = row["crop"]
                table[crop] = {
                    key: float(value)
                    for key, value in row.items()
                    if key.startswith("q_")
                }
        return table

    def get_y_attainable_kg_ha(self, crop: str) -> float:
        q = float(self.quantile)
        if not 0.0 <= q <= 1.0:
            raise ValueError("KEPHIS quantile must be in [0, 1].")

        mapping = resolve_busia_crop(crop)
        table = self._table()
        if mapping.kephis_crop not in table:
            raise ValueError(f"No KEPHIS Y_att row for crop '{mapping.kephis_crop}'.")

        scaled = q * 100.0
        lower_index = max(0, min(100, int(math.floor(scaled + 1e-12))))
        upper_index = max(0, min(100, int(math.ceil(scaled - 1e-12))))
        lower_t_ha = table[mapping.kephis_crop][_quantile_column(lower_index)]
        upper_t_ha = table[mapping.kephis_crop][_quantile_column(upper_index)]
        if lower_index == upper_index:
            return lower_t_ha * 1000.0

        weight = scaled - lower_index
        interpolated_t_ha = lower_t_ha + (upper_t_ha - lower_t_ha) * weight
        return interpolated_t_ha * 1000.0
