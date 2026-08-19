import React, { useState, useEffect } from "react";
import { alertsApi } from "../api/alertsApi";
import { AlertTable } from "../components/AlertTable";
import { 
  Bell, 
  Filter, 
  Search, 
  RefreshCw 
} from "lucide-react";
import { cn } from "../utils/cn";

export function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [countsBySeverity, setCountsBySeverity] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedKPI, setSelectedKPI] = useState("all");
  const [selectedMarketplace, setSelectedMarketplace] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const filters = {};
      if (selectedSeverity !== "all") filters.severity = selectedSeverity;
      if (selectedKPI !== "all") filters.kpi_name = selectedKPI;
      if (selectedMarketplace !== "all") filters.marketplace = selectedMarketplace;
      if (selectedStatus !== "all") filters.status = selectedStatus;

      const res = await alertsApi.list(filters);
      if (res) {
        setAlerts(res.alerts || []);
        setCountsBySeverity(res.counts_by_severity || {});
      }
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [selectedSeverity, selectedKPI, selectedMarketplace, selectedStatus]);

  const handleStatusChange = async (alertId, newStatus) => {
    try {
      const updated = await alertsApi.updateStatus(alertId, newStatus);
      if (updated) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Client-side search filtering on title, entity, and summary
  const filteredAlerts = alerts.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.title?.toLowerCase().includes(q) ||
      a.entity_name?.toLowerCase().includes(q) ||
      a.kpi_name?.toLowerCase().includes(q) ||
      a.summary?.toLowerCase().includes(q)
    );
  });

  const criticalCount = countsBySeverity.Critical || 0;
  const highCount = countsBySeverity.High || 0;
  const mediumCount = countsBySeverity.Medium || 0;
  const lowCount = countsBySeverity.Low || 0;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-rose-600" />
            Business Alerts & Anomaly Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic anomalies investigated and prioritized by the autonomous agent with deduplication rules.
          </p>
        </div>

        {/* Metric Cards Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white p-2 rounded-xl border border-slate-200 text-xs font-mono shadow-sm">
          <div className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-center">
            <div className="text-sm font-bold text-rose-700">{criticalCount}</div>
            <div className="text-[10px] uppercase font-semibold text-slate-500">Critical</div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-center">
            <div className="text-sm font-bold text-orange-700">{highCount}</div>
            <div className="text-[10px] uppercase font-semibold text-slate-500">High</div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-center">
            <div className="text-sm font-bold text-amber-800">{mediumCount}</div>
            <div className="text-[10px] uppercase font-semibold text-slate-500">Medium</div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
            <div className="text-sm font-bold text-slate-700">{lowCount}</div>
            <div className="text-[10px] uppercase font-semibold text-slate-500">Low</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, SKU, marketplace, or summary..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
            />
          </div>

          {/* Select Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-800"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical Only</option>
              <option value="High">High Only</option>
              <option value="Medium">Medium Only</option>
              <option value="Low">Low Only</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-800"
            >
              <option value="all">All Statuses</option>
              <option value="New">New</option>
              <option value="Investigating">Investigating</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Resolved">Resolved</option>
              <option value="Dismissed">Dismissed</option>
            </select>

            {/* Marketplace Filter */}
            <select
              value={selectedMarketplace}
              onChange={(e) => setSelectedMarketplace(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-800"
            >
              <option value="all">All Channels</option>
              <option value="Amazon">Amazon</option>
              <option value="Myntra">Myntra</option>
              <option value="Flipkart">Flipkart</option>
              <option value="Ajio">Ajio</option>
            </select>

            {/* Refresh */}
            <button
              onClick={fetchAlerts}
              title="Refresh alerts"
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading ? "animate-spin text-slate-900" : "")} />
            </button>
          </div>
        </div>

        {/* Quick Filter Badges */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs overflow-x-auto">
          <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {["all", "Critical", "High", "New", "Investigating"].map((chip) => (
            <button
              key={chip}
              onClick={() => {
                if (chip === "all") {
                  setSelectedSeverity("all");
                  setSelectedStatus("all");
                } else if (chip === "Critical" || chip === "High") {
                  setSelectedSeverity(chip);
                } else {
                  setSelectedStatus(chip);
                }
              }}
              className={cn(
                "px-2.5 py-0.5 rounded-md text-[11px] font-medium border transition-colors",
                (selectedSeverity === chip || selectedStatus === chip || (chip === "all" && selectedSeverity === "all" && selectedStatus === "all"))
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              {chip === "all" ? "Show All" : chip}
            </button>
          ))}
        </div>
      </div>

      {/* Main Alert Table */}
      <AlertTable
        alerts={filteredAlerts}
        onStatusChange={handleStatusChange}
        isLoading={isLoading}
      />
    </div>
  );
}
