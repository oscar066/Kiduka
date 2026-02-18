# Soil Health Classifier API

This backend provides a RESTful API for classifying soil sample data into health categories based on specific parameters. It calculates a Soil Health Index (SHI) and provides actionable recommendations.

## Setup & Installation

1.  **Navigate to backend directory**:
    ```bash
    cd backend
    ```

2.  **Create virtual environment (Optional but Recommended)**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On macOS/Linux
    # venv\Scripts\activate  # On Windows
    ```

3.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

## Running the Server

To start the FastAPI server:

```bash
uvicorn main:app --reload
```

The server will start at `http://127.0.0.1:8000`.

## API Reference

### `POST /classify`

Classifies a batch of soil samples using the Soil Health Classifier model.

**Request Method**: POST
**Endpoint**: `/classify`
**Content-Type**: `application/json`

**Request Body** (Example):

```json
{
  "samples": [
    {
      "pH": 6.5,
      "N": 0.20,
      "OC": 2.5,
      "P": 30.0,
      "K": 120.0,
      "Ca": 1500.0,
      "Mg": 200.0,
      "id": "sample-001" 
    },
    {
      "pH": 4.5,
      "N": 0.10,
      "OC": 1.0,
      "P": 5.0,
      "K": 30.0,
      "Ca": 400.0,
      "Mg": 40.0,
      "id": "sample-002"
    }
  ]
}
```

**Response Body** (Example):

```json
[
  {
    "SHI_Score": 3.23,
    "Initial_Class": "Moderately Healthy",
    "Final_Soil_Status": "Moderately Healthy",
    "Recommendations": "Maintain current practices",
    "Mentions": [],
    "id": "sample-001"
  },
  {
    "SHI_Score": 1.0,
    "Initial_Class": "Very Poor",
    "Final_Soil_Status": "Very Poor",
    "Recommendations": "Apply calcitic lime (if acidic) or gypsum (if alkaline); Apply 20 tons FYM/compost per acre; Top-dress with CAN; Apply NPK/DAP at planting; Apply MOP or K-rich blend; Apply calcitic lime/gypsum; Apply dolomitic lime",
    "Mentions": ["R3: ≥3 params Very Poor"],
    "id": "sample-002"
  }
]
```

### Response Fields
-   **SHI_Score**: The calculated Soil Health Index score.
-   **Initial_Class**: The classification derived directly from the SHI score ("Healthy", "Moderately Healthy", "Poor", "Very Poor").
-   **Final_Soil_Status**: The final classification after applying downgrade rules and overrides.
-   **Recommendations**: Specific actions needed to improve soil health based on individual parameter deficiencies.
-   **Mentions**: Any specific rule triggers used for classification adjustments (e.g., "R1: pH Very Poor").
-   **id**: The sample ID provided in the request (optional).

## Logic Overview

The classifier uses a weighted scoring system based on 7 soil parameters:
1.  **pH** (Weight: 3.0)
2.  **OC** (Organic Carbon, Weight: 2.5)
3.  **N** (Nitrogen, Weight: 2.0)
4.  **P** (Phosphorus, Weight: 2.0)
5.  **K** (Potassium, Weight: 1.5)
6.  **Ca** (Calcium, Weight: 1.0)
7.  **Mg** (Magnesium, Weight: 1.0)

Each parameter is scored on a scale of 1-4:
-   4: High/Optimum
-   3: Medium
-   2: Low
-   1: Very Low

### SHI Calculation
`SHI` = Sum(Parameter Score * Weight) / Total Weight (13.0)

`Initial Class` is determined by SHI ranges:
-   `>= 3.50`: Healthy
-   `>= 2.50`: Moderately Healthy
-   `>= 1.50`: Poor
-   `< 1.50`: Very Poor

### Downgrade Rules (Overrides)
Certain critical deficiencies override the pure SHI score:
-   **R1**: If pH is "Very Poor" (Score 1), max classification is "Poor".
-   **R2**: If OC is "Very Poor" (Score 1), downgrade class by one rank.
-   **R3**: If >= 3 parameters are "Very Poor" (Score 1), final class is "Very Poor".
-   **R4**: If pH is "Poor" (Score 2) AND >= 2 macronutrients (N, P, K) are "Poor" or "Very Poor", max classification is "Poor".
