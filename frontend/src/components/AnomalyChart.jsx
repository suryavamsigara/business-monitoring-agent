import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import { formatCurrency, formatNumber, formatPercent } from "../utils/formatters";

export function AnomalyChart({
  data = [],
  kpiName = "revenue",
  expectedValue = null,
  title = "Historical Actual vs Expected Baseline (Last 30 Days)",
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-500">
        No historical timeseries data available for this metric.
      </div>
    );
  }

  // Determine formatter based on KPI
  const formatYValue = (val) => {
    if (kpiName?.includes("revenue") || kpiName?.includes("aov")) {
      return formatCurrency(val, true);
    }
    if (kpiName?.includes("rate") || kpiName?.includes("conversion")) {
      return formatPercent(val * 100, false);
    }
    return formatNumber(val, true);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const actual = payload[0]?.value;
      const dateStr = new Date(label).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-2xl backdrop-blur-md text-xs">
          <div className="font-semibold text-slate-300 mb-1.5 border-b border-slate-800 pb-1 font-mono">
            {dateStr}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Actual:
              </span>
              <span className="font-mono font-bold text-white">
                {formatYValue(actual)}
              </span>
            </div>
            {expectedValue !== null && (
              <div className="flex items-center justify-between gap-4 text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Expected Baseline:
                </span>
                <span className="font-mono font-medium">
                  {formatYValue(expectedValue)}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Continuous daily observations with 30-day rolling baseline
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Actual</span>
          </div>
          {expectedValue !== null && (
            <div className="flex items-center gap-1.5 text-blue-400">
              <span className="w-2.5 h-0.5 bg-blue-400 border-dashed" />
              <span>Expected Baseline</span>
            </div>
          )}
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
              tickFormatter={(date) => {
                const d = new Date(date);
                return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
              }}
            />

            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
              tickFormatter={formatYValue}
            />

            <Tooltip content={<CustomTooltip />} />

            {expectedValue !== null && (
              <ReferenceLine
                y={expectedValue}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Expected: ${formatYValue(expectedValue)}`,
                  fill: "#38bdf8",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="actual"
              stroke="#f59e0b"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#actualGradient)"
              dot={false}
              activeDot={{ r: 5, fill: "#f59e0b", stroke: "#0f172a", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
