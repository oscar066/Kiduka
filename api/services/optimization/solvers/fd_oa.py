from __future__ import annotations

import time
from dataclasses import asdict, dataclass

import numpy as np
from scipy.optimize import linprog

from api.services.optimization.core.contracts import (
    CropInput,
    FertilizerInput,
    NPKRate,
    OptimizationProblem,
    YieldResult,
    crop_scenario_row,
)
from api.services.optimization.core.unit_conversions import kg_per_ha_to_kg_per_ac
from api.services.optimization.yield_models.base import YieldModel


NPK_BOX_LOWER = np.array([0.0, 0.0, 0.0], dtype=float)
NPK_BOX_UPPER = np.array([300.0, 120.0, 200.0], dtype=float)
FD_STEPS = (
    np.array([0.10, 0.050, 0.050], dtype=float),
    np.array([0.05, 0.025, 0.025], dtype=float),
    np.array([0.025, 0.0125, 0.0125], dtype=float),
)
LINPROG_OPTIONS = {
    "primal_feasibility_tolerance": 1e-9,
    "dual_feasibility_tolerance": 1e-9,
    "ipm_optimality_tolerance": 1e-9,
}
NPK_CACHE_DECIMALS = 8
IMPROVEMENT_TOL = 1e-8
ZERO_TOLERANCE = 1e-8


@dataclass(frozen=True)
class FdOaCut:
    crop_idx: int
    center: np.ndarray
    yield_kg_ha: float
    gradient: np.ndarray


@dataclass(frozen=True)
class EvaluatedSolution:
    x_product_kg_ha: np.ndarray
    z_npk_kg_ha: np.ndarray
    yields_kg_ha: np.ndarray
    fertilizer_costs_total: np.ndarray
    revenues_total: np.ndarray
    net_returns_total: np.ndarray

    @property
    def total_fertilizer_cost(self) -> float:
        return float(self.fertilizer_costs_total.sum())

    @property
    def total_revenue(self) -> float:
        return float(self.revenues_total.sum())

    @property
    def total_net_return(self) -> float:
        return float(self.net_returns_total.sum())


@dataclass(frozen=True)
class FdOaSolveResult:
    status: str
    application_rows: list[dict]
    baseline_rows: list[dict]
    feasible_rows: list[dict]
    summary_row: dict
    solver_log: list[dict]


