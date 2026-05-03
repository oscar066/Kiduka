from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


DEFAULT_BUSIA_LAT = 0.460
DEFAULT_BUSIA_LON = 34.120
DEFAULT_BUSIA_ELEVATION_M = 1220.0
DEFAULT_BUSIA_SOWING_DATE = "2024-03-15"
DEFAULT_MAX_DURATION_DAYS = 180
DEFAULT_WEATHER_SOURCE = "NASA_POWER"
DEFAULT_CACHE_DIR = Path(os.environ.get("KIDUKA_WOFOST_CACHE_DIR", "/tmp/kiduka_wofost_cache"))


DEFAULT_CROP_MAPPING = {
    "maize": {"crop_name": "maize", "variety_name": "Grain_maize_201"},
    "soybean": {"crop_name": "soybean", "variety_name": "Soybean_VanHeemst_1988"},
    "soybeans": {"crop_name": "soybean", "variety_name": "Soybean_VanHeemst_1988"},
    "sunflower": {"crop_name": "sunflower", "variety_name": "Sunflower_1101"},
    "groundnut": {"crop_name": "groundnut", "variety_name": "Groundnut_VanHeemst_1988"},
    "groundnuts": {"crop_name": "groundnut", "variety_name": "Groundnut_VanHeemst_1988"},
    "cotton": {"crop_name": "cotton", "variety_name": "Cotton_VanHeemst_1988"},
    "cassava": {"crop_name": "cassava", "variety_name": "Cassava_VanHeemst_1988"},
}

UNSUPPORTED_CROP_NOTES = {
    "bean": "WOFOST crop parameters include fababean/cowpea/chickpea/mungbean/pigeonpea, but not common bean.",
    "beans": "WOFOST crop parameters include fababean/cowpea/chickpea/mungbean/pigeonpea, but not common bean.",
    "common bean": "WOFOST crop parameters include fababean/cowpea/chickpea/mungbean/pigeonpea, but not common bean.",
    "sesame": "WOFOST crop parameters do not include sesame.",
    "simsim": "WOFOST crop parameters do not include sesame/sim sim.",
    "sim sim": "WOFOST crop parameters do not include sesame/sim sim.",
}


@dataclass(frozen=True)
class WofostYieldRequest:
    lat: float
    lon: float
    crop: str
    sowing_date: str
    elevation_m: float
    weather_source: str = DEFAULT_WEATHER_SOURCE
    campaign_start: str | None = None
    max_duration: int = DEFAULT_MAX_DURATION_DAYS
    initial_water_cm: float | None = None
    force: bool = False


@dataclass(frozen=True)
class WofostYieldResult:
    request: WofostYieldRequest
    cache_key: str
    cache_hit: bool
    water_limited_yield_kg_ha: float
    water_limited_yield_t_ha: float
    maturity_date: str | None
    emergence_date: str | None
    anthesis_date: str | None
    aboveground_biomass_kg_ha: float | None
    crop_name: str
    variety_name: str
    soil_source: str
    weather: dict[str, Any]
    output_dir: str
    summary_path: str


