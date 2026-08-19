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
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
      icon: CheckCircle2,
    },
    warning: {
      label: "Warning",
      bg: "bg-amber-50 text-amber-800 border-amber-200",
      dot: "bg-amber-500",
      icon: AlertTriangle,
    },
    critical: {
      label: "Critical",
      bg: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
      icon: AlertOctagon,
    },
    high: {
      label: "High",
      bg: "bg-orange-50 text-orange-700 border-orange-200",
      dot: "bg-orange-500",
      icon: AlertTriangle,
    },
    medium: {
      label: "Medium",
      bg: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
      icon: AlertTriangle,
    },
    low: {
      label: "Low",
      bg: "bg-slate-100 text-slate-700 border-slate-200",
      dot: "bg-slate-500",
      icon: ShieldAlert,
    },

    // Alert Lifecycle
    new: {
      label: "New",
      bg: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-500",
      icon: Clock,
    },
    investigating: {
      label: "Investigating",
      bg: "bg-purple-50 text-purple-700 border-purple-200",
      dot: "bg-purple-500",
      icon: Search,
    },
    acknowledged: {
      label: "Acknowledged",
      bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
      dot: "bg-indigo-500",
      icon: Clock,
    },
    resolved: {
      label: "Resolved",
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
      icon: CheckCheck,
    },
    dismissed: {
      label: "Dismissed",
      bg: "bg-slate-100 text-slate-600 border-slate-200",
      dot: "bg-slate-400",
      icon: XCircle,
    },
    completed: {
      label: "Completed",
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
      icon: CheckCircle2,
    },
    failed: {
      label: "Failed",
      bg: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
      icon: AlertOctagon,
    },
  };

  const config = configs[normalized] || {
    label: status,
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
    icon: Clock,
  };

  const sizeClasses = {
    xs: "text-[10px] px-2 py-0.5 gap-1",
    sm: "text-xs px-2.5 py-0.5 gap-1.5",
    md: "text-xs px-2.5 py-1 gap-1.5 font-medium",
    lg: "text-sm px-3.5 py-1.5 gap-2 font-medium",
  }[size];

  const dotSizes = {
    xs: "w-1 h-1",
    sm: "w-1.5 h-1.5",
    md: "w-1.5 h-1.5",
    lg: "w-2 h-2",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        config.bg,
        sizeClasses,
        className
      )}
    >
      <span className={cn("rounded-full flex-shrink-0", config.dot, dotSizes)} />
      {config.label}
    </span>
  );
}