class FdOaSolver:
    """Finite-difference OA search for a feasible QUEFTS fertilizer solution."""

    def __init__(self, yield_model: YieldModel) -> None:
        self.yield_model = yield_model
        self._yield_cache: dict[tuple[int, tuple[float, float, float]], YieldResult] = {}
        self._batch_calls = 0

    def solve(self, problem: OptimizationProblem) -> FdOaSolveResult:
        self._validate_problem(problem)
        self._yield_cache.clear()
        self._batch_calls = 0

        start_time = time.perf_counter()
        deadline = start_time + problem.scenario.time_limit_seconds
        crops = problem.crops
        fertilizers = problem.fertilizers
        nutrient_matrix = self._nutrient_matrix(fertilizers)
        cost_vector = np.array([fert.price_currency_per_kg for fert in fertilizers], dtype=float)
        area_vector = np.array([crop.area_ha for crop in crops], dtype=float)
        price_vector = np.array([crop.price_currency_per_kg for crop in crops], dtype=float)
        yatt_vector = np.array([crop.y_attainable_sale_weight_kg_ha for crop in crops], dtype=float)

        x0 = np.zeros((len(crops), len(fertilizers)), dtype=float)
        baseline = self._evaluate_solution(problem, x0, nutrient_matrix, cost_vector, area_vector, price_vector)
        incumbent = baseline
        cuts: list[FdOaCut] = []
        solver_log: list[dict] = []
        seen_candidates: set[tuple[float, ...]] = set()
        no_improvement_count = 0

        for crop_idx, center in enumerate(baseline.z_npk_kg_ha):
            cuts.extend(self._finite_difference_cuts(problem, crop_idx, center))

        iteration = 0
        while (
            iteration < problem.scenario.max_iterations
            and no_improvement_count < problem.scenario.no_improvement_limit
            and time.perf_counter() < deadline
        ):
            iteration += 1
            master_result = self._solve_master(
                cuts=cuts,
                crop_count=len(crops),
                fertilizer_count=len(fertilizers),
                nutrient_matrix=nutrient_matrix,
                cost_vector=cost_vector,
                area_vector=area_vector,
                price_vector=price_vector,
                yatt_vector=yatt_vector,
                budget_currency=problem.scenario.budget_currency,
                deadline=deadline,
            )

            if not master_result.success or master_result.x is None:
                solver_log.append(
                    {
                        "iteration": iteration,
                        "master_success": False,
                        "master_status": master_result.message,
                        "best_net_return": incumbent.total_net_return,
                    }
                )
                break

            n_x = len(crops) * len(fertilizers)
            candidate_x = np.maximum(master_result.x[:n_x], 0.0).reshape((len(crops), len(fertilizers)))
            candidate_key = tuple(np.round((candidate_x @ nutrient_matrix).ravel(), NPK_CACHE_DECIMALS))
            candidate = self._evaluate_solution(
                problem,
                candidate_x,
                nutrient_matrix,
                cost_vector,
                area_vector,
                price_vector,
            )

            improved = candidate.total_net_return > incumbent.total_net_return + IMPROVEMENT_TOL
            duplicate = candidate_key in seen_candidates
            seen_candidates.add(candidate_key)
            if improved:
                incumbent = candidate
                no_improvement_count = 0
            else:
                no_improvement_count += 1

            added_cuts = 0
            for crop_idx, center in enumerate(candidate.z_npk_kg_ha):
                new_cuts = self._finite_difference_cuts(problem, crop_idx, center)
                cuts.extend(new_cuts)
                added_cuts += len(new_cuts)

            solver_log.append(
                {
                    "iteration": iteration,
                    "master_success": True,
                    "master_objective_estimate": float(-master_result.fun),
                    "candidate_net_return": candidate.total_net_return,
                    "best_net_return": incumbent.total_net_return,
                    "improved": improved,
                    "duplicate_candidate": duplicate,
                    "added_cuts": added_cuts,
                    "elapsed_seconds": time.perf_counter() - start_time,
                }
            )

        elapsed_seconds = time.perf_counter() - start_time
        return self._build_result(
            status=problem.scenario.status_label,
            problem=problem,
            baseline=baseline,
            feasible=incumbent,
            elapsed_seconds=elapsed_seconds,
            iterations=iteration,
            solver_log=solver_log,
        )

    def _validate_problem(self, problem: OptimizationProblem) -> None:
        if not problem.crops:
            raise ValueError("OptimizationProblem must include at least one crop.")
        if not problem.fertilizers:
            raise ValueError("OptimizationProblem must include at least one fertilizer.")
        if problem.scenario.budget_currency < 0:
            raise ValueError("budget_currency must be non-negative.")
        for crop in problem.crops:
            if crop.area_ha <= 0:
                raise ValueError(f"{crop.crop} area_ha must be positive.")
            if crop.price_currency_per_kg <= 0:
                raise ValueError(f"{crop.crop} price_currency_per_kg must be positive.")
            if crop.y_attainable_kg_ha <= 0:
                raise ValueError(f"{crop.crop} y_attainable_kg_ha must be positive.")
            if crop.moisture_content < 0 or crop.moisture_content >= 1:
                raise ValueError(f"{crop.crop} moisture_content must be in [0, 1).")
        for fertilizer in problem.fertilizers:
            if fertilizer.price_currency_per_kg <= 0:
                raise ValueError(f"{fertilizer.product} price_currency_per_kg must be positive.")
            if min(fertilizer.nutrient_fractions) < 0:
                raise ValueError(f"{fertilizer.product} nutrient fractions must be non-negative.")

    def _nutrient_matrix(self, fertilizers: tuple[FertilizerInput, ...]) -> np.ndarray:
        return np.array([fert.nutrient_fractions for fert in fertilizers], dtype=float)

    def _solve_master(
        self,
        cuts: list[FdOaCut],
        crop_count: int,
        fertilizer_count: int,
        nutrient_matrix: np.ndarray,
        cost_vector: np.ndarray,
        area_vector: np.ndarray,
        price_vector: np.ndarray,
        yatt_vector: np.ndarray,
        budget_currency: float,
        deadline: float,
    ):
        n_x = crop_count * fertilizer_count
        n_y = crop_count
        n_vars = n_x + n_y

        def x_index(crop_idx: int, fert_idx: int) -> int:
            return crop_idx * fertilizer_count + fert_idx

        def y_index(crop_idx: int) -> int:
            return n_x + crop_idx

        c = np.zeros(n_vars, dtype=float)
        for crop_idx in range(crop_count):
            for fert_idx in range(fertilizer_count):
                c[x_index(crop_idx, fert_idx)] = area_vector[crop_idx] * cost_vector[fert_idx]
            c[y_index(crop_idx)] = -area_vector[crop_idx] * price_vector[crop_idx]

        a_rows = []
        b_rows = []

        budget_row = np.zeros(n_vars, dtype=float)
        for crop_idx in range(crop_count):
            for fert_idx in range(fertilizer_count):
                budget_row[x_index(crop_idx, fert_idx)] = area_vector[crop_idx] * cost_vector[fert_idx]
        a_rows.append(budget_row)
        b_rows.append(budget_currency)

        for crop_idx in range(crop_count):
            for nutrient_idx in range(3):
                row = np.zeros(n_vars, dtype=float)
                for fert_idx in range(fertilizer_count):
                    row[x_index(crop_idx, fert_idx)] = nutrient_matrix[fert_idx, nutrient_idx]
                a_rows.append(row)
                b_rows.append(NPK_BOX_UPPER[nutrient_idx])

        for cut in cuts:
            row = np.zeros(n_vars, dtype=float)
            for fert_idx in range(fertilizer_count):
                row[x_index(cut.crop_idx, fert_idx)] = -float(nutrient_matrix[fert_idx] @ cut.gradient)
            row[y_index(cut.crop_idx)] = 1.0
            a_rows.append(row)
            b_rows.append(float(cut.yield_kg_ha - cut.gradient @ cut.center))

        options = dict(LINPROG_OPTIONS)
        remaining = max(0.05, deadline - time.perf_counter())
        options["time_limit"] = remaining

        return linprog(
            c=c,
            A_ub=np.vstack(a_rows),
            b_ub=np.asarray(b_rows, dtype=float),
            bounds=[(0.0, None)] * n_x + [(0.0, float(yatt)) for yatt in yatt_vector],
            method="highs",
            options=options,
        )

    def _finite_difference_cuts(
        self,
        problem: OptimizationProblem,
        crop_idx: int,
        center: np.ndarray,
    ) -> list[FdOaCut]:
        center = np.clip(np.asarray(center, dtype=float), NPK_BOX_LOWER, NPK_BOX_UPPER)
        points = [center]
        for steps in FD_STEPS:
            for nutrient_idx, step in enumerate(steps):
                if center[nutrient_idx] - step >= NPK_BOX_LOWER[nutrient_idx] - ZERO_TOLERANCE:
                    lower = center.copy()
                    lower[nutrient_idx] -= step
                    points.append(lower)
                if center[nutrient_idx] + step <= NPK_BOX_UPPER[nutrient_idx] + ZERO_TOLERANCE:
                    upper = center.copy()
                    upper[nutrient_idx] += step
                    points.append(upper)

        unique_points = self._unique_npk_points(points)
        self._populate_yield_cache(problem, crop_idx, unique_points)
        values = {
            self._npk_key(point): self._yield_cache[(crop_idx, self._npk_key(point))].yield_kg_ha
            for point in unique_points
        }
        center_value = values[self._npk_key(center)]
        cuts: list[FdOaCut] = []
        for steps in FD_STEPS:
            gradient = np.zeros(3, dtype=float)
            for nutrient_idx, step in enumerate(steps):
                lower = center.copy()
                lower[nutrient_idx] -= step
                upper = center.copy()
                upper[nutrient_idx] += step
                lower_ok = lower[nutrient_idx] >= NPK_BOX_LOWER[nutrient_idx] - ZERO_TOLERANCE
                upper_ok = upper[nutrient_idx] <= NPK_BOX_UPPER[nutrient_idx] + ZERO_TOLERANCE
                if lower_ok and upper_ok:
                    gradient[nutrient_idx] = (
                        values[self._npk_key(upper)] - values[self._npk_key(lower)]
                    ) / (2.0 * step)
                elif upper_ok:
                    gradient[nutrient_idx] = (
                        values[self._npk_key(upper)] - center_value
                    ) / step
                elif lower_ok:
                    gradient[nutrient_idx] = (
                        center_value - values[self._npk_key(lower)]
                    ) / step
            cuts.append(
                FdOaCut(
                    crop_idx=crop_idx,
                    center=center.copy(),
                    yield_kg_ha=float(center_value),
                    gradient=gradient,
                )
            )
        return cuts

    def _populate_yield_cache(
        self,
        problem: OptimizationProblem,
        crop_idx: int,
        points: list[np.ndarray],
    ) -> None:
        crop = problem.crops[crop_idx]
        missing_points: list[np.ndarray] = []
        missing_keys: list[tuple[int, tuple[float, float, float]]] = []
        for point in self._unique_npk_points(points):
            key = (crop_idx, self._npk_key(point))
            if key in self._yield_cache:
                continue
            missing_points.append(point)
            missing_keys.append(key)

        if not missing_points:
            return

        rates = tuple(
            NPKRate(float(point[0]), float(point[1]), float(point[2]))
            for point in missing_points
        )
        results = self.yield_model.evaluate_batch(crop, problem.soil, rates)
        self._batch_calls += 1
        if len(results) != len(missing_keys):
            raise RuntimeError(
                f"Yield model returned {len(results)} rows for {len(missing_keys)} requested rates."
            )
        for key, result in zip(missing_keys, results):
            self._yield_cache[key] = result

    def _cached_yield(
        self,
        problem: OptimizationProblem,
        crop_idx: int,
        npk: np.ndarray,
    ) -> YieldResult:
        key = (crop_idx, self._npk_key(npk))
        if key not in self._yield_cache:
            crop = problem.crops[crop_idx]
            rate = NPKRate(float(npk[0]), float(npk[1]), float(npk[2]))
            self._yield_cache[key] = self.yield_model.evaluate_batch(
                crop,
                problem.soil,
                (rate,),
            )[0]
            self._batch_calls += 1
        return self._yield_cache[key]

    def _evaluate_solution(
        self,
        problem: OptimizationProblem,
        x_product_kg_ha: np.ndarray,
        nutrient_matrix: np.ndarray,
        cost_vector: np.ndarray,
        area_vector: np.ndarray,
        price_vector: np.ndarray,
    ) -> EvaluatedSolution:
        x = np.maximum(np.asarray(x_product_kg_ha, dtype=float), 0.0)
        z = np.clip(x @ nutrient_matrix, NPK_BOX_LOWER, NPK_BOX_UPPER)
        yields = np.zeros(len(problem.crops), dtype=float)
        for crop_idx, npk in enumerate(z):
            yields[crop_idx] = self._cached_yield(problem, crop_idx, npk).yield_kg_ha
        fertilizer_costs_total = area_vector * (x @ cost_vector)
        revenues_total = area_vector * price_vector * yields
        return EvaluatedSolution(
            x_product_kg_ha=x,
            z_npk_kg_ha=z,
            yields_kg_ha=yields,
            fertilizer_costs_total=fertilizer_costs_total,
            revenues_total=revenues_total,
            net_returns_total=revenues_total - fertilizer_costs_total,
        )

    def _build_result(
        self,
        status: str,
        problem: OptimizationProblem,
        baseline: EvaluatedSolution,
        feasible: EvaluatedSolution,
        elapsed_seconds: float,
        iterations: int,
        solver_log: list[dict],
    ) -> FdOaSolveResult:
        application_rows = self._application_rows(problem, feasible)
        baseline_rows = [
            asdict(crop_scenario_row(crop, baseline.yields_kg_ha[idx], baseline.fertilizer_costs_total[idx]))
            for idx, crop in enumerate(problem.crops)
        ]
        feasible_rows = [
            asdict(crop_scenario_row(crop, feasible.yields_kg_ha[idx], feasible.fertilizer_costs_total[idx]))
            for idx, crop in enumerate(problem.crops)
        ]
        budget_used = feasible.total_fertilizer_cost
        summary_row = {
            "status": status,
            "budget_currency": problem.scenario.budget_currency,
            "budget_used": budget_used,
            "budget_remaining": problem.scenario.budget_currency - budget_used,
            "baseline_revenue_total": baseline.total_revenue,
            "feasible_revenue_total": feasible.total_revenue,
            "baseline_net_return_total": baseline.total_net_return,
            "feasible_net_return_total": feasible.total_net_return,
            "net_return_improvement": feasible.total_net_return - baseline.total_net_return,
            "solver_time_seconds": elapsed_seconds,
            "oa_iterations": iterations,
            "yield_evaluations": len(self._yield_cache),
            "yield_batch_calls": self._batch_calls,
        }
        return FdOaSolveResult(
            status=status,
            application_rows=application_rows,
            baseline_rows=baseline_rows,
            feasible_rows=feasible_rows,
            summary_row=summary_row,
            solver_log=solver_log,
        )

    def _application_rows(
        self,
        problem: OptimizationProblem,
        feasible: EvaluatedSolution,
    ) -> list[dict]:
        rows: list[dict] = []
        for crop_idx, crop in enumerate(problem.crops):
            for fert_idx, fertilizer in enumerate(problem.fertilizers):
                rate_kg_ha = float(feasible.x_product_kg_ha[crop_idx, fert_idx])
                if rate_kg_ha <= ZERO_TOLERANCE:
                    continue
                kg_total = rate_kg_ha * crop.area_ha
                rows.append(
                    {
                        "crop": crop.crop,
                        "fertilizer": fertilizer.product,
                        "kg_product_per_ha": rate_kg_ha,
                        "kg_product_per_ac": kg_per_ha_to_kg_per_ac(rate_kg_ha),
                        "kg_product_total": kg_total,
                        "cost_total": kg_total * fertilizer.price_currency_per_kg,
                    }
                )
        return rows

    def _npk_key(self, npk: np.ndarray) -> tuple[float, float, float]:
        return tuple(float(value) for value in np.round(npk, NPK_CACHE_DECIMALS))

    def _unique_npk_points(self, points: list[np.ndarray]) -> list[np.ndarray]:
        unique: dict[tuple[float, float, float], np.ndarray] = {}
        for point in points:
            clipped = np.clip(np.asarray(point, dtype=float), NPK_BOX_LOWER, NPK_BOX_UPPER)
            unique[self._npk_key(clipped)] = clipped
        return list(unique.values())
