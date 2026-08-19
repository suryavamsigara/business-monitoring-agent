import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { agentApi } from "../api/agentApi";
import { monitoringApi } from "../api/monitoringApi";
import { dashboardApi } from "../api/dashboardApi";
import { alertsApi } from "../api/alertsApi";
import { AgentStatus } from "../components/AgentStatus";
import { KPICard } from "../components/KPICard";
import { AlertCard } from "../components/AlertCard";
import { AgentTimeline } from "../components/AgentTimeline";
import { AnomalyChart } from "../components/AnomalyChart";
import { LoadingState } from "../components/LoadingState";
import { 
  Bell, 
  ArrowRight, 
  Activity, 
  CheckCircle2
} from "lucide-react";

export function Dashboard({ 
  onOpenAssistant, 
  onRunAgentNow, 
  isAgentRunning, 
  runProgress 
}) {
  const [pulseSummary, setPulseSummary] = useState(null);
  const [agentStatus, setAgentStatus] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, statusRes, kpiRes, trendRes, alertsRes] = await Promise.all([
        dashboardApi.getSummary().catch(() => null),
        agentApi.getStatus().catch(() => null),
        monitoringApi.getKPIs().catch(() => ({ kpis: [] })),
        dashboardApi.getTrends(30).catch(() => ({ trend: [] })),
        alertsApi.list().catch(() => ({ alerts: [] })),
      ]);

      if (summaryRes) setPulseSummary(summaryRes);
      if (statusRes) setAgentStatus(statusRes);
      if (kpiRes?.kpis) setKpis(kpiRes.kpis);
      if (trendRes?.trend) setTrendData(trendRes.trend);
      if (alertsRes?.alerts) setRecentAlerts(alertsRes.alerts.slice(0, 4));
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRunNow = async () => {
    if (onRunAgentNow) {
      await onRunAgentNow();
      await fetchDashboardData();
    }
  };

  if (isLoading) {
    return (
      <LoadingState
        title="Business Pulse Telemetry"
        messages={[
          "Connecting to telemetry engines...",
          "Ingesting multi-channel sales & inventory streams...",
          "Evaluating 30-day rolling baselines & statistical thresholds...",
          "Synthesizing catalog velocity & revenue at risk...",
          "Finalizing executive monitoring overview...",
        ]}
      />
    );
  }

  const alertCounts = pulseSummary?.alert_counts || { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const totalActiveAlerts = Object.values(alertCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      {/* 1. Agent Status Hero Banner */}
      <AgentStatus
        status={agentStatus}
        onRunNow={handleRunNow}
        isRunning={isAgentRunning}
        runProgress={runProgress}
      />

      {/* 2. KPI Health Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-700" />
              Continuous KPI Health Monitor
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live telemetry evaluated against historical baselines and deterministic thresholds
            </p>
          </div>

          <Link
            to="/monitoring"
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 transition-colors"
          >
            Configure Rules
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 8 KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <KPICard key={kpi.kpi_name} kpi={kpi} />
          ))}
        </div>
      </section>

      {/* 3. Alerts Highlight & Summary Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Bell className="w-4 h-4 text-rose-600" />
              Proactive Business Alerts
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Autonomous alerts generated from multi-signal anomaly investigations
            </p>
          </div>

          {/* Severity Counters Bar */}
          <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 border border-slate-200 text-xs font-mono shadow-sm">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>{alertCounts.Critical || 0} Critical</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 font-bold border border-orange-200">
              <span>{alertCounts.High || 0} High</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200">
              <span>{alertCounts.Medium || 0} Medium</span>
            </div>
            <Link
              to="/alerts"
              className="ml-2 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 transition-colors"
            >
              View All ({totalActiveAlerts}) →
            </Link>
          </div>
        </div>

        {/* Alert Cards Grid */}
        {recentAlerts.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-2 shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-900">All Systems Operating Normally</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No critical anomalies breached threshold boundaries in the latest monitoring cycle.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recentAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Bottom Row: 30-Day Trends & Agent Activity Timeline */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-7">
          <AnomalyChart
            data={trendData}
            kpiName="revenue"
            title="30-Day Rolling Business Revenue Telemetry"
          />
        </div>

        {/* Agent Activity Timeline */}
        <div className="lg:col-span-5">
          <AgentTimeline lastRun={agentStatus?.last_run} />
        </div>
      </section>
    </div>
  );
}
