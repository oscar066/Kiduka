from __future__ import annotations

import logging
from dataclasses import asdict

from api.schema.optimization_schema import OptimizationRequest, OptimizationResponse
from api.services.optimization.core.contracts import (
    CropInput,
    FertilizerInput,
    GeoLocation,
    OptimizationProblem,
    OptimizationScenario,
    SoilInput,
    YAttConfig,
    YAttSource,
)
from api.services.optimization.core.crop_mappings import resolve_busia_crop
from api.services.optimization.core.unit_conversions import (
    QUEFTS_K_EXCHANGEABLE_MAX_PPM,
    QUEFTS_P_OLSEN_MAX_MG_KG,
    QUEFTS_PH_MAX,
    QUEFTS_PH_MIN,
    QUEFTS_SOC_MAX_PERCENT,
    acres_to_hectares,
    k2o_fraction_to_k,
    p2o5_fraction_to_p,
)
from api.services.optimization.solvers.fd_oa import FdOaSolver
from api.services.optimization.yield_models.base import YieldModel
from api.services.optimization.yield_models.kephis_yatt import KephisYAttProvider
from api.services.optimization.yield_models.rquefts import RqueftsYieldModel
from api.services.optimization.yield_models.yatt import build_yatt_provider


logger = logging.getLogger(__name__)


