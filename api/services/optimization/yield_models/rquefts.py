from __future__ import annotations

import csv
import io
import os
import subprocess
import tempfile
from pathlib import Path

from api.services.optimization.core.contracts import CropInput, NPKRate, SoilInput, YieldResult
from api.services.optimization.core.unit_conversions import QUEFTS_PH_MAX, QUEFTS_PH_MIN


def clamp_quefts_ph(ph: float) -> float:
    return min(max(float(ph), QUEFTS_PH_MIN), QUEFTS_PH_MAX)


class RqueftsYieldModel:
    """RQUEFTS batch adapter.

    QUEFTS receives dry attainable yield. The adapter converts QUEFTS dry output
    to sale-weight yield before returning results to the solver/revenue layer.
    """

    def __init__(
        self,
        rscript_executable: str = "Rscript",
        r_libs_path: Path | str | None = None,
        timeout_seconds: float = 30.0,
    ) -> None:
        self.rscript_executable = rscript_executable
        env_r_libs_path = os.environ.get("RQUEFTS_R_LIBS_PATH")
        resolved_r_libs_path = r_libs_path if r_libs_path is not None else env_r_libs_path
        self.r_libs_path = Path(resolved_r_libs_path) if resolved_r_libs_path is not None else None
        self.timeout_seconds = float(timeout_seconds)
        self.batch_calls = 0

    def evaluate_batch(
        self,
        crop: CropInput,
        soil: SoilInput,
        npk_rates: tuple[NPKRate, ...],
    ) -> tuple[YieldResult, ...]:
        if not npk_rates:
            return tuple()

        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=("N", "P", "K"))
            writer.writeheader()
            for rate in npk_rates:
                writer.writerow(
                    {
                        "N": rate.n_kg_ha,
                        "P": rate.p_kg_ha,
                        "K": rate.k_kg_ha,
                    }
                )
            fert_path = Path(handle.name)

        try:
            completed = subprocess.run(
                [self.rscript_executable, "-e", self._r_code(crop, soil, fert_path)],
                capture_output=True,
                text=True,
                timeout=self.timeout_seconds,
                check=False,
            )
        finally:
            fert_path.unlink(missing_ok=True)

        self.batch_calls += 1
        if completed.returncode != 0:
            raise RuntimeError(completed.stderr.strip() or completed.stdout.strip())

        reader = csv.DictReader(io.StringIO(completed.stdout))
        rows = list(reader)
        if len(rows) != len(npk_rates):
            raise RuntimeError(
                f"RQUEFTS returned {len(rows)} rows for {len(npk_rates)} requested rates."
            )

        return tuple(
            YieldResult(
                crop=crop.crop,
                n_kg_ha=float(row["N"]),
                p_kg_ha=float(row["P"]),
                k_kg_ha=float(row["K"]),
                yield_kg_ha=crop.dry_yield_to_sale_weight_kg_ha(float(row["yield_kg_ha"])),
                n_gap_kg_ha=float(row["N_gap_kg_ha"]),
                p_gap_kg_ha=float(row["P_gap_kg_ha"]),
                k_gap_kg_ha=float(row["K_gap_kg_ha"]),
                soil_n_supply_kg_ha=float(row["soil_N_supply_kg_ha"]),
                soil_p_supply_kg_ha=float(row["soil_P_supply_kg_ha"]),
                soil_k_supply_kg_ha=float(row["soil_K_supply_kg_ha"]),
            )
            for row in rows
        )

    def _r_code(self, crop: CropInput, soil: SoilInput, fert_path: Path) -> str:
        lib_paths = ""
        if self.r_libs_path is not None:
            lib_paths = f'.libPaths(c("{self.r_libs_path.as_posix()}", .libPaths()))'
        quefts_ph = clamp_quefts_ph(soil.pH)
        return f'''
{lib_paths}
library(Rquefts)

fert_df <- read.csv("{fert_path.as_posix()}")
supply <- nutSupply1(
  pH = {quefts_ph},
  SOC = {float(soil.soc_g_kg)},
  Kex = {float(soil.kex_mmol_kg)},
  Polsen = {float(soil.p_olsen_mg_kg)}
)

supply_df <- data.frame(
  N = rep(supply[1, "N_base_supply"], nrow(fert_df)),
  P = rep(supply[1, "P_base_supply"], nrow(fert_df)),
  K = rep(supply[1, "K_base_supply"], nrow(fert_df))
)

yatt <- rep({float(crop.y_attainable_kg_ha)}, nrow(fert_df))
q <- quefts(crop = quefts_crop("{crop.rquefts_crop}"))
yield <- batch(q, supply_df, fert_df[, c("N", "P", "K")], yatt, leaf_ratio = 0.46, stem_ratio = 0.56, var = "yield")
gap <- batch(q, supply_df, fert_df[, c("N", "P", "K")], yatt, leaf_ratio = 0.46, stem_ratio = 0.56, var = "gap")

out <- data.frame(
  N = fert_df$N,
  P = fert_df$P,
  K = fert_df$K,
  yield_kg_ha = as.numeric(yield),
  N_gap_kg_ha = gap[, "Ngap"],
  P_gap_kg_ha = gap[, "Pgap"],
  K_gap_kg_ha = gap[, "Kgap"],
  soil_N_supply_kg_ha = supply[1, "N_base_supply"],
  soil_P_supply_kg_ha = supply[1, "P_base_supply"],
  soil_K_supply_kg_ha = supply[1, "K_base_supply"]
)
write.csv(out, stdout(), row.names = FALSE)
'''
