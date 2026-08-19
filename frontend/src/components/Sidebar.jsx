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
      badgeColor: criticalCount > 0 ? "bg-rose-500 text-white animate-pulse" : "bg-amber-500 text-slate-950 font-bold",
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
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between flex-shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>Business Pulse</span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Agent
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Autonomous KPI Watcher
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group",
                    isActive
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "w-4 h-4 transition-colors",
                          isActive ? "text-amber-400" : "text-slate-400 group-hover:text-slate-200"
                        )}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-mono font-bold",
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
      <div className="p-3 space-y-2.5 border-t border-slate-800/80 bg-slate-950/80">
        {/* Agent Assistant Button */}
        <button
          onClick={onOpenAssistant}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30 hover:border-amber-500/60 text-amber-300 text-xs font-semibold transition-all shadow-sm group"
        >
          <div className="flex items-center gap-2.5">
            <Bot className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div>Agent Assistant</div>
              <div className="text-[10px] text-slate-400 font-normal">Ask about detections</div>
            </div>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </button>

        {/* Live Engine Status Banner */}
        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Scheduler Active
            </span>
            <span className="text-[10px] text-slate-400">Supabase</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {agentStatus?.last_run
              ? `Last checked ${agentStatus.last_run.anomalies_detected} anomalies`
              : "Continuous observation mode"}
          </div>
        </div>
      </div>
    </aside>
  );
}
