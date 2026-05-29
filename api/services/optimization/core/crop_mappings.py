from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class CropMapping:
    display_name: str
    kephis_crop: str
    rquefts_crop: str
    rquefts_leaf_ratio: float
    rquefts_stem_ratio: float
    wofost_crop: str | None
    aliases: tuple[str, ...]


# RQUEFTS batch expects leaf and stem dry biomass relative to storage-organ dry
# biomass. Maize follows the RQUEFTS documented example; other WOFOST-supported
# crops use median final TWLV/TWSO and TWST/TWSO from the Busia WOFOST cache.
# Sesame is not available in the local WOFOST crop config and uses a literature
# dry-matter partitioning fallback.
BUSIA_CROP_MAPPINGS: tuple[CropMapping, ...] = (
    CropMapping(
        "Sesame (Sim sim)",
        "simsim",
        "Sesame",
        0.2167,
        0.4500,
        None,
        ("sesame", "sim sim", "simsim"),
    ),
    CropMapping(
        "Soybeans",
        "soybean",
        "Soyabean",
        1.0882,
        0.5400,
        "soybean",
        ("soybean", "soybeans", "soya bean", "soya beans"),
    ),
    CropMapping(
        "Sunflower",
        "sunflower",
        "Sunflower",
        0.1882,
        0.5154,
        "sunflower",
        ("sunflower",),
    ),
    CropMapping(
        "Groundnuts",
        "groundnut",
        "Groundnut",
        0.9075,
        1.1999,
        "groundnut",
        ("groundnut", "groundnuts"),
    ),
    CropMapping(
        "Cotton",
        "cotton",
        "Cotton",
        0.5435,
        0.6112,
        "cotton",
        ("cotton", "bt cotton"),
    ),
    CropMapping(
        "Cassava",
        "cassava",
        "Cassava",
        1.4492,
        1.2412,
        "cassava",
        ("cassava",),
    ),
    CropMapping(
        "Maize",
        "maize",
        "Maize",
        0.4600,
        0.5600,
        "maize",
        ("maize",),
    ),
    CropMapping(
        "Beans",
        "common_bean",
        "Field bean",
        0.1152,
        0.2866,
        None,
        ("bean", "beans", "common bean", "common beans"),
    ),
)


def normalize_crop_token(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.strip().lower()).strip()


def _alias_lookup() -> dict[str, CropMapping]:
    lookup: dict[str, CropMapping] = {}
    for mapping in BUSIA_CROP_MAPPINGS:
        lookup[normalize_crop_token(mapping.display_name)] = mapping
        lookup[normalize_crop_token(mapping.kephis_crop.replace("_", " "))] = mapping
        lookup[normalize_crop_token(mapping.rquefts_crop)] = mapping
        for alias in mapping.aliases:
            lookup[normalize_crop_token(alias)] = mapping
    return lookup


def resolve_busia_crop(crop: str) -> CropMapping:
    key = normalize_crop_token(crop)
    lookup = _alias_lookup()
    if key not in lookup:
        supported = ", ".join(mapping.display_name for mapping in BUSIA_CROP_MAPPINGS)
        raise ValueError(f"Unsupported Busia crop '{crop}'. Supported crops: {supported}")
    return lookup[key]


def supported_busia_crop_names() -> tuple[str, ...]:
    return tuple(mapping.display_name for mapping in BUSIA_CROP_MAPPINGS)
