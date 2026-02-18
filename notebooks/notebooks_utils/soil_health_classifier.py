import subprocess
import sys
import os
import io
import pandas as pd
import openpyxl

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
    def process_row(self, row, col_map):
        """Processes a single row of data."""
        try:
            # Extract values based on user mapping
            vals = {
                "pH": float(row[col_map["pH"]]),
                "N":  float(row[col_map["N"]]),
                "OC": float(row[col_map["OC"]]),
                "P":  float(row[col_map["P"]]),
                "K":  float(row[col_map["K"]]),
                "Ca": float(row[col_map["Ca"]]),
                "Mg": float(row[col_map["Mg"]])
            }

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

            # Apply Logic
            final_status, rules = self._apply_overrides(scores, shi_class)
            recommendations = self._generate_recommendations(vals["pH"], scores)

            return pd.Series([shi, shi_class, final_status, recommendations])
        
        except Exception as e:
            return pd.Series([0.0, "Error", "Error", str(e)])

    def process_dataset(self, input_path, output_path, column_mapping=None):
        """
        Main function to process a file.
        
        Args:
            input_path (str): Path to .csv or .xlsx
            output_path (str): Where to save the result
            column_mapping (dict): Maps standard keys (pH, N, OC...) to your CSV headers.
        """
        # 1. Default Mapping (if user doesn't provide one)
        default_map = {"pH": "pH", "N": "N", "OC": "OC", "P": "P", "K": "K", "Ca": "Ca", "Mg": "Mg"}
        if column_mapping:
            default_map.update(column_mapping)
        
        # 2. Load Data
        print(f"📖 Reading file: {input_path}")
        try:
            if input_path.endswith('.csv'):
                df = pd.read_csv(input_path)
            elif input_path.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(input_path)
            else:
                raise ValueError("Unsupported file format. Use .csv or .xlsx")
        except FileNotFoundError:
            print("❌ File not found.")
            return

        # 3. Check columns exist
        missing = [v for k, v in default_map.items() if v not in df.columns]
        if missing:
            print(f"❌ Error: The following columns were not found in the file: {missing}")
            print(f"   Available columns: {list(df.columns)}")
            return

        print("⚙️  Processing rows...")
        
        # 4. Apply Logic
        result_cols = ["SHI_Score", "Initial_Class", "Final_Soil_Status", "Recommendations"]
        df[result_cols] = df.apply(
            lambda row: self.process_row(row, default_map), axis=1
        )

        # 5. Save Data
        print(f"💾 Saving results to: {output_path}")
        if output_path.endswith('.csv'):
            df.to_csv(output_path, index=False)
        else:
            df.to_excel(output_path, index=False)
        
        print("✅ Done!")

# Example Usage

if __name__ == "__main__":
    # 1. Create a dummy dataset for testing
    dummy_data = {
        "Sample_ID": [1, 2, 3],
        "Soil_pH": [6.5, 4.8, 8.2],    # Note: Column names don't match default perfectly
        "Nitrogen_%": [0.3, 0.12, 0.2],
        "Organic_Carbon": [3.2, 0.8, 1.5],
        "Phosphorus_ppm": [45, 8, 25],
        "Potassium_ppm": [170, 30, 90],
        "Calcium_ppm": [2500, 400, 1200],
        "Magnesium_ppm": [350, 40, 160]
    }
    
    # Save dummy data to CSV
    input_file = "soil_samples_input.csv"
    output_file = "soil_samples_analyzed.csv"
    pd.DataFrame(dummy_data).to_csv(input_file, index=False)

    # 2. Initialize the Classifier
    classifier = SoilHealthClassifier()

    # 3. Define Column Mapping 
    my_mapping = {
        "pH": "Soil_pH",
        "N":  "Nitrogen_%",
        "OC": "Organic_Carbon",
        "P":  "Phosphorus_ppm",
        "K":  "Potassium_ppm",
        "Ca": "Calcium_ppm",
        "Mg": "Magnesium_ppm"
    }

    # 4. Run the Process
    classifier.process_dataset(
        input_path=input_file, 
        output_path=output_file, 
        column_mapping=my_mapping
    )