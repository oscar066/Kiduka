import pytest

from api.services.optimization.yield_models.wofost_service import _crop_to_pcse


def test_busia_wofost_crops_map_to_pcse_crop_and_variety_names():
    assert _crop_to_pcse("maize") == {"crop_name": "maize", "variety_name": "Grain_maize_201"}
    assert _crop_to_pcse("soybeans") == {"crop_name": "soybean", "variety_name": "Soybean_VanHeemst_1988"}
    assert _crop_to_pcse("sunflower") == {"crop_name": "sunflower", "variety_name": "Sunflower_1101"}
    assert _crop_to_pcse("groundnuts") == {"crop_name": "groundnut", "variety_name": "Groundnut_VanHeemst_1988"}
    assert _crop_to_pcse("cotton") == {"crop_name": "cotton", "variety_name": "Cotton_VanHeemst_1988"}
    assert _crop_to_pcse("cassava") == {"crop_name": "cassava", "variety_name": "Cassava_VanHeemst_1988"}


def test_wofost_service_rejects_crops_without_pcse_parameters():
    with pytest.raises(ValueError, match="sesame"):
        _crop_to_pcse("sesame")

    with pytest.raises(ValueError, match="common bean"):
        _crop_to_pcse("common bean")
