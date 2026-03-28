# Kiduka: Soil Fertility Prediction & Agrovet Recommendation System

## Overview
Kiduka is a sophisticated agricultural decision-support system designed to empower farmers with precise soil health insights and localized resource recommendations. The application leverages a flexible triple-mode architecture to provide fertility predictions based on varying levels of available data, from satellite-derived environmental features to specific laboratory soil test results.

---

## 1. Triple Prediction Modes

Kiduka's core strength lies in its ability to adapt to the quality and quantity of user data. The system intelligently switches between three primary analysis workflows:

### A. Machine Learning (ML) Based Prediction
This mode is activated when a user provides only their **GPS coordinates** and the **pH level** of their soil. It is ideal for farmers who may not have access to full laboratory analysis but need an immediate, science-backed estimation.

*   **Environmental Data Fetching**: Using the GPS coordinates, the system integrates with **Google Earth Engine (GEE)** to extract high-resolution satellite features:
    *   **Vegetation Indices (NDVI)**: Derived from MODIS imagery to assess historical and current plant health.
    *   **Soil Texture**: Soil composition data (Clay vs. Sand percentages) retrieved from OpenLandMap.
    *   **SAR (Radar) Data**: Sentinel-1 SAR features (VV and VH bands) to analyze soil moisture and surface roughness.
    *   **Terrain Analysis**: Elevation and slope data derived from SRTM (Shuttle Radar Topography Mission).
    *   **Climate Data**: Rainfall patterns (Total, Long-rains, Short-rains, and Dry-season accumulation) from the CHIRPS dataset.
*   **Predictive Modeling**: These environmental features are processed through a suite of Random Forest models to estimate levels of Nitrogen (N), Phosphorus (P), Potassium (K), Organic Carbon (OC), Calcium (Ca), and Magnesium (Mg).
*   **Initial SHI Calculation**: A weighted index is calculated from these predicted nutrients and measured pH to provide an initial fertility classification.

### B. Hybrid Prediction (ML-Enhanced Analysis) [NEW]
This mode is triggered when a user provides **GPS coordinates, pH, and some elective nutrients** (e.g., Nitrogen and Phosphorus) but leaves others empty. 

*   **Gap Filling**: The system calls the ML engine to estimate only the nutrients that were **not** provided by the user.
*   **Data Merging & Override**: User-provided measurements **always override** ML predictions. If you enter Nitrogen, the AI's estimate for Nitrogen is discarded.
*   **SHI Recalculation**: The system explicitly **discards the ML-predicted SHI** and instead **recalculates a new SHI** using the unified set of measured and estimated data. This ensures the final status is anchored by the user's actual lab data while using AI to complete the "missing pieces" of the soil health puzzle.

### C. Formula-Based Prediction (Traditional Analysis)
This mode is used when the user provides **all 7 parameters** (pH + 6 nutrients) from a complete laboratory soil test.

*   **Scientific Weighting**: Each parameter is assigned a scientific weight (e.g., pH: 3.0, OC: 2.5) to calculate a composite Soil Health Index.
*   **Expert System Rules**: The classifier applies "Override Rules" to ensure accuracy even when the index score might be misleading:
    *   **R1 (pH Cap)**: If pH is "Very Poor," the entire status is capped at "Poor."
    *   **R2 (OC Downgrade)**: If Organic Carbon is "Very Poor," the status is automatically downgraded by one class level.
    *   **R3 (Threshold Rule)**: If 3 or more parameters are "Very Poor," the final status is forced to "Very Poor."
    *   **R4 (Macro Rule)**: If pH is "Poor" and two or more Macronutrients (N, P, K) are "Poor" or "Very Poor," the status is capped at "Poor."

---

## 2. Agrovet Recommendation Engine

Beyond analysis, Kiduka connects farmers with the resources they need to improve their soil.

*   **Location-Aware Search**: The system uses the user's coordinates and the **Haversine formula** to find the nearest Agrovets for precise distance calculation.
*   **Nutrient-Based Matching**: The recommendation logic identifies missing nutrients and highlights Agrovets that stock appropriate fertilizers:
    *   **Low Nitrogen (N)**: Recommends Top-dressing with CAN.
    *   **Low Phosphorus (P)**: Recommends NPK/DAP at planting.
    *   **Low Organic Carbon (OC)**: Recommends FYM (Farm Yard Manure) or compost.
*   **Proximity Ranking**: Farmers receive a ranked list of the 5 nearest Agrovets within a 100km radius, including distance and product availability.

---

## 3. User Interface

The Kiduka interface is designed for simplicity and efficiency, guiding users through a unified analysis workflow.

### Soil Analysis Input
The input form handles all modes automatically within a single interface:
1.  **Required Section**: Focuses on geographical location and pH level. This is the minimum required for the ML-based system.
2.  **Elective Section (Optional)**: Features fields for specific lab results (N, OC, P, K, Ca, Mg). Filling any of these fields triggers the high-precision Hybrid or Formula engines.

### Analysis Results & Feedback
Users receive a comprehensive dashboard with clear data provenance:
*   **Status & SHI**: A visual fertility indicator (e.g., "Moderately Healthy") and a precise numerical SHI score.
*   **Nutrient Provenance**: 
    *   **"Measured" Badges**: Clearly identifies nutrients derived from your direct inputs.
    *   **"Estimated" Badges**: Marks nutrients predicted via Machine Learning.
*   **Mode Awareness**: Explicitly states if the analysis is "Standard Formula," "Machine Learning," or "Hybrid Analysis."
*   **Recommendations**: Personalized instructions on which fertilizers to apply.
*   **Local Resources**: A map-integrated list of local suppliers (Agrovets) ranked by proximity.

---
*Documentation Version: 1.2.0*
*Last Updated: March 2026*