def get_water_limited_yield(
    lat: float = DEFAULT_BUSIA_LAT,
    lon: float = DEFAULT_BUSIA_LON,
    crop: str = "maize",
    sowing_date: str | dt.date = DEFAULT_BUSIA_SOWING_DATE,
    elevation_m: float | None = None,
    weather_source: str = DEFAULT_WEATHER_SOURCE,
    *,
    cache_dir: Path = DEFAULT_CACHE_DIR,
    force: bool = False,
    campaign_start: str | dt.date | None = None,
    max_duration: int = DEFAULT_MAX_DURATION_DAYS,
    initial_water_cm: float | None = None,
) -> WofostYieldResult:
    """Return point-level WOFOST water-limited attainable yield in kg/ha.

    This bundled Kiduka service uses PCSE's generic soil provider. It is a
    stable in-repo WOFOST path for the optimization module; more detailed soil
    providers can be added behind this same function contract.
    """

    normalized_sowing = _normalize_date(sowing_date)
    normalized_campaign = None if campaign_start is None else _normalize_date(campaign_start)
    request = WofostYieldRequest(
        lat=float(lat),
        lon=float(lon),
        crop=crop,
        sowing_date=normalized_sowing,
        elevation_m=float(DEFAULT_BUSIA_ELEVATION_M if elevation_m is None else elevation_m),
        weather_source=weather_source,
        campaign_start=normalized_campaign,
        max_duration=int(max_duration),
        initial_water_cm=initial_water_cm,
        force=force,
    )
    cache_key = _cache_key(request)
    output_dir = cache_dir / _namespace_from_request(request, cache_key)
    summary_path = output_dir / "summary.json"

    if summary_path.exists() and not force:
        summary = json.loads(summary_path.read_text())
        return _to_result(
            request=request,
            cache_key=cache_key,
            cache_hit=True,
            summary=summary,
            output_dir=output_dir,
            summary_path=summary_path,
        )

    summary = _run_wofost(request=request, output_dir=output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(_normalize_for_json(summary), indent=2) + "\n")
    return _to_result(
        request=request,
        cache_key=cache_key,
        cache_hit=False,
        summary=summary,
        output_dir=output_dir,
        summary_path=summary_path,
    )


def _run_wofost(request: WofostYieldRequest, output_dir: Path) -> dict[str, Any]:
    if request.weather_source != DEFAULT_WEATHER_SOURCE:
        raise ValueError(f"Unsupported weather_source '{request.weather_source}'. Supported: {DEFAULT_WEATHER_SOURCE}.")

    pcse = _load_pcse(cache_dir=output_dir.parent)
    crop_spec = _crop_to_pcse(request.crop)
    output_dir.mkdir(parents=True, exist_ok=True)

    campaign_start = (
        dt.date.fromisoformat(request.campaign_start)
        if request.campaign_start is not None
        else _default_campaign_start(request.sowing_date)
    )
    sowing_date = dt.date.fromisoformat(request.sowing_date)
    agromanagement_path = output_dir / "agromanagement.agro"
    _write_agromanagement(
        agromanagement_path,
        campaign_start=campaign_start,
        sowing_date=sowing_date,
        crop_name=crop_spec["crop_name"],
        variety_name=crop_spec["variety_name"],
        max_duration=request.max_duration,
    )

    cropdata = pcse["YAMLCropDataProvider"](pcse["Wofost72_WLP_CWB"], force_reload=False)
    _validate_pcse_crop(cropdata, crop_spec)
    soildata = dict(pcse["DummySoilDataProvider"]())
    initial_water_cm = request.initial_water_cm if request.initial_water_cm is not None else 10.0
    sitedata = dict(pcse["WOFOST72SiteDataProvider"](WAV=initial_water_cm, SMLIM=soildata["SMFCF"]))
    parameters = pcse["ParameterProvider"](cropdata=cropdata, soildata=soildata, sitedata=sitedata)

    weather_start, weather_end = _weather_window(campaign_start, request.max_duration)
    weather = pcse["BoundedNASAPowerWeatherDataProvider"](
        request.lat,
        request.lon,
        weather_start,
        weather_end,
        force_update=False,
    )
    agromanagement = pcse["YAMLAgroManagementReader"](agromanagement_path)

    model = pcse["Wofost72_WLP_CWB"](parameters, weather, agromanagement)
    model.run_till_terminate()
    summary_output = model.get_summary_output()
    if not summary_output:
        raise RuntimeError("WOFOST finished without summary output.")
    summary = summary_output[0]
    water_limited_yield_kg_ha = summary.get("TWSO")
    if water_limited_yield_kg_ha is None:
        raise RuntimeError("WOFOST summary is missing TWSO storage-organ yield.")

    return {
        "model": "Wofost72_WLP_CWB",
        "production_level": "water-limited",
        "water_balance": "classic",
        "location": {
            "latitude": request.lat,
            "longitude": request.lon,
            "elevation_m": request.elevation_m,
            "weather_provider_elevation_m": getattr(weather, "elevation", None),
        },
        "crop": {
            "requested_crop": request.crop,
            "crop_name": crop_spec["crop_name"],
            "variety_name": crop_spec["variety_name"],
            "campaign_start": campaign_start,
            "sowing_date": sowing_date,
            "max_duration_days": request.max_duration,
        },
        "weather": {
            "source": "NASA POWER Daily API via bounded PCSE provider",
            "start": getattr(weather, "first_date", None),
            "end": getattr(weather, "last_date", None),
            "missing_days": getattr(weather, "missing", None),
        },
        "soil_metadata": {
            "soil_source": "pcse-default",
            "initial_water_source": "argument" if request.initial_water_cm is not None else "default-WAV-10cm",
            "SMLIM_source": "DummySoilDataProvider.SMFCF",
        },
        "summary": summary,
        "grain_yield_storage_organs_kg_ha": float(water_limited_yield_kg_ha),
        "grain_yield_storage_organs_t_ha": float(water_limited_yield_kg_ha) / 1000.0,
        "aboveground_biomass_kg_ha": summary.get("TAGP"),
        "outputs": {"agromanagement": str(agromanagement_path)},
    }


