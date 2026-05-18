from __future__ import annotations

import csv
from functools import lru_cache
from pathlib import Path

from api.services.optimization.core.crop_mappings import resolve_busia_crop


DEFAULT_ATTAINABLE_CSV = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "kephis_attainable_dry_yield.csv"
)

YIELD_BASIS_TO_COLUMN = {
    "average_median": "average_median_dry_yield_t_ha",
    "median": "average_median_dry_yield_t_ha",
    "mean": "average_median_dry_yield_t_ha",
    "average_lower": "average_lower_dry_yield_t_ha",
    "lower": "average_lower_dry_yield_t_ha",
}


class KephisYAttProvider:
    """Lookup KEPHIS attainable-yield average values.

    The source CSV stores target market-product dry t/ha. This provider returns
    target market-product dry kg/ha. By default QUEFTS receives the conservative
    `average_lower_dry_yield_t_ha` column.
    """

    def __init__(
        self,
        attainable_csv: Path | str = DEFAULT_ATTAINABLE_CSV,
        yield_basis: str = "average_lower",
    ) -> None:
        self.attainable_csv = Path(attainable_csv)
        self.yield_basis = yield_basis

    @lru_cache(maxsize=1)
    def _table(self) -> dict[str, dict[str, str]]:
        if not self.attainable_csv.exists():
            raise FileNotFoundError(f"Missing KEPHIS attainable-yield CSV: {self.attainable_csv}")
        table: dict[str, dict[str, str]] = {}
        with self.attainable_csv.open(newline="", encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                table[row["crop"]] = row
        return table

    def get_y_attainable_kg_ha(self, crop: str) -> float:
        mapping = resolve_busia_crop(crop)
        table = self._table()
        if mapping.kephis_crop not in table:
            raise ValueError(f"No KEPHIS attainable-yield row for crop '{mapping.kephis_crop}'.")

        basis_key = self.yield_basis.strip().lower().replace(" ", "_")
        if basis_key not in YIELD_BASIS_TO_COLUMN:
            supported = ", ".join(sorted(YIELD_BASIS_TO_COLUMN))
            raise ValueError(f"Unsupported KEPHIS yield_basis '{self.yield_basis}'. Supported: {supported}")

        return float(table[mapping.kephis_crop][YIELD_BASIS_TO_COLUMN[basis_key]]) * 1000.0

    def get_moisture_content(self, crop: str) -> float:
        mapping = resolve_busia_crop(crop)
        table = self._table()
        if mapping.kephis_crop not in table:
            raise ValueError(f"No KEPHIS attainable-yield row for crop '{mapping.kephis_crop}'.")
        return float(table[mapping.kephis_crop]["moisture_content"])
