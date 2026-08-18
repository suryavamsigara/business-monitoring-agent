from pydantic import BaseModel, Field
from typing import Optional, Literal, Any
from datetime import datetime


class InvestigationResult(BaseModel):
    """Structured, validated output of the AI investigation layer."""
    summary: str
    key_findings: list[str] = Field(default_factory=list)
    contributors: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    estimated_impact: Optional[float] = None
    severity: Literal["low", "medium", "high", "critical"]
    confidence: float = Field(ge=0.0, le=1.0)
    alert_required: bool = True


class AnomalySummary(BaseModel):
    kpi_name: str
    detection_method: str
    actual_value: float
    expected_value: float
    deviation_pct: float
    entity_type: Optional[str] = None
    entity_name: Optional[str] = None
    marketplace_id: Optional[int] = None


class AgentState(BaseModel):
    """Structured state threaded through the orchestrator's run."""
    run_id: Optional[int] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    trigger: str = "manual"

    metrics: dict[str, Any] = Field(default_factory=dict)
    anomalies: list[dict] = Field(default_factory=list)

    current_anomaly: Optional[dict] = None
    evidence: list[str] = Field(default_factory=list)
    contributors: list[dict] = Field(default_factory=list)
    recommendations: list[dict] = Field(default_factory=list)
    severity: Optional[str] = None
    confidence: float = 0.5

    alert_required: bool = False
    alerts_created: int = 0
    status: str = "running"  # running | completed | failed

    class Config:
        arbitrary_types_allowed = True