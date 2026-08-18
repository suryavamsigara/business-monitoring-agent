from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Text
)
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.session import Base


class MonitoringRule(Base):
    __tablename__ = "monitoring_rules"

    id = Column(Integer, primary_key=True)
    kpi_name = Column(String, nullable=False, index=True)
    enabled = Column(Boolean, default=True)
    threshold_type = Column(String, nullable=False)  # relative_change | rolling_baseline | zscore | compound
    threshold_value = Column(Float, nullable=False)  # e.g. 0.10 for 10%
    severity = Column(String, nullable=False, default="Medium")
    cooldown_minutes = Column(Integer, default=120)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True)
    kpi_name = Column(String, nullable=False, index=True)
    detected_at = Column(DateTime, default=datetime.utcnow, index=True)
    actual_value = Column(Float, nullable=False)
    expected_value = Column(Float, nullable=False)
    deviation_pct = Column(Float, nullable=False)
    score = Column(Float, nullable=False)  # severity score 0-100
    severity = Column(String, nullable=False)  # Low/Medium/High/Critical
    status = Column(String, default="Open")  # Open/Superseded
    entity_type = Column(String, nullable=True)  # marketplace | product | business
    entity_id = Column(Integer, nullable=True)
    marketplace_id = Column(Integer, ForeignKey("marketplaces.id"), nullable=True)
    detection_method = Column(String, nullable=False)  # threshold | relative_change | rolling_baseline | zscore | compound
    anomaly_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(Integer, primary_key=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="Running")  # Running/Completed/Failed
    kpis_checked = Column(Integer, default=0)
    anomalies_detected = Column(Integer, default=0)
    alerts_created = Column(Integer, default=0)
    trigger = Column(String, default="manual")  # manual | scheduled
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    steps = relationship("AgentStep", back_populates="run", order_by="AgentStep.id")


class AgentStep(Base):
    __tablename__ = "agent_steps"

    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("agent_runs.id"), nullable=False, index=True)
    step_name = Column(String, nullable=False)  # Observe/Detect/Investigate/Reason/Prioritize/Alert
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="Running")  # Running/Completed/Failed/Skipped
    duration_ms = Column(Integer, nullable=True)
    output_summary = Column(Text, nullable=True)
    step_metadata = Column(JSON, default=dict)

    run = relationship("AgentRun", back_populates="steps")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True)
    anomaly_id = Column(Integer, ForeignKey("anomalies.id"), nullable=False, index=True)
    run_id = Column(Integer, ForeignKey("agent_runs.id"), nullable=True)
    title = Column(String, nullable=False)
    kpi_name = Column(String, nullable=False, index=True)
    entity_type = Column(String, nullable=True)
    entity_name = Column(String, nullable=True)
    marketplace_id = Column(Integer, ForeignKey("marketplaces.id"), nullable=True)
    severity = Column(String, nullable=False, index=True)
    actual_value = Column(Float, nullable=False)
    expected_value = Column(Float, nullable=False)
    deviation_pct = Column(Float, nullable=False)
    estimated_impact = Column(Float, nullable=True)
    summary = Column(Text, nullable=False)
    evidence = Column(JSON, default=list)          # list[str]
    contributors = Column(JSON, default=list)       # list[dict]
    recommendations = Column(JSON, default=list)    # list[dict]
    confidence = Column(Float, default=0.5)
    ai_mode = Column(String, default="llm")  # llm | fallback
    status = Column(String, default="New", index=True)  # New/Investigating/Acknowledged/Resolved/Dismissed
    dedup_key = Column(String, nullable=False, index=True)
    occurrence_count = Column(Integer, default=1)
    last_detected_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    dismissed_at = Column(DateTime, nullable=True)

    anomaly = relationship("Anomaly")