import unittest
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


HELPER_PATH = (
    Path(__file__).resolve().parents[3]
    / "services"
    / "prediction"
    / "nutrient_score_payload.py"
)
SPEC = spec_from_file_location("nutrient_score_payload", HELPER_PATH)
nutrient_score_payload = module_from_spec(SPEC)
SPEC.loader.exec_module(nutrient_score_payload)

build_ml_nutrients = nutrient_score_payload.build_ml_nutrients
build_unified_nutrients = nutrient_score_payload.build_unified_nutrients


class TestNutrientScorePayload(unittest.TestCase):
    def test_ml_nutrients_keep_nonnegative_continuous_scores(self):
        nutrients = build_ml_nutrients([[-0.25, 1.25, 2.73, 4.8, 0.49, 3.51]])

        self.assertEqual(nutrients["N"]["continuous_score"], 0.0)
        self.assertEqual(nutrients["N"]["score"], 1)
        self.assertAlmostEqual(nutrients["P"]["continuous_score"], 2.73)
        self.assertEqual(nutrients["P"]["score"], 3)
        self.assertEqual(nutrients["K"]["continuous_score"], 4.8)
        self.assertEqual(nutrients["K"]["score"], 4)

    def test_unified_nutrients_only_attach_continuous_score_to_estimates(self):
        unified = build_unified_nutrients(
            param_scores={"pH": 4, "P": 2, "K": 2, "OC": 3},
            nutrient_method={"P": "measured", "K": "estimated", "OC": "estimated"},
            ml_nutrients={
                "P": {"continuous_score": 3.8},
                "K": {"continuous_score": 1.0},
                "OC": {"continuous_score": 2.75},
            },
        )

        self.assertEqual(unified["P"]["method"], "measured")
        self.assertNotIn("continuous_score", unified["P"])
        self.assertEqual(unified["K"]["continuous_score"], 1.0)
        self.assertEqual(unified["OC"]["continuous_score"], 2.75)


if __name__ == "__main__":
    unittest.main()
