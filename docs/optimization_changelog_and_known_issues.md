# Optimization Endpoint — Changelog & Known Issues

**Last updated:** 2026-05-14  
**Scope:** `api/services/optimization/`, `api/schema/optimization_schema.py`, `client/kiduka-app/.../optimizationPage.tsx`

**Update 2026-05-25:** The score-vs-raw-value ambiguity described below has been resolved by keeping ML estimates in `nutrients.*.continuous_score` and leaving raw concentration fields for measured values only. See `docs/ml_output_to_yield_model_input.md`.

---

## 1. Changes Made

### 1.1 KEPHIS Lower-Average API Contract

**File:** `api/schema/optimization_schema.py`  
**Contract:** KEPHIS attainable yield is selected by setting `scenario.y_att.source = "kephis"`. The API does not expose a continuous KEPHIS tuning parameter. The backend uses the conservative `average_lower_dry_yield_t_ha` column from `kephis_attainable_dry_yield.csv` by default.

**Current schema:**

```python
# api/schema/optimization_schema.py
class YAttConfigModel(StrictModel):
    source: Literal["kephis", "wofost"] = Field("kephis", ...)
    wofost_sowing_date: str = Field("2024-03-15", ...)
    wofost_elevation_m: float | None = Field(None, ...)
    fallback_to_kephis: bool = Field(True, ...)
    ...
```

**How it propagates through the stack:**

```
API payload → YAttConfigModel.source
    ↓
OptimizationService._build_yatt_config()
    ↓
YAttConfig(source="kephis")
    ↓
build_yatt_provider(config)
    ↓
KephisYAttProvider()
    ↓
Reads average_lower_dry_yield_t_ha from kephis_attainable_dry_yield.csv
```

**Files changed:**
| File | What changed |
|---|---|
| `api/schema/optimization_schema.py` | Keeps KEPHIS source selection but exposes no continuous KEPHIS tuning field |
| `api/services/optimization/core/contracts.py` | Keeps `YAttConfig` focused on source and WOFOST options |
| `api/services/optimization/optimization_service.py` | Builds KEPHIS config without extra yield-selection state |
| `api/services/optimization/yield_models/yatt.py` | Uses default `KephisYAttProvider()` for KEPHIS |

---

### 1.2 Soil Pre-fill from Latest Farmer Analysis

**Files:** `client/.../optimizationPage.tsx`, `client/.../SoilInputs.tsx`

**Feature:** When a logged-in farmer opens the Fertilizer Optimization page, their soil inputs are automatically pre-filled from their most recent soil prediction. The values remain editable so the farmer can adjust before running the optimizer.

**Implementation:**

```typescript
// optimizationPage.tsx — runs once when session token is available
useEffect(() => {
  apiClient.getPredictionHistory(token, 1, 1)   // page 1, size 1 = latest only
    .then((res) => {
      const latest = res.predictions?.[0];
      if (!latest) return;

      setSoil((prev) => ({
        ...prev,
        ...(latest.soil_ph        != null && { ph: latest.soil_ph }),
        ...(latest.organic_carbon != null && { soc_percent: latest.organic_carbon }),
        ...(latest.phosphorus     != null && { p_olsen_ppm: latest.phosphorus }),
        // K pre-fill: see Known Issue §2.1 below
      }));

      setSoilPrefillInfo({ date, location });   // triggers info banner in UI
    });
}, [session?.accessToken]);
```

**Field mapping (prediction → optimizer):**

| Prediction field | Optimization field | Notes |
|---|---|---|
| `soil_ph` | `ph` | Direct, same unit (0–14) |
| `organic_carbon` | `soc_percent` | Direct, both stored as % |
| `phosphorus` | `p_olsen_ppm` | Direct, both in mg/kg |
| `potassium` | `k_exchangeable_ppm` | ⚠️ **See Known Issue §2.1** |

**UX:** A small banner appears in the Soil Analysis card when values are pre-filled:

> 🕐 Pre-filled from your latest analysis · Kilimani ward, Nairobi, Kenya (11/05/2026) — values are editable

---

## 2. Known Issues

### 2.1 ⚠️ CRITICAL — Score vs. Raw Value Ambiguity in `potassium` Field

**Severity:** High — causes the optimizer to return all-zero results silently.

#### What happens

The soil prediction system stores nutrient data in the `soil_predictions` table. When a farmer submits a soil analysis:

- **If the farmer provided the value directly** (e.g. `k = 120`), the raw measured value is stored as-is in the `potassium` column.
- **If the farmer did NOT provide the value and the ML model gap-filled it**, the prediction service stores the **classifier score (1–4)** — not a real ppm value:

```python
# api/services/prediction/prediction_service.py
if prediction_mode == "ML":
    scores = classification_result.get("Parameter_Scores", {})
    nutrient_map = {"K": "k", ...}
    for key, db_key in nutrient_map.items():
        if db_soil_data.get(db_key) is None:
            db_soil_data[db_key] = scores.get(key)   # ← stores 1, 2, 3, or 4
```

The classifier score scale:
| Score | Meaning | Actual K range (ppm) |
|---|---|---|
| 1 | Very Poor | < 40 |
| 2 | Poor | 40–80 |
| 3 | Moderately Healthy | 80–160 |
| 4 | Healthy | > 160 |

#### Why it breaks optimization

The RQUEFTS yield model receives `k_exchangeable_ppm = 4` (which it interprets as 4 mg/kg of K — essentially zero). At that level, K is a hard-limiting factor and the model returns zero yield for all fertilizer combinations, regardless of budget:

