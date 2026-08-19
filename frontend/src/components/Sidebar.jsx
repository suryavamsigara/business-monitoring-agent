import React from "react";
import { NavLink } from "react-router-dom";
import { 
  Activity, 
  Bell, 
  Terminal, 
  Sliders, 
  Bot, 
  Sparkles
} from "lucide-react";
import { cn } from "../utils/cn";

export function Sidebar({ 
  alertCount = 0, 
  criticalCount = 0, 
  onOpenAssistant, 
  agentStatus = null 
}) {
  const navItems = [
    {
      label: "Agent Overview",
      to: "/",
      icon: Activity,
      exact: true,
    },
    {
      label: "Business Alerts",
      to: "/alerts",
      icon: Bell,
      badge: alertCount > 0 ? alertCount : null,
      badgeColor: criticalCount > 0 ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-800",
    },
    {
      label: "KPI Monitor",
      to: "/monitoring",
      icon: Sliders,
    },
    {
      label: "Agent Runs & Audit",
      to: "/runs",
      icon: Terminal,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between flex-shrink-0 h-screen sticky top-0 shadow-[1px_0_2px_rgba(0,0,0,0.02)]">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold shadow-sm">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
              <span>Business Pulse</span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Agent
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-sans">
              Autonomous KPI Watcher
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors group",
                    isActive
                      ? "bg-slate-900 text-white font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "w-4 h-4 transition-colors",
                          isActive ? "text-white" : "text-slate-500 group-hover:text-slate-900"
                        )}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded font-mono font-bold",
                          item.badgeColor
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Tools & Status */}
      <div className="p-3 space-y-2 border-t border-slate-100">
        {/* Agent Assistant Button */}
        <button
          onClick={onOpenAssistant}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium transition-colors group shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <Bot className="w-4 h-4 text-slate-700" />
            <div className="text-left">
              <div className="font-semibold text-slate-900">Agent Assistant</div>
              <div className="text-[10px] text-slate-500">Ask about detections</div>
            </div>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-slate-500" />
        </button>

        {/* Live Engine Status Banner */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-mono">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Scheduler Active
            </span>
            <span className="text-[10px] text-slate-400">Supabase</span>
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            {agentStatus?.last_run
              ? `Last checked ${agentStatus.last_run.anomalies_detected} anomalies`
              : "Continuous observation mode"}
          </div>
        </div>
      </div>
    </aside>
  );
}
