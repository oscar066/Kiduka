from api.schema.optimization_schema import SolverConfigModel
from api.services.optimization.core.contracts import OptimizationScenario
from api.services.optimization.solvers.fd_oa import IMPROVEMENT_TOL, MIN_OA_ITERATIONS


def test_solver_defaults_match_stress_test_settings():
    schema_defaults = SolverConfigModel()
    assert schema_defaults.time_limit_seconds == 30.0
    assert schema_defaults.max_iterations == 50

    scenario = OptimizationScenario(budget_currency=1000.0)
    assert scenario.time_limit_seconds == 30.0
    assert scenario.max_iterations == 50


def test_solver_stopping_tolerances_are_not_numerical_noise():
    assert IMPROVEMENT_TOL == 1.0
    assert MIN_OA_ITERATIONS == 3
