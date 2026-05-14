"""
Unit tests for SoilHealthClassifier — pure logic, no database or mocks needed.
"""
import pytest
from api.utils.soil_classifier import SoilHealthClassifier


@pytest.fixture
def classifier():
    return SoilHealthClassifier()


class TestPhClassification:

    def test_optimal_ph_is_healthy(self, classifier):
        assert classifier.classify_ph(6.5) == 4

    def test_slightly_acidic_is_moderately_healthy(self, classifier):
        assert classifier.classify_ph(5.2) == 3

    def test_strongly_acidic_is_poor(self, classifier):
        assert classifier.classify_ph(4.7) == 2

    def test_very_acidic_is_very_poor(self, classifier):
        assert classifier.classify_ph(4.0) == 1

    def test_slightly_alkaline_is_moderately_healthy(self, classifier):
        assert classifier.classify_ph(7.2) == 3

    def test_strongly_alkaline_is_poor(self, classifier):
        assert classifier.classify_ph(7.8) == 2

    def test_very_alkaline_is_very_poor(self, classifier):
        assert classifier.classify_ph(9.0) == 1


class TestNitrogenClassification:

    def test_high_n_is_healthy(self, classifier):
        assert classifier.classify_n(0.30) == 4

    def test_medium_n_is_moderately_healthy(self, classifier):
        assert classifier.classify_n(0.20) == 3

    def test_low_n_is_poor(self, classifier):
        assert classifier.classify_n(0.12) == 2

    def test_very_low_n_is_very_poor(self, classifier):
        assert classifier.classify_n(0.05) == 1


class TestOrganicCarbonClassification:

    def test_high_oc_is_healthy(self, classifier):
        assert classifier.classify_oc(3.5) == 4

    def test_medium_oc_is_moderately_healthy(self, classifier):
        assert classifier.classify_oc(2.5) == 3

    def test_low_oc_is_poor(self, classifier):
        assert classifier.classify_oc(1.5) == 2

    def test_very_low_oc_is_very_poor(self, classifier):
        assert classifier.classify_oc(0.5) == 1


class TestPhosphorusClassification:

    def test_high_p_is_healthy(self, classifier):
        assert classifier.classify_p(50) == 4

    def test_medium_p_is_moderately_healthy(self, classifier):
        assert classifier.classify_p(30) == 3

    def test_low_p_is_poor(self, classifier):
        assert classifier.classify_p(15) == 2

    def test_very_low_p_is_very_poor(self, classifier):
        assert classifier.classify_p(5) == 1


class TestPotassiumClassification:

    def test_high_k_is_healthy(self, classifier):
        assert classifier.classify_k(200) == 4

    def test_medium_k_is_moderately_healthy(self, classifier):
        assert classifier.classify_k(100) == 3

    def test_low_k_is_poor(self, classifier):
        assert classifier.classify_k(60) == 2

    def test_very_low_k_is_very_poor(self, classifier):
        assert classifier.classify_k(20) == 1


class TestCalciumClassification:

    def test_high_ca_is_healthy(self, classifier):
        assert classifier.classify_ca(2500) == 4

    def test_medium_ca_is_moderately_healthy(self, classifier):
        assert classifier.classify_ca(1500) == 3

    def test_low_ca_is_poor(self, classifier):
        assert classifier.classify_ca(750) == 2

    def test_very_low_ca_is_very_poor(self, classifier):
        assert classifier.classify_ca(300) == 1


class TestMagnesiumClassification:

    def test_high_mg_is_healthy(self, classifier):
        assert classifier.classify_mg(400) == 4

    def test_medium_mg_is_moderately_healthy(self, classifier):
        assert classifier.classify_mg(200) == 3

    def test_low_mg_is_poor(self, classifier):
        assert classifier.classify_mg(100) == 2

    def test_very_low_mg_is_very_poor(self, classifier):
        assert classifier.classify_mg(30) == 1


