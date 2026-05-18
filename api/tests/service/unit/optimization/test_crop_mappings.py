from api.services.optimization.core.crop_mappings import resolve_busia_crop, supported_busia_crop_names


def test_busia_doc_crop_names_are_supported():
    assert supported_busia_crop_names() == (
        "Sesame (Sim sim)",
        "Soybeans",
        "Sunflower",
        "Groundnuts",
        "Cotton",
        "Cassava",
        "Maize",
        "Beans",
    )


def test_crop_aliases_map_to_kephis_and_rquefts_names():
    assert resolve_busia_crop("Sesame (Sim sim)").kephis_crop == "simsim"
    assert resolve_busia_crop("Soybeans").rquefts_crop == "Soyabean"
    assert resolve_busia_crop("Beans").kephis_crop == "common_bean"
    assert resolve_busia_crop("Beans").rquefts_crop == "Field bean"
    assert resolve_busia_crop("Beans").wofost_crop is None
    assert resolve_busia_crop("Sesame (Sim sim)").wofost_crop is None
    assert resolve_busia_crop("Maize").wofost_crop == "maize"
    assert resolve_busia_crop("Soybeans").wofost_crop == "soybean"
    assert resolve_busia_crop("Groundnuts").rquefts_crop == "Groundnut"
    assert resolve_busia_crop("Groundnuts").wofost_crop == "groundnut"
