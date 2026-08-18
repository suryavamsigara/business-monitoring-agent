from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database.session import get_db
from app.repositories.monitoring_rule_repository import MonitoringRuleRepository
from app.analytics.analytics_engine import AnalyticsEngine

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])

KPI_LABELS = {
    "revenue": "Revenue", "orders": "Orders", "avg_order_value": "Average Order Value",
    "conversion_rate": "Conversion Rate", "return_rate": "Return Rate",
    "marketplace_revenue": "Marketplace Revenue", "inventory_days": "Inventory Days",
    "sales_velocity": "Sales Velocity",
}

STATUS_THRESHOLDS = {
    # kpi -> (warning_pct, critical_pct) deviation magnitude, direction-aware in code below
    "revenue": (5, 10), "orders": (5, 12), "avg_order_value": (8, 15),
    "conversion_rate": (8, 15), "return_rate": (20, 35),
}


@router.get("/kpis")
def get_monitored_kpis(db: Session = Depends(get_db)):
    engine = AnalyticsEngine(db)
    rules = {r.kpi_name: r for r in MonitoringRuleRepository(db).list()}
    results = []
    for key in ["revenue", "orders", "avg_order_value", "conversion_rate", "return_rate"]:
        kpi = engine._kpi_with_growth(key, days=30)
        rule = rules.get(key)
        growth = kpi["growth_pct"]
        warn, crit = STATUS_THRESHOLDS.get(key, (10, 20))
        # for return_rate, "worse" is positive growth; for the rest, "worse" is negative
        worse_direction = growth if key == "return_rate" else -growth
        status = "Healthy"
        if worse_direction >= crit:
            status = "Critical"
        elif worse_direction >= warn:
            status = "Warning"
        results.append({
            "kpi_name": key, "label": KPI_LABELS.get(key, key), "value": kpi["value"],
            "previous": kpi["previous"], "growth_pct": growth, "status": status,
            "monitoring_enabled": rule.enabled if rule else False,
            "threshold_pct": (rule.threshold_value * 100) if rule else None,
            "severity_if_breached": rule.severity if rule else None,
        })

    # Inventory days + sales velocity + revenue at risk (aggregate, business-wide)
    rows = engine.get_product_table(days=30)
    at_risk = [r for r in rows if r["days_of_stock"] is not None and r["days_of_stock"] < 14]
    total_revenue_at_risk = sum(r["revenue_at_risk"] for r in at_risk)
    avg_velocity = round(sum(r["sales_velocity"] for r in rows) / len(rows), 2) if rows else 0

    results.append({
        "kpi_name": "inventory_days", "label": "Inventory Days (at-risk products)",
        "value": len(at_risk), "previous": None, "growth_pct": None,
        "status": "Critical" if len(at_risk) > 10 else "Warning" if len(at_risk) > 3 else "Healthy",
        "monitoring_enabled": True, "threshold_pct": None, "severity_if_breached": "Critical",
    })
    results.append({
        "kpi_name": "sales_velocity", "label": "Avg Sales Velocity (units/day)",
        "value": avg_velocity, "previous": None, "growth_pct": None, "status": "Healthy",
        "monitoring_enabled": True, "threshold_pct": None, "severity_if_breached": "Medium",
    })
    results.append({
        "kpi_name": "revenue_at_risk", "label": "Revenue at Risk (est.)",
        "value": round(total_revenue_at_risk, 2), "previous": None, "growth_pct": None,
        "status": "Critical" if total_revenue_at_risk > 500000 else "Warning" if total_revenue_at_risk > 100000 else "Healthy",
        "monitoring_enabled": True, "threshold_pct": None, "severity_if_breached": "High",
    })
    return {"kpis": results}


@router.get("/rules")
def list_rules(db: Session = Depends(get_db)):
    rules = MonitoringRuleRepository(db).list()
    return {"rules": [
        {
            "id": r.id, "kpi_name": r.kpi_name, "enabled": r.enabled, "threshold_type": r.threshold_type,
            "threshold_value": r.threshold_value, "severity": r.severity, "cooldown_minutes": r.cooldown_minutes,
        } for r in rules
    ]}


class RuleCreate(BaseModel):
    kpi_name: str
    threshold_type: str
    threshold_value: float
    severity: str = "Medium"
    cooldown_minutes: int = 120
    enabled: bool = True


class RuleUpdate(BaseModel):
    enabled: Optional[bool] = None
    threshold_value: Optional[float] = None
    severity: Optional[str] = None
    cooldown_minutes: Optional[int] = None


@router.post("/rules")
def create_rule(body: RuleCreate, db: Session = Depends(get_db)):
    repo = MonitoringRuleRepository(db)
    rule = repo.create(**body.dict())
    db.commit()
    return {"id": rule.id, "kpi_name": rule.kpi_name}


@router.patch("/rules/{rule_id}")
def update_rule(rule_id: int, body: RuleUpdate, db: Session = Depends(get_db)):
    repo = MonitoringRuleRepository(db)
    rule = repo.update(rule_id, **body.dict())
    if not rule:
        raise HTTPException(404, "Monitoring rule not found")
    db.commit()
    return {"id": rule.id, "enabled": rule.enabled, "threshold_value": rule.threshold_value}