def _load_pcse(cache_dir: Path) -> dict[str, Any]:
    pcse_home = Path(os.environ.get("KIDUKA_PCSE_HOME", str(cache_dir / "pcse_home")))
    os.environ.setdefault("HOME", str(pcse_home))
    pcse_home.mkdir(parents=True, exist_ok=True)

    try:
        import requests
        from pcse.base import ParameterProvider
        from pcse.exceptions import PCSEError
        from pcse.input import (
            DummySoilDataProvider,
            NASAPowerWeatherDataProvider,
            WOFOST72SiteDataProvider,
            YAMLCropDataProvider,
        )
        from pcse.input.yaml_agro_loader import YAMLAgroManagementReader
        from pcse.models import Wofost72_WLP_CWB
        from pcse.settings import settings
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "WOFOST source requires the PCSE runtime. Install the optimization WOFOST dependencies "
            "from api/requirements.txt before selecting YAttSource.WOFOST."
        ) from exc

    class BoundedNASAPowerWeatherDataProvider(NASAPowerWeatherDataProvider):
        def __init__(
            self,
            latitude: float,
            longitude: float,
            start_date: dt.date,
            end_date: dt.date,
            *,
            force_update: bool = False,
            et_model: str = "PM",
            time_standard: str = "LST",
        ) -> None:
            self._start_date = start_date
            self._end_date = end_date
            self._time_standard = time_standard
            super().__init__(latitude, longitude, force_update=force_update, ETmodel=et_model)

        def _query_NASAPower_server(self, latitude: float, longitude: float) -> dict[str, Any]:
            response = requests.get(
                "https://power.larc.nasa.gov/api/temporal/daily/point",
                params={
                    "request": "execute",
                    "parameters": ",".join(self.power_variables),
                    "latitude": latitude,
                    "longitude": longitude,
                    "start": self._start_date.strftime("%Y%m%d"),
                    "end": self._end_date.strftime("%Y%m%d"),
                    "community": "AG",
                    "format": "JSON",
                    "time-standard": self._time_standard,
                },
                timeout=90,
            )
            if response.status_code != self.HTTP_OK:
                raise PCSEError(
                    "Failed retrieving POWER data, server returned HTTP "
                    f"{response.status_code}: {response.text[:500]}"
                )
            return response.json()

        def _get_cache_filename(self, latitude: float, longitude: float) -> str:
            fname = (
                f"{self.__class__.__name__}_LAT{latitude:.4f}_"
                f"LON{longitude:.4f}_{self._start_date:%Y%m%d}_{self._end_date:%Y%m%d}.cache"
            )
            return os.path.join(settings.METEO_CACHE_DIR, fname)

    return {
        "BoundedNASAPowerWeatherDataProvider": BoundedNASAPowerWeatherDataProvider,
        "DummySoilDataProvider": DummySoilDataProvider,
        "ParameterProvider": ParameterProvider,
        "WOFOST72SiteDataProvider": WOFOST72SiteDataProvider,
        "Wofost72_WLP_CWB": Wofost72_WLP_CWB,
        "YAMLCropDataProvider": YAMLCropDataProvider,
        "YAMLAgroManagementReader": YAMLAgroManagementReader,
    }


