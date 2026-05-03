from __future__ import annotations

from typing import Protocol

from api.services.optimization.core.contracts import CropInput, NPKRate, SoilInput, YieldResult


class YAttProvider(Protocol):
    def get_y_attainable_kg_ha(self, crop: str) -> float:
        """Return attainable yield in dry kg/ha."""


class YieldModel(Protocol):
    def evaluate_batch(
        self,
        crop: CropInput,
        soil: SoilInput,
        npk_rates: tuple[NPKRate, ...],
    ) -> tuple[YieldResult, ...]:
        """Return one yield result per NPK application rate."""
