import logging
from ..optimization.core.common import (
    CropInput,
    FertilizerInput,
    ScenarioInput,
    _resolve_phosphorus_fraction,
    _resolve_potassium_fraction,
    normalize_fraction,
    SUPPORTED_CROPS,
)
from ..optimization.core.single_nutrient_nonlinear import solve_nonlinear
from api.schema.optimization_schema import OptimizationRequest, OptimizationResponse

logger = logging.getLogger(__name__)

class OptimizationService:
    @staticmethod
    def optimize(request: OptimizationRequest) -> OptimizationResponse:
        # Convert API schema models to internal core models
        crop_inputs = {}
        for c in request.crops:
            if c.crop not in SUPPORTED_CROPS:
                raise ValueError(f"Crop '{c.crop}' is not supported. Supported: {SUPPORTED_CROPS}")
            crop_inputs[c.crop] = CropInput(
                crop=c.crop,
                area_ac=c.area_ac,
                grain_value_per_kg=c.grain_value_currency_per_kg,
                initial_n_kg_per_ha=float(c.initial_n_kg_per_ha or 0.0),
                initial_p_kg_per_ha=float(c.initial_p_kg_per_ha or 0.0),
                initial_k_kg_per_ha=float(c.initial_k_kg_per_ha or 0.0),
            )
        
        # Auto-fill missing required crops with 0 area constraints
        missing_crops = set(SUPPORTED_CROPS) - set(crop_inputs.keys())
        for missing_crop in missing_crops:
            crop_inputs[missing_crop] = CropInput(
                crop=missing_crop,
                area_ac=0.0,
                grain_value_per_kg=0.0,
                initial_n_kg_per_ha=0.0,
                initial_p_kg_per_ha=0.0,
                initial_k_kg_per_ha=0.0,
            )

        fertilizer_inputs = {}
        for f in request.fertilizers:
            if not f.product:
                 raise ValueError("Product name cannot be empty")
            if f.product in fertilizer_inputs:
                 raise ValueError(f"Duplicate product: {f.product}")
                 
            # Emulate CSV dictionary row for compatibility with provided core logic
            row = {
                "n_pct": str(f.n_pct) if f.n_pct is not None else "",
                "p_pct": str(f.p_pct) if f.p_pct is not None else "",
                "p2o5_pct": str(f.p2o5_pct) if f.p2o5_pct is not None else "",
                "k_pct": str(f.k_pct) if f.k_pct is not None else "",
                "k2o_pct": str(f.k2o_pct) if f.k2o_pct is not None else "",
            }

            n_frac = normalize_fraction(row["n_pct"], f"{f.product} n_pct")
            p_frac = _resolve_phosphorus_fraction(row, f.product)
            k_frac = _resolve_potassium_fraction(row, f.product)

            fertilizer_inputs[f.product] = FertilizerInput(
                product=f.product,
                n_fraction=n_frac,
                p_fraction=p_frac,
                k_fraction=k_frac,
                price_per_50kg=f.price_currency_per_50kg,
            )

        if not fertilizer_inputs:
            raise ValueError("Must provide at least one fertilizer product.")

        scenario_input = ScenarioInput(
            budget=float(request.scenario.budget_currency)
        )

        logger.info("Solving fertilizer optimization...")
        # Execute the non-linear solver
        artifacts = solve_nonlinear(crop_inputs, fertilizer_inputs, scenario_input)
        result = artifacts.result
        
        # Build API response
        return OptimizationResponse(
            status=result.status,
            application_rows=result.application_rows,
            effect_rows=result.effect_rows,
            summary_row=result.summary_row,
            baseline_rows=result.baseline_rows,
            optimal_rows=result.optimal_rows,
            baseline_summary_row=result.baseline_summary_row,
            optimal_summary_row=result.optimal_summary_row,
            delta_rows=result.delta_rows,
            nutrient_balance_rows=result.nutrient_balance_rows,
        )
