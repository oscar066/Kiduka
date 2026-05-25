# ML Output to Yield Model Input

**Date:** 2026-05-25
**Scope:** soil prediction output, prediction history, optimization prefill, yield model soil inputs

---

## 1. Goal

The optimization module needs physical soil concentrations, not soil-health class scores.

Required optimization soil inputs:

| Optimization field | Meaning | Unit |
|---|---|---|
| `ph` | Soil pH | pH scale |
| `soc_percent` | Soil organic carbon | percent |
| `p_olsen_ppm` | Olsen phosphorus | ppm / mg kg-1 |
| `k_exchangeable_ppm` | Exchangeable potassium | ppm / mg kg-1 |

The soil analysis module can produce these values in two ways:

1. User measured input from the soil analysis form.
2. ML-estimated continuous nutrient scores when the user did not provide the nutrient.

This change defines a clean interface between those two modules and the optimization page.

---

## 2. End-to-End Flow

```text
Soil analysis form
  -> user measured OC/P/K concentration if provided
  -> ML continuous OC/P/K score if missing
  -> prediction response and history
       raw concentration columns = measured values only
       nutrients JSON = score, label, method, optional continuous_score
  -> optimization page loads latest prediction history
  -> per-nutrient prefill resolver
       measured concentration > estimated continuous-score mapping > no prefill
  -> editable optimization soil form
  -> optimization API receives concentrations
  -> optimization backend applies QUEFTS soil clamps
  -> yield model / solver
```

The optimization backend remains modular. It does not need to know whether a soil value came from the user or from ML. It only receives concentrations and then applies its own QUEFTS-compatible clamps.

---

## 3. Prediction Interface Contract

### 3.1 Raw concentration fields

The flattened prediction history fields are physical measurements only:

| History field | Meaning |
|---|---|
| `organic_carbon` | user-provided OC percent |
| `phosphorus` | user-provided Olsen P ppm |
| `potassium` | user-provided exchangeable K ppm |

If a nutrient was missing from the user input and estimated by ML, these raw fields stay `null`.

This prevents the previous ambiguity where `potassium = 4` could mean either:

- 4 ppm measured K, or
- ML class score 4, meaning "Healthy".

### 3.2 Nutrients JSON

The `nutrients` JSON carries classification metadata and ML score metadata:

```json
{
  "P": {
    "score": 3,
    "label": "Moderately Healthy",
    "method": "estimated",
    "continuous_score": 2.73
  },
  "K": {
    "score": 2,
    "label": "Poor",
    "method": "measured"
  }
}
```

Field meanings:

| Field | Meaning |
|---|---|
| `score` | rounded class score, clipped to 1-4 |
| `label` | class label for display |
| `method` | `measured` if user-provided, `estimated` if ML-filled |
| `continuous_score` | non-negative ML continuous score; only used for `estimated` nutrients |

The `continuous_score` is computed from the raw ML regression output after applying:

```text
continuous_score = max(0, raw_ml_score)
```

The rounded `score` remains available for existing soil-health display, SHI calculation, and recommendations.

---

## 4. Score-to-Concentration Mapping

The optimization prefill maps ML continuous scores into approximate physical concentrations. These are heuristic estimates for prefill only; the user can edit them before running optimization.

Physical bounds:

| Nutrient | Bounds used for mapping |
|---|---|
| OC | 0, 1, 2, 3 percent |
| Olsen P | 0, 10, 20, 40 ppm |
| Exchangeable K | 0, 40, 80, 160 ppm |

Mapping rule:

```text
s = max(0, continuous_score)

if s < 1.5:
    map clamp(s, 0.5, 1.5) linearly from [0.5, 1.5] to [0, score_1_upper]
elif s < 2.5:
    map s linearly from [1.5, 2.5] to [score_1_upper, score_2_upper]
elif s < 3.5:
    map s linearly from [2.5, 3.5] to [score_2_upper, score_4_upper]
else:
    use score_4_upper
```

Example for Olsen P:

| Continuous score | Prefill P |
|---:|---:|
| 0.5 | 0 ppm |
| 1.0 | 5 ppm |
| 1.5 | 10 ppm |
| 2.0 | 15 ppm |
| 2.5 | 20 ppm |
| 3.0 | 30 ppm |
| 3.5 or higher | 40 ppm |

---

## 5. Optimization Prefill Precedence

The optimization page resolves each nutrient independently:

```text
if nutrient.method == "measured":
    use raw concentration field
elif nutrient.method == "estimated":
    use continuous_score -> concentration mapping
else:
    do not prefill this nutrient
```

There is no fallback from `score` to concentration. New data is expected to carry `continuous_score` for ML-estimated nutrients.

This also removes the previous `K < 20 ppm` workaround. Low measured K is now preserved because the frontend no longer treats low K as automatically invalid. Estimated K is interpreted through the continuous-score mapping instead of reading the raw `potassium` column.