def _crop_to_pcse(crop: str) -> dict[str, str]:
    key = crop.strip().lower()
    if key not in DEFAULT_CROP_MAPPING:
        note = UNSUPPORTED_CROP_NOTES.get(key)
        detail = f" {note}" if note else ""
        supported = ", ".join(sorted(DEFAULT_CROP_MAPPING))
        raise ValueError(f"Unsupported crop '{crop}'.{detail} Supported WOFOST crops here: {supported}.")
    return DEFAULT_CROP_MAPPING[key]


def _validate_pcse_crop(cropdata: Any, crop_spec: dict[str, str]) -> None:
    available = cropdata.get_crops_varieties()
    crop_name = crop_spec["crop_name"]
    variety_name = crop_spec["variety_name"]
    if crop_name not in available:
        raise ValueError(f"Crop '{crop_name}' is not available in PCSE WOFOST crop parameters.")
    if variety_name not in available[crop_name]:
        raise ValueError(f"Variety '{variety_name}' is not available for PCSE crop '{crop_name}'.")


def _to_result(
    *,
    request: WofostYieldRequest,
    cache_key: str,
    cache_hit: bool,
    summary: dict[str, Any],
    output_dir: Path,
    summary_path: Path,
) -> WofostYieldResult:
    soil_metadata = summary.get("soil_metadata") or {}
    crop = summary["crop"]
    return WofostYieldResult(
        request=request,
        cache_key=cache_key,
        cache_hit=cache_hit,
        water_limited_yield_kg_ha=float(summary["grain_yield_storage_organs_kg_ha"]),
        water_limited_yield_t_ha=float(summary["grain_yield_storage_organs_t_ha"]),
        maturity_date=summary["summary"].get("DOM"),
        emergence_date=summary["summary"].get("DOE"),
        anthesis_date=summary["summary"].get("DOA"),
        aboveground_biomass_kg_ha=summary.get("aboveground_biomass_kg_ha"),
        crop_name=crop["crop_name"],
        variety_name=crop["variety_name"],
        soil_source=soil_metadata.get("soil_source", "unknown"),
        weather=summary.get("weather") or {},
        output_dir=str(output_dir.resolve()),
        summary_path=str(summary_path.resolve()),
    )


def _normalize_date(value: str | dt.date) -> str:
    if isinstance(value, dt.date):
        return value.isoformat()
    return dt.date.fromisoformat(value).isoformat()


def _default_campaign_start(sowing_date: str) -> dt.date:
    date = dt.date.fromisoformat(sowing_date)
    return date - dt.timedelta(days=7)


def _weather_window(campaign_start: dt.date, max_duration: int) -> tuple[dt.date, dt.date]:
    sim_end = campaign_start + dt.timedelta(days=max_duration + 30)
    return dt.date(campaign_start.year, 1, 1), dt.date(sim_end.year, 12, 31)


def _write_agromanagement(
    path: Path,
    *,
    campaign_start: dt.date,
    sowing_date: dt.date,
    crop_name: str,
    variety_name: str,
    max_duration: int,
) -> None:
    text = f"""Version: 1.0
AgroManagement:
- {campaign_start.isoformat()}:
    CropCalendar:
        crop_name: {crop_name}
        variety_name: {variety_name}
        crop_start_date: {sowing_date.isoformat()}
        crop_start_type: sowing
        crop_end_date:
        crop_end_type: maturity
        max_duration: {max_duration}
    TimedEvents: null
    StateEvents: null
"""
    path.write_text(text)


def _cache_key(request: WofostYieldRequest) -> str:
    payload = asdict(request)
    payload.pop("force", None)
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()[:16]


def _namespace_from_request(request: WofostYieldRequest, cache_key: str) -> str:
    crop = request.crop.strip().lower().replace(" ", "_")
    sowing = request.sowing_date.replace("-", "")
    return f"{crop}_{sowing}_{request.lat:.5f}_{request.lon:.5f}_{cache_key}"


def _normalize_for_json(value: Any) -> Any:
    if isinstance(value, (dt.date, dt.datetime)):
        return value.isoformat()
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, dict):
        return {key: _normalize_for_json(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_normalize_for_json(item) for item in value]
    return value
