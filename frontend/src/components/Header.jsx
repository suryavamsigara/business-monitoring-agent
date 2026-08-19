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
    <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-slate-500 hidden sm:block">
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
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRunning ? "animate-spin text-slate-900" : "")} />
          </button>
        )}

        {/* Agent Assistant */}
        <button
          onClick={onOpenAssistant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-sm"
        >
          <Bot className="w-3.5 h-3.5 text-slate-700" />
          <span>Ask Agent</span>
        </button>

        {/* Run Agent CTA */}
        <button
          onClick={onRunNow}
          disabled={isRunning}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm",
            isRunning
              ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              : "bg-slate-900 hover:bg-slate-800 text-white active:scale-95"
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
