import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { formatCurrency, formatNumber, formatPercent } from "../utils/formatters";
import { AlertCircle, ShieldAlert } from "lucide-react";

export function AnomalyChart({
  data = [],
  kpiName = "revenue",
  expectedValue = null,
  title = "Historical Actual vs Expected Baseline (Last 30 Days)",
}) {
  const isInventory = kpiName?.includes("inventory") || kpiName?.includes("stock");

  if (!data || data.length === 0) {
    if (isInventory) {
      return (
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Inventory Supply & Buffer Status
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Current warehouse stock balance relative to safety buffer threshold
              </p>
            </div>
            <span className="text-xs font-mono text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Stockout Hazard
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Current Inventory</div>
              <div className="text-xl font-bold font-mono text-rose-600">0.0 Days</div>
              <p className="text-[11px] text-slate-500">Warehouse stock exhausted (0 units on hand)</p>
            </div>

            <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Target Safety Buffer</div>
              <div className="text-xl font-bold font-mono text-slate-900">14.0 Days</div>
              <p className="text-[11px] text-slate-500">Recommended operational lead time reserve</p>
            </div>

            <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Supply Deficit</div>
              <div className="text-xl font-bold font-mono text-amber-700">-100.0% Deficit</div>
              <p className="text-[11px] text-slate-500">Immediate purchase order required</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-8 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-2">
        <AlertCircle className="w-6 h-6 text-slate-400" />
        <p>Point-in-time KPI evaluated snapshot.</p>
      </div>
    );
  }

  // Determine formatter based on KPI
  const formatYValue = (val) => {
    if (kpiName?.includes("revenue") || kpiName?.includes("aov")) {
      return formatCurrency(val, true);
    }
    if (kpiName?.includes("rate") || kpiName?.includes("conversion")) {
      return formatPercent(val, false);
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
        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg text-xs">
          <div className="font-semibold text-slate-800 mb-1.5 border-b border-slate-100 pb-1 font-mono">
            {dateStr}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2 h-2 rounded-full bg-slate-900" />
                Actual:
              </span>
              <span className="font-mono font-bold text-slate-900">
                {formatYValue(actual)}
              </span>
            </div>
            {expectedValue !== null && (
              <div className="flex items-center justify-between gap-4 text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Expected Baseline:
                </span>
                <span className="font-mono font-medium text-slate-700">
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
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Continuous daily observations with 30-day rolling baseline
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-900 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            <span>Actual</span>
          </div>
          {expectedValue !== null && (
            <div className="flex items-center gap-1.5 text-blue-600 font-medium">
              <span className="w-2.5 h-0.5 bg-blue-600 border-dashed" />
              <span>Expected Baseline</span>
            </div>
          )}
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="actualGradientClean" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f172a" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#0f172a" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              tickFormatter={(date) => {
                const d = new Date(date);
                return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
              }}
            />

            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              tickFormatter={formatYValue}
            />

            <Tooltip content={<CustomTooltip />} />

            {expectedValue !== null && (
              <ReferenceLine
                y={expectedValue}
                stroke="#2563eb"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Expected: ${formatYValue(expectedValue)}`,
                  fill: "#2563eb",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="actual"
              stroke="#0f172a"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#actualGradientClean)"
              dot={false}
              activeDot={{ r: 4, fill: "#0f172a", stroke: "#ffffff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
