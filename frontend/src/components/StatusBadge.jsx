import React from "react";
import { cn } from "../utils/cn";
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Clock, 
  Search, 
  CheckCheck, 
  XCircle, 
  ShieldAlert 
} from "lucide-react";

export function StatusBadge({ status, size = "md", className = "" }) {
  if (!status) return null;

  const normalized = String(status).toLowerCase();

  const configs = {
    // Health / Severity
    healthy: {
      label: "Healthy",
      bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
      icon: CheckCircle2,
    },
    warning: {
      label: "Warning",
      bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
      icon: AlertTriangle,
    },
    critical: {
      label: "Critical",
      bg: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      dot: "bg-rose-400 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.7)]",
      icon: AlertOctagon,
    },
    high: {
      label: "High",
      bg: "bg-orange-500/15 text-orange-400 border-orange-500/30",
      dot: "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]",
      icon: AlertTriangle,
    },
    medium: {
      label: "Medium",
      bg: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      dot: "bg-amber-400",
      icon: AlertTriangle,
    },
    low: {
      label: "Low",
      bg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      dot: "bg-blue-400",
      icon: ShieldAlert,
    },

    // Alert Lifecycle
    new: {
      label: "New",
      bg: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      dot: "bg-cyan-400 animate-pulse",
      icon: Clock,
    },
    investigating: {
      label: "Investigating",
      bg: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      dot: "bg-purple-400 animate-pulse",
      icon: Search,
    },
    acknowledged: {
      label: "Acknowledged",
      bg: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      dot: "bg-blue-400",
      icon: Clock,
    },
    resolved: {
      label: "Resolved",
      bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      dot: "bg-emerald-400",
      icon: CheckCheck,
    },
    dismissed: {
      label: "Dismissed",
      bg: "bg-slate-700/30 text-slate-400 border-slate-600/30",
      dot: "bg-slate-500",
      icon: XCircle,
    },
    completed: {
      label: "Completed",
      bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      dot: "bg-emerald-400",
      icon: CheckCircle2,
    },
    failed: {
      label: "Failed",
      bg: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      dot: "bg-rose-400",
      icon: AlertOctagon,
    },
  };

  const config = configs[normalized] || {
    label: status,
    bg: "bg-slate-800 text-slate-300 border-slate-700",
    dot: "bg-slate-400",
    icon: Clock,
  };

  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0.5 gap-1",
    sm: "text-xs px-2 py-0.5 gap-1.5",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  }[size];

  const dotSizes = {
    xs: "w-1 h-1",
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border tracking-wide",
        config.bg,
        sizeClasses,
        className
      )}
    >
      <span className={cn("rounded-full", config.dot, dotSizes)} />
      {config.label}
    </span>
  );
}
