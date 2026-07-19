import pytest

pytest.importorskip("shapely")

from api.utils.soil_ph import SoilPhLocator, get_soil_ph_locator


@pytest.fixture(scope="module")
def locator():
    return SoilPhLocator()


def test_loads_regions_and_skips_unsurveyed_rows(locator):
    # The dataset stores PHAQ=0 for polygons with no survey data; those must
    # not be treated as a real measured pH of zero.
    assert len(locator._regions) > 0
    assert all(phaq > 0 for _, _, phaq in locator._regions)


def test_point_inside_known_polygon_returns_its_phaq(locator):
    geom, _, expected_phaq = locator._regions[0]
    interior_point = geom.representative_point()

    result = locator.get_default_ph(interior_point.y, interior_point.x)

    assert result == expected_phaq


def test_point_far_outside_all_polygons_falls_back_to_nearest_centroid(locator):
    # Mid-Atlantic — nowhere near any surveyed Kenyan polygon.
    result = locator.get_default_ph(0.0, -30.0)

    assert result is not None
    assert result > 0


def test_get_default_ph_returns_none_when_dataset_missing(tmp_path):
    locator = SoilPhLocator(csv_path=tmp_path / "does_not_exist.csv")

    assert locator.get_default_ph(-1.28, 36.82) is None


def test_get_soil_ph_locator_is_cached():
    assert get_soil_ph_locator() is get_soil_ph_locator()
