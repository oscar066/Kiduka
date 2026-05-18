from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class CropMapping:
    display_name: str
    kephis_crop: str
    rquefts_crop: str
    wofost_crop: str | None
    aliases: tuple[str, ...]


BUSIA_CROP_MAPPINGS: tuple[CropMapping, ...] = (
    CropMapping("Sesame (Sim sim)", "simsim", "Sesame", None, ("sesame", "sim sim", "simsim")),
    CropMapping("Soybeans", "soybean", "Soyabean", "soybean", ("soybean", "soybeans", "soya bean", "soya beans")),
    CropMapping("Sunflower", "sunflower", "Sunflower", "sunflower", ("sunflower",)),
    CropMapping("Groundnuts", "groundnut", "Groundnut", "groundnut", ("groundnut", "groundnuts")),
    CropMapping("Cotton", "cotton", "Cotton", "cotton", ("cotton", "bt cotton")),
    CropMapping("Cassava", "cassava", "Cassava", "cassava", ("cassava",)),
    CropMapping("Maize", "maize", "Maize", "maize", ("maize",)),
    CropMapping("Beans", "common_bean", "Field bean", None, ("bean", "beans", "common bean", "common beans")),
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
