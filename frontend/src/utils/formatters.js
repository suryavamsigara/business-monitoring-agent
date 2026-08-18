/**
 * Business formatting utilities for currency, metrics, percentages, and timestamps.
 */

export function formatCurrency(value, compact = false) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  const num = Number(value);
  
  if (compact) {
    if (Math.abs(num) >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(num) >= 100000) {
      return `₹${(num / 100000).toFixed(1)}L`;
    }
    if (Math.abs(num) >= 1000) {
      return `₹${(num / 1000).toFixed(0)}K`;
    }
    return `₹${num.toFixed(0)}`;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(value, compact = false) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  const num = Number(value);
  if (compact && Math.abs(num) >= 1000) {
    if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (Math.abs(num) >= 100000) return `${(num / 100000).toFixed(1)}L`;
    return `${(num / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(num);
}

export function formatPercent(value, includeSign = true) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  const num = Number(value);
  const sign = includeSign && num > 0 ? "+" : "";
  return `${sign}${num.toFixed(1)}%`;
}

export function formatRelativeTime(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function formatTime(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}
