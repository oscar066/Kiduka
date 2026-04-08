from __future__ import annotations

from dataclasses import dataclass

ACRE_TO_HECTARE = 0.405
P2O5_TO_P = 0.437
K2O_TO_K = 0.83

SUPPORTED_CROPS = (
    "Maize HP >3t",
    "Maize LP <3t",
    "Sorghum",
    "Finger millet",
    "Bean",
    "Groundnuts, unshelled",
)

SEGMENT_GRIDS = {
    "N": (0.0, 30.0, 60.0, 90.0, 120.0),
    "P": (0.0, 5.0, 10.0, 15.0, 20.0),
    "K": (0.0, 5.0, 10.0, 15.0, 20.0),
}

@dataclass(frozen=True)
class NutrientResponse:
    nutrient: str
    a: float
    b: float
    c: float

    @property
    def grid(self) -> tuple[float, ...]:
        return SEGMENT_GRIDS[self.nutrient]

# Source: Kenya chapter Table 7.2f in "Fertilizer Use Optimization in Sub-Saharan Africa"
WESTERN_LOWER_RESPONSES: dict[str, dict[str, NutrientResponse]] = {
    "Maize HP >3t": {
        "N": NutrientResponse("N", 4.672, 2.224, 0.970),
        "P": NutrientResponse("P", 4.310, 0.848, 0.940),
        "K": NutrientResponse("K", 3.878, 0.209, 0.934),
    },
    "Maize LP <3t": {
        "N": NutrientResponse("N", 2.170, 0.970, 0.959),
        "P": NutrientResponse("P", 2.624, 0.744, 0.940),
        "K": NutrientResponse("K", 3.878, 0.209, 0.934),
    },
    "Sorghum": {
        "N": NutrientResponse("N", 2.220, 1.281, 0.870),
        "P": NutrientResponse("P", 2.272, 1.072, 0.750),
    },
    "Finger millet": {
        "N": NutrientResponse("N", 1.691, 0.969, 0.957),
        "P": NutrientResponse("P", 1.776, 0.221, 0.800),
    },
    "Bean": {
        "N": NutrientResponse("N", 1.082, 0.331, 0.885),
        "P": NutrientResponse("P", 0.730, 0.180, 0.840),
        "K": NutrientResponse("K", 2.117, 0.264, 0.889),
    },
    "Groundnuts, unshelled": {
        "P": NutrientResponse("P", 1.230, 0.288, 0.904),
        "K": NutrientResponse("K", 1.391, 0.151, 0.890),
    },
}

def nutrient_order_for_crop(crop: str) -> tuple[str, ...]:
    return tuple(WESTERN_LOWER_RESPONSES[crop].keys())

def segment_gains_kg_per_ha(crop: str, nutrient: str) -> list[float]:
    response = WESTERN_LOWER_RESPONSES[crop][nutrient]
    gains: list[float] = []
    for start, end in zip(response.grid[:-1], response.grid[1:]):
        gain_t_per_ha = response.b * ((response.c ** start) - (response.c ** end))
        gains.append(gain_t_per_ha * 1000.0)
    return gains
