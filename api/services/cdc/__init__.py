"""
CDC services package.

Exposes the two service classes used by the CDC router:
- CDCService         — farmer lookup, analysis submission, and activity history.
- CDCDashboardService — aggregated statistics for the CDC dashboard overview.
"""
from .cdc_service import CDCService
from .cdc_dashboard_service import CDCDashboardService

__all__ = ["CDCService", "CDCDashboardService"]
