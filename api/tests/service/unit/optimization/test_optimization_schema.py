import pytest
from pydantic import ValidationError

from api.schema.optimization_schema import OptimizationRequest, SoilInputModel


def test_optimization_request_rejects_retired_kephis_quantile():
    with pytest.raises(ValidationError, match="kephis_quantile"):
        OptimizationRequest.model_validate(
            {
                "soil": {
                    "mode": "direct",
                    "ph": 5.5,
                    "soc_percent": 0.7,
                    "p_olsen_ppm": 5.0,
                    "k_exchangeable_ppm": 55.0,
                },
                "crops": [
                    {
                        "crop": "Maize",
                        "area_ha": 0.2,
                        "grain_price_currency_per_kg": 58.5,
                    }
                ],
                "fertilizers": [
                    {
                        "product": "Urea",
                        "n_fraction": 0.46,
                        "price_currency_per_kg": 92.0,
                    }
                ],
                "scenario": {
                    "budget_currency": 1000.0,
                    "y_att": {
                        "source": "kephis",
                        "kephis_quantile": 0.01,
                    },
                },
            }
        )


def test_soil_input_direct_mode_allows_omitted_ph():
    # ph is resolved from a regional default (by location) when omitted, so
    # direct mode must not require it — unlike soc/P/K, which have no dataset.
    soil = SoilInputModel(
        mode="direct",
        soc_percent=0.7,
        p_olsen_ppm=5.0,
        k_exchangeable_ppm=55.0,
    )
    assert soil.ph is None


def test_soil_input_direct_mode_still_requires_soc_p_k():
    with pytest.raises(ValidationError, match="soc_percent, p_olsen_ppm, and k_exchangeable_ppm"):
        SoilInputModel(mode="direct", ph=5.5)
