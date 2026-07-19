"""
Integration tests for the prediction API endpoint.

Requires a running API server. Run with:
    pytest api/tests/service/integration/ -v

Override defaults via environment variables:
    KIDUKA_API_URL=http://localhost:8000
    KIDUKA_TEST_USERNAME=your_user        (or email)
    KIDUKA_TEST_PASSWORD=your_password
"""
import os
import pytest
import requests

BASE_URL = os.getenv("KIDUKA_API_URL", "http://localhost:8000")
PREDICT_URL = f"{BASE_URL}/predictions/predict"
LOGIN_URL = f"{BASE_URL}/auth/login"

TEST_USERNAME = os.getenv("KIDUKA_TEST_USERNAME", os.getenv("RECOVERY_ADMIN_EMAIL", os.getenv("RECOVERY_ADMIN_USERNAME", "")))
TEST_PASSWORD = os.getenv("KIDUKA_TEST_PASSWORD", os.getenv("RECOVERY_ADMIN_PASSWORD", ""))


@pytest.fixture(scope="module")
def api_available():
    """Skip all tests in this module if the API is unreachable."""
    try:
        requests.get(f"{BASE_URL}/health", timeout=3)
    except requests.exceptions.ConnectionError:
        pytest.skip(
            f"API not reachable at {BASE_URL} — start the server before running integration tests"
        )


@pytest.fixture(scope="module")
def auth_headers(api_available):
    """Log in once per module and return the Authorization header dict."""
    if not TEST_USERNAME or not TEST_PASSWORD:
        pytest.skip(
            "Test credentials not set — provide KIDUKA_TEST_USERNAME and KIDUKA_TEST_PASSWORD"
        )

    response = requests.post(
        LOGIN_URL,
        json={"username_or_email": TEST_USERNAME, "password": TEST_PASSWORD},
    )
    assert response.status_code == 200, (
        f"Login failed ({response.status_code}): {response.text}"
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Scenario 1: Full Formula (all nutrients provided)
# ---------------------------------------------------------------------------

@pytest.fixture
def full_payload():
    return {
        "ph": 6.5,
        "n": 0.22,
        "p": 35.0,
        "k": 120.0,
        "organic_carbon": 2.5,
        "ca": 1500.0,
        "mg": 250.0,
        "latitude": -1.286389,
        "longitude": 36.817223,
    }


def test_full_formula_returns_200(auth_headers, full_payload):
    response = requests.post(PREDICT_URL, json=full_payload, headers=auth_headers)
    assert response.status_code == 200


def test_full_formula_mode(auth_headers, full_payload):
    result = requests.post(PREDICT_URL, json=full_payload, headers=auth_headers).json()
    assert result.get("prediction_mode") == "FORMULA"


def test_full_formula_has_required_fields(auth_headers, full_payload):
    result = requests.post(PREDICT_URL, json=full_payload, headers=auth_headers).json()
    assert "soil_fertility_status" in result
    assert "mentions" in result
    assert "nutrients" in result


def test_full_formula_nutrients_have_score_and_label(auth_headers, full_payload):
    result = requests.post(PREDICT_URL, json=full_payload, headers=auth_headers).json()
    for nutrient, data in result["nutrients"].items():
        assert "score" in data, f"Missing 'score' for nutrient: {nutrient}"
        assert "label" in data, f"Missing 'label' for nutrient: {nutrient}"


# ---------------------------------------------------------------------------
# Scenario 2: Hybrid (some nutrients provided — GEE gap-fills the rest)
# ---------------------------------------------------------------------------

@pytest.fixture
def partial_payload():
    return {
        "ph": 6.5,
        "n": 0.10,  # very poor — should influence status
        "p": 45.0,  # healthy
        "latitude": -1.286389,
        "longitude": 36.817223,
    }


def test_hybrid_returns_200(auth_headers, partial_payload):
    response = requests.post(PREDICT_URL, json=partial_payload, headers=auth_headers)
    assert response.status_code == 200


def test_hybrid_mode(auth_headers, partial_payload):
    result = requests.post(PREDICT_URL, json=partial_payload, headers=auth_headers).json()
    assert result.get("prediction_mode") == "ML"
    assert any("hybrid" in m.lower() for m in result.get("mentions", []))


def test_hybrid_low_nitrogen_reflected_in_status(auth_headers, partial_payload):
    result = requests.post(PREDICT_URL, json=partial_payload, headers=auth_headers).json()
    nitrogen = result.get("nutrients", {}).get("nitrogen", {})
    # n=0.10 is very poor; label should not be Healthy/Good
    assert nitrogen.get("label", "").lower() not in ("healthy", "good"), (
        f"Expected poor nitrogen label, got: {nitrogen.get('label')}"
    )


# ---------------------------------------------------------------------------
# Scenario 3: Full ML (only location + pH — all nutrients from GEE)
# ---------------------------------------------------------------------------

@pytest.fixture
def ml_payload():
    return {
        "ph": 6.5,
        "latitude": -1.286389,
        "longitude": 36.817223,
    }


def test_ml_only_returns_200(auth_headers, ml_payload):
    response = requests.post(PREDICT_URL, json=ml_payload, headers=auth_headers)
    assert response.status_code == 200


def test_ml_only_mode(auth_headers, ml_payload):
    result = requests.post(PREDICT_URL, json=ml_payload, headers=auth_headers).json()
    assert result.get("prediction_mode") == "ML"


def test_ml_only_has_required_fields(auth_headers, ml_payload):
    result = requests.post(PREDICT_URL, json=ml_payload, headers=auth_headers).json()
    assert "soil_fertility_status" in result
    assert "nutrients" in result


# ---------------------------------------------------------------------------
# Scenario 4: No pH provided — regional default used
# ---------------------------------------------------------------------------

@pytest.fixture
def no_ph_payload():
    return {
        "latitude": -1.286389,
        "longitude": 36.817223,
    }


def test_no_ph_returns_200(auth_headers, no_ph_payload):
    response = requests.post(PREDICT_URL, json=no_ph_payload, headers=auth_headers)
    assert response.status_code == 200


def test_no_ph_mentions_regional_default(auth_headers, no_ph_payload):
    result = requests.post(PREDICT_URL, json=no_ph_payload, headers=auth_headers).json()
    assert any("regional soil survey" in m.lower() for m in result.get("mentions", []))