```
k_ppm_to_mmol_kg(4.0) = 4.0 / 39.0983 = 0.10 mmol/kg  ← near-zero
→ RQUEFTS yield = 0 for all NPK rates
→ Optimizer finds no improvement → returns all-zero results
```

Confirmed by direct API test:
```bash
# k_exchangeable_ppm = 4  →  yield_kg_ha = 0.0, net_return = 0.0
# k_exchangeable_ppm = 120 →  yield_kg_ha = 5146.3, net_return = 116,833
```

#### Root cause

The `soil_predictions` table has no way to distinguish between:
- `potassium = 4` meaning "4 ppm (measured, Very Poor soil)"
- `potassium = 4` meaning "score class 4 (Healthy, ML-estimated)"

This is a **data model design issue**: the same column stores two semantically different things depending on whether the value was measured or ML-estimated.

#### Current workaround (temporary)

The pre-fill in `optimizationPage.tsx` skips K pre-fill if the stored value is below 20 ppm, keeping the UI default (120 ppm) instead:

```typescript
const K_VIABLE_MIN_PPM = 20;
const k_ppm = (latest.potassium != null && latest.potassium >= K_VIABLE_MIN_PPM)
  ? latest.potassium
  : null;
```

This prevents the zero-result scenario but means farmers with genuinely very low K soils will see the default instead of their real value.

#### Recommended fix (backlog)

**Option A — Store a flag alongside the value:**  
Add a `nutrients` JSONB column (already exists in the schema) entry that records both the raw value AND whether it was measured or ML-estimated, e.g.:

```json
{
  "K": { "raw_value": null, "score": 4, "method": "estimated" }
}
```

The `nutrients` column already stores this per-nutrient metadata (score, label, method). The pre-fill should read from `nutrients[K].method` to decide whether to use the raw value or skip:

```typescript
const kMeta = latest.nutrients?.K;
const k_ppm = (kMeta?.method === "measured" && latest.potassium != null)
  ? latest.potassium
  : null;   // skip if ML-estimated (value is a score, not ppm)
```

**Option B — Store scores in a separate column:**  
Add dedicated `*_score` columns to `soil_predictions` (e.g. `potassium_score`) so the raw value and the classifier score are never mixed in the same field.

**Option C — Never overwrite raw columns with scores:**  
In `prediction_service.py`, stop writing ML scores back into the raw nutrient columns. Instead, only store them in the existing `nutrients` JSONB column which is already purpose-built for this.

> **Recommendation: Option C** — it requires the smallest schema change (none) and fixes the semantic confusion at the source.

---

### 2.2 Unit Mismatch Risk for Other Nutrients

The same score-vs-raw ambiguity potentially affects `nitrogen`, `phosphorus`, `calcium`, and `magnesium` for any prediction where those fields were ML-estimated. However:

- `nitrogen` is not currently used by the optimizer (no direct N-input soil field)
- `phosphorus` (Olsen P): score 1–4 vs ppm 0–100+. Score 4 = 4 ppm = "Very Poor" by the classifier, but the optimization would still produce non-zero results (P is less limiting than K in RQUEFTS at low values)
- `calcium` / `magnesium`: not currently used by the optimizer

K is the only nutrient where a score of 4 (meaning Healthy) maps to a value (4 ppm) that causes the RQUEFTS model to hard-fail.

---

## 3. Testing

Run the optimization unit tests with:

```bash
# from the repo root, with kiduka-env active
python -m pytest api/tests/service/unit/optimization/ -v
```

Run focused tests after changing the optimization contract.

To manually test the endpoint with a known-good payload:

```bash
curl -X POST http://localhost:8000/optimization/optimize \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "soil": {
      "mode": "direct",
      "ph": 6.4,
      "soc_percent": 2.2,
      "p_olsen_ppm": 36.8,
      "k_exchangeable_ppm": 120
    },
    "crops": [
      { "crop": "Maize", "area_ac": 1.0, "grain_price_currency_per_kg": 58.5 }
    ],
    "fertilizers": [
      { "product": "DAP",  "n_fraction": 0.18, "p2o5_fraction": 0.46, "k2o_fraction": 0.0, "price_currency_per_kg": 115 },
      { "product": "Urea", "n_fraction": 0.46, "p2o5_fraction": 0.0,  "k2o_fraction": 0.0, "price_currency_per_kg": 92  },
      { "product": "MOP",  "n_fraction": 0.0,  "p2o5_fraction": 0.0,  "k2o_fraction": 0.6, "price_currency_per_kg": 90  }
    ],
    "scenario": {
      "budget_currency": 5000,
      "y_att": { "source": "kephis", "fallback_to_kephis": true }
    }
  }'
```

Expected: `yield_kg_ha ≈ 5146`, `budget_used ≈ 5000`, `status = "Feasible"`.

---

## 4. Summary Table

| # | Change | Status | Files |
|---|---|---|---|
| 1 | KEPHIS lower-average API contract restored | ✅ Done | `optimization_schema.py`, `contracts.py`, `optimization_service.py`, `yatt.py` |
| 2 | Soil pre-fill from latest farmer prediction | ✅ Done | `optimizationPage.tsx`, `SoilInputs.tsx` |
| 3 | K pre-fill guard (< 20 ppm skipped) | ✅ Done (workaround) | `optimizationPage.tsx` |
| 4 | Fix score-vs-raw ambiguity at source (Option C) | 🔲 Backlog | `prediction_service.py` |
| 5 | Expand pre-fill to use `nutrients[K].method` | 🔲 Backlog | `optimizationPage.tsx` |