class TestSHICalculation:

    def test_all_healthy_scores_give_healthy_class(self, classifier):
        scores = {"pH": 4, "OC": 4, "N": 4, "P": 4, "K": 4, "Ca": 4, "Mg": 4}
        result = classifier.get_analysis_from_scores(scores, ph_val=6.5)

        assert result["SHI_Score"] == 4.0
        assert result["Initial_Class"] == "Healthy"
        assert result["Final_Soil_Status"] == "Healthy"

    def test_all_very_poor_scores_give_very_poor_class(self, classifier):
        scores = {"pH": 1, "OC": 1, "N": 1, "P": 1, "K": 1, "Ca": 1, "Mg": 1}
        result = classifier.get_analysis_from_scores(scores, ph_val=3.5)

        assert result["SHI_Score"] == 1.0
        assert result["Final_Soil_Status"] == "Very Poor"

    def test_mixed_scores_calculate_weighted_shi(self, classifier):
        # pH=4 (weight 3), OC=2 (weight 2.5) — partial input, weights normalised
        scores = {"pH": 4, "OC": 2}
        result = classifier.get_analysis_from_scores(scores)

        expected_shi = round((4 * 3.0 + 2 * 2.5) / (3.0 + 2.5), 2)
        assert result["SHI_Score"] == pytest.approx(expected_shi)

    def test_empty_scores_raises(self, classifier):
        with pytest.raises(ValueError):
            classifier.get_analysis_from_scores({})


class TestOverrideRules:

    def test_rule_three_very_poor_params_forces_very_poor(self, classifier):
        # pH=1, OC=1, N=1 → three very poor → must be Very Poor regardless of SHI
        scores = {"pH": 1, "OC": 1, "N": 1, "P": 4, "K": 4}
        _, rules = classifier._apply_overrides(scores, "Moderately Healthy")

        assert "Very Poor" in _
        assert any("R3" in r for r in rules)

    def test_rule_one_very_poor_ph_caps_at_poor(self, classifier):
        # pH Very Poor, rest healthy → caps at Poor
        scores = {"pH": 1, "N": 4, "P": 4, "K": 4}
        final, rules = classifier._apply_overrides(scores, "Healthy")

        assert final == "Poor"
        assert any("R1" in r for r in rules)

    def test_rule_two_very_poor_oc_downgrades(self, classifier):
        # OC Very Poor → downgrade by one band
        scores = {"pH": 4, "OC": 1, "N": 4}
        final, rules = classifier._apply_overrides(scores, "Healthy")

        assert final == "Moderately Healthy"
        assert any("R2" in r for r in rules)

    def test_no_override_when_all_healthy(self, classifier):
        scores = {"pH": 4, "OC": 4, "N": 4}
        final, rules = classifier._apply_overrides(scores, "Healthy")

        assert final == "Healthy"
        assert rules == []


class TestRecommendations:

    def test_poor_ph_recommends_lime(self, classifier):
        scores = {"pH": 2, "N": 4, "P": 4, "K": 4}
        recs = classifier._generate_recommendations(ph_val=4.5, scores=scores)

        assert "lime" in recs.lower() or "gypsum" in recs.lower()

    def test_poor_oc_recommends_compost(self, classifier):
        scores = {"pH": 4, "OC": 2}
        recs = classifier._generate_recommendations(ph_val=6.5, scores=scores)

        assert "fym" in recs.lower() or "compost" in recs.lower()

    def test_poor_n_recommends_can(self, classifier):
        scores = {"pH": 4, "N": 2}
        recs = classifier._generate_recommendations(ph_val=6.5, scores=scores)

        assert "can" in recs.lower()

    def test_healthy_soil_recommends_maintain(self, classifier):
        scores = {"pH": 4, "OC": 4, "N": 4, "P": 4, "K": 4}
        recs = classifier._generate_recommendations(ph_val=6.5, scores=scores)

        assert "maintain" in recs.lower()


class TestProcessRow:

    def test_process_row_with_full_data(self, classifier):
        row = {"pH": 6.5, "N": 0.30, "OC": 3.5, "P": 50, "K": 200, "Ca": 2500, "Mg": 400}
        result = classifier.process_row(row)

        assert result["SHI_Score"] == 4.0
        assert result["Final_Soil_Status"] == "Healthy"
        assert "Parameter_Scores" in result

    def test_process_row_with_partial_data(self, classifier):
        row = {"pH": 6.5, "N": 0.30}
        result = classifier.process_row(row)

        assert result["SHI_Score"] > 0
        assert result["Final_Soil_Status"] != "Error"

    def test_process_row_with_none_values_skips_them(self, classifier):
        row = {"pH": 6.5, "N": None, "OC": None}
        result = classifier.process_row(row)

        assert "N" not in result.get("Parameter_Scores", {})
        assert "OC" not in result.get("Parameter_Scores", {})