class OptimizationService:
    """
    Service class responsible for coordinating fertilizer optimization requests.
    
    Translates raw API requests into canonical problem definitions, delegates
    the mathematical solving to an appropriate solver (e.g., FdOaSolver), and
    formats the results back into a response schema.
    """
    
    @staticmethod
    def optimize(
        request: OptimizationRequest,
        *,
        yield_model: YieldModel | None = None,
    ) -> OptimizationResponse:
        """
        Execute the core fertilizer optimization pipeline.
        
        Args:
            request (OptimizationRequest): The incoming request payload containing soil data,
                target crops, available fertilizers, and scenario constraints.
            yield_model (Optional[YieldModel]): An optional, overridden yield model to use.
                Defaults to the RQUEFTS model if not provided.
                
        Returns:
            OptimizationResponse: The summarized outcomes including recommended applications,
                baseline expectations, and optimization execution logs.
        """
        problem = OptimizationService._build_problem(request)
        solver = FdOaSolver(yield_model or RqueftsYieldModel())
        result = solver.solve(problem)
        return OptimizationResponse(
            status=result.status,
            application_rows=result.application_rows,
            baseline_rows=result.baseline_rows,
            feasible_rows=result.feasible_rows,
            summary_row=result.summary_row,
            solver_log=result.solver_log,
        )

    @staticmethod
    def _build_problem(request: OptimizationRequest) -> OptimizationProblem:
        """
        Transform a raw Pydantic request into a strongly-typed OptimizationProblem.
        
        Handles unit conversions (acres to hectares), cross-references crop aliases
        to their canonical internal names, and builds nutrient fraction records for
        the available fertilizers.
        
        Args:
            request (OptimizationRequest): The raw incoming payload.
            
        Returns:
            OptimizationProblem: A structured, validated data class ready for the mathematical solver.
            
        Raises:
            ValueError: If duplicate crops or fertilizers are detected in the payload.
        """
        soil = OptimizationService._resolve_soil(request)
        yatt_provider = build_yatt_provider(OptimizationService._build_yatt_config(request))
        moisture_provider = KephisYAttProvider()

        crops: list[CropInput] = []
        seen_crops: set[str] = set()
        for crop_model in request.crops:
            mapping = resolve_busia_crop(crop_model.crop)
            if mapping.display_name in seen_crops:
                raise ValueError(f"Duplicate crop: {mapping.display_name}")
            seen_crops.add(mapping.display_name)
            area_ha = crop_model.area_ha if crop_model.area_ha is not None else acres_to_hectares(crop_model.area_ac)
            crops.append(
                CropInput(
                    crop=mapping.display_name,
                    area_ha=float(area_ha),
                    price_currency_per_kg=float(crop_model.grain_price_currency_per_kg),
                    kephis_crop=mapping.kephis_crop,
                    rquefts_crop=mapping.rquefts_crop,
                    y_attainable_kg_ha=yatt_provider.get_y_attainable_kg_ha(mapping.display_name),
                    moisture_content=moisture_provider.get_moisture_content(mapping.display_name),
                )
            )

        fertilizers: list[FertilizerInput] = []
        seen_products: set[str] = set()
        for fertilizer_model in request.fertilizers:
            product = fertilizer_model.product.strip()
            if product in seen_products:
                raise ValueError(f"Duplicate fertilizer product: {product}")
            seen_products.add(product)
            fertilizers.append(
                FertilizerInput(
                    product=product,
                    n_fraction=float(fertilizer_model.n_fraction),
                    p_fraction=OptimizationService._elemental_p_fraction(fertilizer_model),
                    k_fraction=OptimizationService._elemental_k_fraction(fertilizer_model),
                    price_currency_per_kg=OptimizationService._price_currency_per_kg(fertilizer_model),
                )
            )

        scenario = OptimizationScenario(
            budget_currency=float(request.scenario.budget_currency),
            time_limit_seconds=float(request.scenario.solver.time_limit_seconds),
            max_iterations=int(request.scenario.solver.max_iterations),
            no_improvement_limit=int(request.scenario.solver.no_improvement_limit),
            status_label="Feasible",
        )
        return OptimizationProblem(
            soil=soil,
            crops=tuple(crops),
            fertilizers=tuple(fertilizers),
            scenario=scenario,
        )

    @staticmethod
    def _resolve_soil(request: OptimizationRequest) -> SoilInput:
        """
        Extract and validate the soil input data from the request.
        
        Currently mandates 'direct' input mode, as the 'history' resolution
        is meant to be implemented upstream of this service layer.
        
        Args:
            request (OptimizationRequest): The raw incoming payload.
            
        Returns:
            SoilInput: Internal data class representing soil nutrient levels.
            
        Raises:
            ValueError: If the soil mode is set to 'history'.
        """
        soil = request.soil
        if soil.mode == "history":
            raise ValueError(
                "soil.mode='history' is part of the interface, but no soil-analysis resolver is wired yet. "
                "Resolve the history record upstream and call optimization with soil.mode='direct'."
            )
        return SoilInput(
            pH=min(max(float(soil.ph), QUEFTS_PH_MIN), QUEFTS_PH_MAX),
            soc_percent=min(float(soil.soc_percent), QUEFTS_SOC_MAX_PERCENT),
            p_olsen_ppm=min(float(soil.p_olsen_ppm), QUEFTS_P_OLSEN_MAX_MG_KG),
            k_ppm=min(float(soil.k_exchangeable_ppm), QUEFTS_K_EXCHANGEABLE_MAX_PPM),
        )

    @staticmethod
    def _build_yatt_config(request: OptimizationRequest) -> YAttConfig:
        """
        Compile the Attainable Yield (Y_att) configuration based on scenario settings.
        
        Args:
            request (OptimizationRequest): The raw incoming payload.
            
        Returns:
            YAttConfig: Configuration detailing which data source (e.g. KEPHIS vs WOFOST)
                should be used for crop yield predictions.
                
        Raises:
            ValueError: If WOFOST is selected but geographic coordinates are missing.
        """
        yatt = request.scenario.y_att
        location = None
        if request.location is not None:
            location = GeoLocation(lat=request.location.lat, lon=request.location.lon)
        if yatt.source == YAttSource.WOFOST.value and location is None:
            raise ValueError("location is required when scenario.y_att.source='wofost'.")
        return YAttConfig(
            source=YAttSource(yatt.source),
            location=location,
            wofost_sowing_date=yatt.wofost_sowing_date,
            wofost_elevation_m=yatt.wofost_elevation_m,
            wofost_fallback_to_kephis=bool(yatt.fallback_to_kephis),
        )

    @staticmethod
    def _elemental_p_fraction(fertilizer_model) -> float:
        """Calculate elemental Phosphorus (P) mass fraction from either P or P2O5."""
        if fertilizer_model.p_fraction is not None:
            return float(fertilizer_model.p_fraction)
        if fertilizer_model.p2o5_fraction is not None:
            return p2o5_fraction_to_p(float(fertilizer_model.p2o5_fraction))
        return 0.0

    @staticmethod
    def _elemental_k_fraction(fertilizer_model) -> float:
        """Calculate elemental Potassium (K) mass fraction from either K or K2O."""
        if fertilizer_model.k_fraction is not None:
            return float(fertilizer_model.k_fraction)
        if fertilizer_model.k2o_fraction is not None:
            return k2o_fraction_to_k(float(fertilizer_model.k2o_fraction))
        return 0.0

    @staticmethod
    def _price_currency_per_kg(fertilizer_model) -> float:
        """Determine price per kg directly or by dividing package price by package weight."""
        if fertilizer_model.price_currency_per_kg is not None:
            return float(fertilizer_model.price_currency_per_kg)
        return float(fertilizer_model.package_price_currency) / float(fertilizer_model.package_weight_kg)


def problem_as_dict(request: OptimizationRequest) -> dict:
    """Helper for owners wiring upstream inputs to inspect the canonical problem."""

    return asdict(OptimizationService._build_problem(request))
