import pandas as pd
from utils.logger import setup_logger

logger = setup_logger("SoilHealthClassifier")

# The Soil Health Classifier Class
class SoilHealthClassifier:
    def __init__(self):
        # Weights
        self.WEIGHTS = {"pH": 3.0, "OC": 2.5, "N": 2.0, "P": 2.0, "K": 1.5, "Ca": 1.0, "Mg": 1.0}
        self.TOTAL_WEIGHT = 13.0
        self.CLASSIFICATION_RANK = {"Very Poor": 1, "Poor": 2, "Moderately Healthy": 3, "Healthy": 4}

    # Individual Parameter Classifiers 
    def _classify_ph(self, ph):
        if 5.5 < ph <= 7.0: return 4
        elif (5.0 <= ph <= 5.5) or (7.0 < ph <= 7.5): return 3
        elif (4.5 <= ph < 5.0) or (7.5 < ph <= 8.0): return 2
        else: return 1

    def _classify_n(self, n_pct):
        if n_pct > 0.25: return 4
        elif 0.15 <= n_pct <= 0.25: return 3
        elif 0.10 <= n_pct < 0.15: return 2
        else: return 1

    def _classify_oc(self, oc_pct):
        if oc_pct > 3.0: return 4
        elif 2.0 <= oc_pct <= 3.0: return 3
        elif 1.0 <= oc_pct < 2.0: return 2
        else: return 1

    def _classify_p(self, p_ppm):
        if p_ppm > 40: return 4
        elif 20 <= p_ppm <= 40: return 3
        elif 10 <= p_ppm < 20: return 2
        else: return 1

    def _classify_k(self, k_ppm):
        if k_ppm > 160: return 4
        elif 80 <= k_ppm <= 160: return 3
        elif 40 <= k_ppm < 80: return 2
        else: return 1

    def _classify_ca(self, ca_ppm):
        if ca_ppm > 2000: return 4
        elif 1000 <= ca_ppm <= 2000: return 3
        elif 500 <= ca_ppm < 1000: return 2
        else: return 1

    def _classify_mg(self, mg_ppm):
        if mg_ppm > 300: return 4
        elif 150 <= mg_ppm <= 300: return 3
        elif 50 <= mg_ppm < 150: return 2
        else: return 1

    # SHI & Logic Helpers
    def _get_shi_class(self, shi_value):
        if shi_value >= 3.50: return "Healthy"
        elif shi_value >= 2.50: return "Moderately Healthy"
        elif shi_value >= 1.50: return "Poor"
        else: return "Very Poor"

    def _downgrade(self, current_class):
        rank = self.CLASSIFICATION_RANK[current_class]
        new_rank = max(1, rank - 1)
        for label, r in self.CLASSIFICATION_RANK.items():
            if r == new_rank: return label
        return current_class

    def _apply_overrides(self, scores, shi_class):
        final = shi_class
        rules_triggered = []
        very_poor_count = sum(1 for s in scores.values() if s == 1)

        # R3: Three or more parameters Very Poor
        if very_poor_count >= 3:
            return "Very Poor", ["R3: ≥3 params Very Poor"]

        # R1: pH Very Poor
        if scores["pH"] == 1:
            if self.CLASSIFICATION_RANK[final] > self.CLASSIFICATION_RANK["Poor"]:
                final = "Poor"
            rules_triggered.append("R1: pH Very Poor")

        # R4: pH Poor + 2 macronutrients Poor/Very Poor
        if scores["pH"] == 2:
            macro_poor = sum(1 for p in ["N", "P", "K"] if scores[p] <= 2)
            if macro_poor >= 2:
                if self.CLASSIFICATION_RANK[final] > self.CLASSIFICATION_RANK["Poor"]:
                    final = "Poor"
                rules_triggered.append("R4: pH Poor + Macro issues")

        # R2: OC Very Poor
        if scores["OC"] == 1:
            final = self._downgrade(final)
            rules_triggered.append("R2: OC Very Poor")

        return final, rules_triggered

    def _generate_recommendations(self, ph_val, scores):
        actions = []
        if scores["pH"] <= 2:
            actions.append("Apply calcitic lime (if acidic) or gypsum (if alkaline)")
        if scores["OC"] <= 2:
            actions.append("Apply 20 tons FYM/compost per acre")
        if scores["N"] <= 2:
            actions.append("Top-dress with CAN")
        if scores["P"] <= 2:
            actions.append("Apply NPK/DAP at planting")
        if scores["K"] <= 2:
            actions.append("Apply MOP or K-rich blend")
        if scores["Ca"] <= 2:
            actions.append("Apply calcitic lime/gypsum")
        if scores["Mg"] <= 2:
            actions.append("Apply dolomitic lime")
        
        if not actions:
            actions.append("Maintain current practices")
        
        return "; ".join(actions)

    # Core Processor
    def process_row(self, row, col_map=None):
        """Processes a single row of data."""
        try:
            # Default mapping if none provided
            if col_map is None:
                col_map = {"pH": "pH", "N": "N", "OC": "OC", "P": "P", "K": "K", "Ca": "Ca", "Mg": "Mg"}

            # Extract values based on user mapping
            vals = {
                "pH": float(row.get(col_map["pH"], 0)),
                "N":  float(row.get(col_map["N"], 0)),
                "OC": float(row.get(col_map["OC"], 0)),
                "P":  float(row.get(col_map["P"], 0)),
                "K":  float(row.get(col_map["K"], 0)),
                "Ca": float(row.get(col_map["Ca"], 0)),
                "Mg": float(row.get(col_map["Mg"], 0))
            }
            
            logger.info(f"Processing sample with pH: {vals['pH']}, N: {vals['N']}, OC: {vals['OC']}")

            # Calculate Scores
            scores = {
                "pH": self._classify_ph(vals["pH"]),
                "N":  self._classify_n(vals["N"]),
                "OC": self._classify_oc(vals["OC"]),
                "P":  self._classify_p(vals["P"]),
                "K":  self._classify_k(vals["K"]),
                "Ca": self._classify_ca(vals["Ca"]),
                "Mg": self._classify_mg(vals["Mg"])
            }

            # Calculate SHI
            weighted_sum = sum(scores[k] * self.WEIGHTS[k] for k in scores)
            shi = round(weighted_sum / self.TOTAL_WEIGHT, 2)
            shi_class = self._get_shi_class(shi)
            
            logger.info(f"Calculated SHI: {shi} ({shi_class})")

            # Apply Logic
            final_status, rules = self._apply_overrides(scores, shi_class)
            
            if rules:
                logger.info(f"Downgrade rules triggered: {rules}")
                logger.info(f"Final status changed from {shi_class} to {final_status}")
            
            recommendations = self._generate_recommendations(vals["pH"], scores)

            return {
                "SHI_Score": shi,
                "Initial_Class": shi_class,
                "Final_Soil_Status": final_status,
                "Recommendations": recommendations,
                "Mentions": rules  # Added to see triggered rules if needed
            }
        
        except Exception as e:
            logger.error(f"Error processing row: {e}")
            return {
                "SHI_Score": 0.0,
                "Initial_Class": "Error",
                "Final_Soil_Status": "Error",
                "Recommendations": f"Error processing row: {str(e)}",
                "Mentions": []
            }
