import React, { useState, useEffect } from "react";
import { monitoringApi } from "../api/monitoringApi";
import { LoadingState } from "../components/LoadingState";
import { StatusBadge } from "../components/StatusBadge";
import { 
  Sliders, 
  Edit2, 
  Save, 
  X 
} from "lucide-react";
import { cn } from "../utils/cn";

export function Monitoring() {
  const [kpis, setKpis] = useState([]);
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [kpiRes, ruleRes] = await Promise.all([
        monitoringApi.getKPIs().catch(() => ({ kpis: [] })),
        monitoringApi.getRules().catch(() => ({ rules: [] })),
      ]);

      if (kpiRes?.kpis) setKpis(kpiRes.kpis);
      if (ruleRes?.rules) setRules(ruleRes.rules);
    } catch (err) {
      console.error("Failed to load monitoring rules:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleRule = async (rule) => {
    try {
      const updated = await monitoringApi.updateRule(rule.id, {
        enabled: !rule.enabled,
      });
      if (updated) {
        setRules((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, enabled: !rule.enabled } : r))
        );
      }
    } catch (err) {
      console.error("Failed to toggle rule:", err);
    }
  };

  const handleStartEdit = (rule) => {
    setEditingRuleId(rule.id);
    setEditForm({
      threshold_value: rule.threshold_value,
      severity: rule.severity,
      cooldown_minutes: rule.cooldown_minutes,
      enabled: rule.enabled,
    });
  };

  const handleSaveEdit = async (ruleId) => {
    try {
      const updated = await monitoringApi.updateRule(ruleId, editForm);
      if (updated) {
        setRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, ...editForm } : r))
        );
        setEditingRuleId(null);
      }
    } catch (err) {
      console.error("Failed to save rule updates:", err);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading deterministic KPI monitoring configurations..." />;
  }

  const KPI_CONFIG_METADATA = {
    revenue: {
      category: "Commercial",
      method: "Historical deviation + threshold (z-score)",
      baseline: "30-day rolling baseline",
    },
    orders: {
      category: "Commercial",
      method: "Relative WoW & historical deviation",
      baseline: "30-day moving average",
    },
    avg_order_value: {
      category: "Commercial",
      method: "Rolling baseline + threshold",
      baseline: "30-day moving average",
    },
    conversion_rate: {
      category: "Customer Behavior",
      method: "Compound anomaly (Traffic vs Conversion)",
      baseline: "Category baseline",
    },
    return_rate: {
      category: "Customer Behavior",
      method: "Statistical anomaly (Surge above threshold)",
      baseline: "Category historical rate",
    },
    marketplace_revenue: {
      category: "Marketplace Channel",
      method: "Channel-specific deviation & trend",
      baseline: "Channel historical average",
    },
    inventory_days: {
      category: "Supply Chain",
      method: "Deterministic stock-out threshold (< 14 days)",
      baseline: "Current sales velocity",
    },
    sales_velocity: {
      category: "Supply Chain",
      method: "Daily unit run-rate deviation",
      baseline: "30-day average daily units",
    },
    revenue_at_risk: {
      category: "Commercial Exposure",
      method: "Expected stock-out loss formula",
      baseline: "Catalog inventory coverage",
    },
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-slate-800" />
            Deterministic KPI Monitoring Rules
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure automated monitoring methods, breach thresholds, severity scoring, and alert deduplication cooldowns.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{rules.filter((r) => r.enabled).length} Rules Active</span>
          </div>
          <span>•</span>
          <span>Evaluation Cycle: 15 mins</span>
        </div>
      </div>

      {/* Rules Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Monitored KPI Configuration Matrix
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            Deterministic rule engine
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 uppercase font-semibold text-[11px]">
                <th className="py-3 px-4">KPI / Category</th>
                <th className="py-3 px-4">Monitoring</th>
                <th className="py-3 px-4">Detection Strategy</th>
                <th className="py-3 px-4">Baseline Strategy</th>
                <th className="py-3 px-4 text-center">Breach Threshold</th>
                <th className="py-3 px-4 text-center">Severity</th>
                <th className="py-3 px-4 text-center">Cooldown</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {rules.map((rule) => {
                const meta = KPI_CONFIG_METADATA[rule.kpi_name] || {
                  category: "General",
                  method: "Deterministic threshold",
                  baseline: "Rolling baseline",
                };
                const isEditing = editingRuleId === rule.id;

                return (
                  <tr
                    key={rule.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* KPI & Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-sm">
                        {rule.kpi_name.replace(/_/g, " ").toUpperCase()}
                      </div>
                      <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {meta.category}
                      </span>
                    </td>

                    {/* Enabled Toggle */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleRule(rule)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all",
                          rule.enabled
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            rule.enabled ? "bg-emerald-500" : "bg-slate-400"
                          )}
                        />
                        {rule.enabled ? "ON" : "OFF"}
                      </button>
                    </td>

                    {/* Detection Method */}
                    <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px] max-w-[200px]">
                      {meta.method}
                    </td>

                    {/* Baseline */}
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {meta.baseline}
                    </td>

                    {/* Threshold Value */}
                    <td className="py-3.5 px-4 text-center font-mono whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.threshold_value}
                          onChange={(e) =>
                            setEditForm({ ...editForm, threshold_value: parseFloat(e.target.value) })
                          }
                          className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-center text-slate-900 focus:outline-none focus:border-slate-800 font-mono text-xs shadow-sm"
                        />
                      ) : (
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          ±{(rule.threshold_value * 100).toFixed(0)}%
                        </span>
                      )}
                    </td>

                    {/* Severity */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {isEditing ? (
                        <select
                          value={editForm.severity}
                          onChange={(e) => setEditForm({ ...editForm, severity: e.target.value })}
                          className="bg-white border border-slate-300 text-slate-900 rounded px-2 py-1 text-xs focus:outline-none focus:border-slate-800 shadow-sm"
                        >
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      ) : (
                        <StatusBadge status={rule.severity} size="xs" />
                      )}
                    </td>

                    {/* Cooldown */}
                    <td className="py-3.5 px-4 text-center font-mono text-slate-500 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.cooldown_minutes}
                          onChange={(e) =>
                            setEditForm({ ...editForm, cooldown_minutes: parseInt(e.target.value) })
                          }
                          className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-center text-slate-900 focus:outline-none focus:border-slate-800 font-mono text-xs shadow-sm"
                        />
                      ) : (
                        `${rule.cooldown_minutes} mins`
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleSaveEdit(rule.id)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            title="Save rule"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingRuleId(null)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(rule)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors inline-flex items-center gap-1 text-[11px] shadow-sm"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Configure</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
