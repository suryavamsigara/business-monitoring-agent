import React from "react";
import { 
  Play, 
  RefreshCw, 
  Bot
} from "lucide-react";
import { cn } from "../utils/cn";

export function Header({
  title = "Agent Overview",
  subtitle = "Autonomous KPI monitoring for business performance",
  onRunNow,
  isRunning = false,
  onOpenAssistant,
  onRefresh,
}) {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px] text-slate-400 hidden sm:block">
            {subtitle}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5">
        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh telemetry"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRunning ? "animate-spin text-amber-400" : "")} />
          </button>
        )}

        {/* Agent Assistant */}
        <button
          onClick={onOpenAssistant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 text-xs font-semibold transition-colors"
        >
          <Bot className="w-3.5 h-3.5 text-amber-400" />
          <span>Ask Agent</span>
        </button>

        {/* Run Agent CTA */}
        <button
          onClick={onRunNow}
          disabled={isRunning}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md",
            isRunning
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-not-allowed"
              : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 active:scale-95"
          )}
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Agent Now</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
