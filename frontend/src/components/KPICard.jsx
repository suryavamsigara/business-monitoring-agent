import React from "react";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency, formatNumber, formatPercent } from "../utils/formatters";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  DollarSign, 
  ShoppingBag, 
  Percent, 
  RotateCcw, 
  CreditCard, 
  Package, 
  Zap, 
  AlertOctagon 
} from "lucide-react";
import { cn } from "../utils/cn";

const KPI_ICONS = {
  revenue: DollarSign,
  orders: ShoppingBag,
  conversion_rate: Percent,
  return_rate: RotateCcw,
  avg_order_value: CreditCard,
  inventory_days: Package,
  sales_velocity: Zap,
  revenue_at_risk: AlertOctagon,
};

export function KPICard({ kpi, onClick }) {
  const {
    kpi_name,
    label,
    value,
    previous,
    growth_pct,
    status = "Healthy",
    threshold_pct,
    severity_if_breached,
  } = kpi;

  const Icon = KPI_ICONS[kpi_name] || Zap;

  // Format value depending on KPI type
  const renderFormattedValue = () => {
    if (kpi_name === "revenue" || kpi_name === "revenue_at_risk") {
      return formatCurrency(value, true);
    }
    if (kpi_name === "avg_order_value") {
      return formatCurrency(value, false);
    }
    if (kpi_name === "conversion_rate" || kpi_name === "return_rate") {
      return formatPercent(value, false);
    }
    if (kpi_name === "inventory_days") {
      return `${value} Products`;
    }
    if (kpi_name === "sales_velocity") {
      return `${value} /day`;
    }
    return formatNumber(value, true);
  };

  const renderPreviousValue = () => {
    if (previous === null || previous === undefined) return null;
    if (kpi_name === "revenue") return `Prev: ${formatCurrency(previous, true)}`;
    if (kpi_name === "avg_order_value") return `Prev: ${formatCurrency(previous, false)}`;
    if (kpi_name === "conversion_rate" || kpi_name === "return_rate") {
      return `Prev: ${formatPercent(previous, false)}`;
    }
    return `Prev: ${formatNumber(previous, true)}`;
  };

  // Determine trend icon and color
  // Note: for return_rate, positive growth is bad (worse), negative is good.
  const isPositiveGrowth = growth_pct > 0;
  const isGood = kpi_name === "return_rate" ? growth_pct < 0 : growth_pct > 0;

  const statusBorderClass = {
    Healthy: "border-slate-800 hover:border-emerald-500/40",
    Warning: "border-amber-500/30 hover:border-amber-500/60 shadow-[0_0_15px_-5px_rgba(245,158,11,0.2)]",
    Critical: "border-rose-500/40 hover:border-rose-500/70 shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]",
  }[status] || "border-slate-800";

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border p-5 transition-all duration-300 group hover:-translate-y-0.5",
        statusBorderClass,
        onClick ? "cursor-pointer" : ""
      )}
    >
      {/* Header with Title and Status */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-300 group-hover:text-amber-400 transition-colors">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {label || kpi_name.replace("_", " ")}
            </h4>
          </div>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      {/* Main KPI Value */}
      <div className="mt-2 mb-3">
        <div className="text-2xl font-bold tracking-tight text-white font-mono">
          {renderFormattedValue()}
        </div>
      </div>

      {/* Footer: Trend & Baseline context */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-xs">
        {growth_pct !== null && growth_pct !== undefined ? (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center font-medium font-mono text-[11px]",
                isGood ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {growth_pct > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              ) : growth_pct < 0 ? (
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
              ) : (
                <Minus className="w-3.5 h-3.5 mr-0.5 text-slate-400" />
              )}
              {formatPercent(growth_pct)}
            </span>
            <span className="text-slate-500 text-[11px]">vs 30d baseline</span>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px]">
            {threshold_pct ? `Threshold: ±${threshold_pct}%` : "Rolling baseline active"}
          </span>
        )}

        {renderPreviousValue() && (
          <span className="text-slate-400 font-mono text-[11px]">
            {renderPreviousValue()}
          </span>
        )}
      </div>
    </div>
  );
}
