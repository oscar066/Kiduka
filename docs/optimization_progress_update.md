# Fertilizer Optimization — Progress Update

**Date:** 2026-05-14

---

## Overview

This document summarises the changes made to the fertilizer optimization feature across the frontend and backend, the issues encountered, and how we are thinking about resolving them.

---

## Frontend Changes

### 1. Crop List Updated

The list of supported crops available for optimization has been expanded and updated to reflect the crops actually grown in the Busia region. Farmers can now select from a broader set of crops when setting up an optimization run, and each crop comes pre-loaded with a sensible default farm-gate price so the farmer does not have to look it up manually.

---

### 2. Fertilizer List Updated

The available fertilizer products have been updated with accurate Kenyan market prices and correct nutrient fractions. The list now includes the most commonly used products in the region:

- DAP, Urea, CAN, TSP, MOP, NPK 23:23:23 — enabled by default
- NPK 17:17:17, Sulphate of Ammonia, Organic Manure, Super Liquid Foliar — available but off by default

Farmers can toggle any product on or off, adjust prices if local prices differ, and add a completely custom fertilizer with their own NPK fractions and price.

---

### 3. Advanced Settings Section Introduced

A collapsible **Advanced Settings** panel has been added to the optimization page. This exposes configuration options that were previously hardcoded or not accessible from the UI:

- **Attainable Yield Source** — choose between KEPHIS (uses Busia district yield trial data, default) or WOFOST (process-based crop simulation model)
- **KEPHIS Quantile** — controls how conservative the attainable yield estimate is. A value of 0.01 (1st percentile) gives the most conservative estimate; higher values use the average/median yield
- **WOFOST options** — when WOFOST is selected, the farmer can set the sowing date, site elevation, and GPS coordinates. A fallback to KEPHIS is also available for crops that do not yet have WOFOST parameters

The panel is collapsed by default so it does not overwhelm the main workflow but is easy to open for users who need it.

---

### 4. Soil Analysis Section Introduced (Auto-fill from Latest Analysis)

A **Soil Analysis** section has been added to the optimization page. This replaces the previous approach of having the farmer type in soil values from scratch every time they visit the optimizer.

**How it works:**

When the farmer opens the optimization page, the system automatically fetches their most recent soil prediction from their account history and pre-fills the four soil parameters the optimizer needs:

| Field | Source |
|---|---|
| pH | `soil_ph` from latest prediction |
| Soil Organic Carbon (%) | `organic_carbon` from latest prediction |
| Olsen P (ppm) | `phosphorus` from latest prediction |
| Exchangeable K (ppm) | `potassium` from latest prediction |

A small notice appears in the section header to tell the farmer where the values came from and when that analysis was done, for example:

> *Pre-filled from your latest analysis · Kilimani ward, Nairobi (11/05/2026) — values are editable*

All four fields remain fully editable. The farmer can change any value before running the optimizer — the pre-fill is just a starting point to save time.

If the farmer has no previous predictions on their account, the fields default to representative starting values and the notice does not appear.

---

## Backend Changes

### 5. API Schema Fixed — 422 Error on Optimization Endpoint

After the Advanced Settings panel was introduced on the frontend, every optimization request was failing with a **422 Unprocessable Entity** error before the optimizer even ran.

**What was happening:** The frontend was correctly sending the `kephis_quantile` value as part of the request. However, the backend schema for that section of the request had never declared that field. Because the schema is set to reject any field it does not recognise (`extra = "forbid"`), every request was being rejected immediately.

**Fix:** `kephis_quantile` was added to the backend schema with a valid range of 0–1. The service layer was also updated to translate the quantile into the appropriate yield column in the KEPHIS data (values at or below 0.5 use the conservative lower-bound column; values above 0.5 use the average/median column).

---

### 6. Test Suite Expanded (Ongoing)

A pytest-based test suite has been set up and is being expanded to cover all backend services. Tests added so far:

- **Auth service** — registration, login, password change, user update, permissions
- **Security** — JWT token creation and verification, password hashing
- **Soil classifier** — all nutrient classification rules, SHI calculation, override rules, recommendations
- **Prediction history service** — pagination, detail retrieval, deletion
- **Admin user service** — user creation, update, delete, role-based permission rules
- **Admin prediction service** — flag/unflag, delete, response formatting
- **Optimization** — existing tests for the solver, crop mappings, KEPHIS/WOFOST yield models, unit conversions (all passing)

The test suite can be run with:

```bash
python -m pytest api/tests/ -v
```

Tests are ongoing — integration tests against the live database are planned as a next step.

---

## Current Challenge — Stored Class Score vs. Actual Soil Value

### What the problem is

When a farmer submits a soil analysis and provides all values themselves, those exact values are saved to the database. For example, if they enter K = 120 ppm, the database stores 120.

However, when a farmer only provides some values (e.g. just pH) and the ML model fills in the rest, the system currently saves the **classifier score** (a number from 1 to 4) into the same database column rather than a real soil measurement. The score scale is:

| Score | Meaning |
|---|---|
| 1 | Very Poor |
| 2 | Poor |
| 3 | Moderately Healthy |
| 4 | Healthy |

So a stored `potassium = 4` could mean either:
- The farmer measured 4 ppm of K (which is an extremely low, near-zero reading), **or**
- The ML model classified K as class 4 (Healthy, implying a value above 160 ppm)

These are completely different things but they look identical in the database.

### Why it breaks the optimizer

When the soil pre-fill reads `potassium = 4` and passes it to the optimizer as `k_exchangeable_ppm = 4`, the RQUEFTS model receives what it treats as 4 mg/kg of potassium — essentially zero. Potassium at that level is a hard constraint in the model: the crop cannot grow regardless of how much fertilizer is applied, so the optimizer returns zero yield and zero returns for every scenario.

We confirmed this with a direct API test:
- With `k_exchangeable_ppm = 4` → yield = 0, net return = 0
- With `k_exchangeable_ppm = 120` → yield ≈ 5,146 kg/ha, net return ≈ KES 116,833

### Temporary workaround in place

The pre-fill currently skips the K field if the stored value is below 20 ppm. In that case the UI defaults to 120 ppm, which keeps the optimizer functional. The farmer can still type in their actual K value if they know it.

### How we plan to fix it properly

The root cause is that the prediction service writes ML class scores into the same columns as raw soil measurements. The cleanest fix — which requires no database schema change — is to stop doing that.

The database already has a `nutrients` column (stored as JSON) that records the score, the label, and whether each nutrient was **measured** by the farmer or **estimated** by the ML model. That column is the right place for ML output.

The proposed fix:

> **In `prediction_service.py`: when the ML model fills a missing nutrient, store the score only in the `nutrients` JSON column. Leave the raw value column (`potassium`, `phosphorus`, etc.) as `null` if the farmer did not provide a measurement.**

Then in the pre-fill logic on the frontend:

> **Check `nutrients[K].method`. If it is `"measured"`, use the raw value. If it is `"estimated"` (ML), skip pre-fill for that field and keep the default.**

This correctly separates "what the farmer actually measured" from "what the model estimated" and prevents scores from being mistaken for soil values.

---

## What is Next

| Item | Status |
|---|---|
| Fix score-vs-value ambiguity in prediction service | 🔲 Planned |
| Update pre-fill to use `nutrients[K].method` | 🔲 Planned |
| Integration tests against live database | 🔲 Planned |
| KEPHIS quantile UI — change to binary toggle matching actual two-option data | 🔲 Planned |
| Expand optimization to support additional crops and WOFOST parameters | 🔲 Ongoing |
