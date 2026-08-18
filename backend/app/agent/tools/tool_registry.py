"""
ToolRegistry: decouples the orchestrator/AI layer from concrete tool
implementations. Tools are registered once per request/run with their
dependencies (db session, analytics engine) already injected.
"""
from app.agent.tools.base import AgentTool


class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, AgentTool] = {}

    def register(self, tool: AgentTool) -> None:
        self._tools[tool.name] = tool

    def get(self, name: str) -> AgentTool | None:
        return self._tools.get(name)

    def execute(self, name: str, **kwargs):
        tool = self.get(name)
        if not tool:
            return {"error": f"Unknown tool '{name}'"}
        try:
            return tool.execute(**kwargs)
        except TypeError as e:
            return {"error": f"Invalid arguments for tool '{name}': {e}"}

    def schemas(self) -> list[dict]:
        return [t.schema() for t in self._tools.values()]

    def all_tools(self) -> list[AgentTool]:
        return list(self._tools.values())


def build_investigation_registry(db, engine) -> ToolRegistry:
    from app.agent.tools.investigation_tools import (
        GetLatestKPIsTool, GetHistoricalKPIDataTool, GetMarketplacePerformanceTool,
        GetProductContributorsTool, GetInventoryRisksTool, GetConversionAnomaliesTool,
        GetReturnAnomaliesTool, EstimateRevenueImpactTool, GetRelatedOpportunitiesTool,
        GetActiveAlertsTool,
    )
    registry = ToolRegistry()
    for tool in [
        GetLatestKPIsTool(engine), GetHistoricalKPIDataTool(engine), GetMarketplacePerformanceTool(engine),
        GetProductContributorsTool(engine), GetInventoryRisksTool(engine), GetConversionAnomaliesTool(engine),
        GetReturnAnomaliesTool(engine), EstimateRevenueImpactTool(engine), GetRelatedOpportunitiesTool(engine),
        GetActiveAlertsTool(db),
    ]:
        registry.register(tool)
    return registry