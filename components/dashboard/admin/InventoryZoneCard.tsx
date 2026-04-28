import { Thermometer, Droplets, TrendingUp, TrendingDown } from "lucide-react";

interface InventoryZoneCardProps {
  label: string;
  name: string;
  current: number;
  capacity: number;
  utilization: number;
  temperature: string;
  humidity: string;
  color: "indigo" | "cyan" | "amber" | "blue" | "violet" | "pink";
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function InventoryZoneCard({
  label,
  name,
  current,
  capacity,
  utilization,
  temperature,
  humidity,
  color,
  trend
}: InventoryZoneCardProps) {
  const colorClasses = {
    indigo: {
      badge: "bg-indigo-50 text-indigo-800",
      progress: "bg-indigo-500",
      ring: "ring-indigo-100",
    },
    cyan: {
      badge: "bg-sky-50 text-sky-800",
      progress: "bg-sky-500",
      ring: "ring-sky-100",
    },
    amber: {
      badge: "bg-amber-50 text-amber-800",
      progress: "bg-amber-400",
      ring: "ring-amber-100",
    },
    blue: {
      badge: "bg-sky-50 text-sky-900",
      progress: "bg-sky-500",
      ring: "ring-sky-100",
    },
    violet: {
      badge: "bg-violet-50 text-violet-800",
      progress: "bg-violet-500",
      ring: "ring-violet-100",
    },
    pink: {
      badge: "bg-pink-50 text-pink-800",
      progress: "bg-pink-500",
      ring: "ring-pink-100",
    },
  };

  const classes = colorClasses[color];
  const utilizationColor = utilization >= 90 ? "text-rose-400" : utilization >= 75 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className={`group relative overflow-hidden rounded-3xl border border-slate-900/6 bg-white/95 p-6 shadow-[0_22px_55px_rgba(148,163,184,0.18)] ring-1 ring-inset ${classes.ring} transition hover:-translate-y-0.5`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${classes.badge}`}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          {trend && (
            <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${trend.isPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <span className="text-sm">⚙️</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="mt-4 text-lg font-semibold text-slate-900 sm:text-xl">
        {name}
      </h3>

      {/* Utilization Progress */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Utilization</span>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${utilizationColor}`}>
              {utilization}%
            </span>
            {utilization >= 90 && <span className="text-xs text-rose-400">⚠️</span>}
          </div>
        </div>
        <div className="mt-3 h-3 rounded-full bg-slate-100">
          <div
            className={`h-3 rounded-full ${classes.progress} transition-all duration-500`}
            style={{ width: `${utilization}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Current</p>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {current.toLocaleString()}
            <span className="ml-1 text-sm text-slate-400">units</span>
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Capacity</p>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {capacity.toLocaleString()}
            <span className="ml-1 text-sm text-slate-400">units</span>
          </p>
        </div>
      </div>

      {/* Environmental Data */}
      <div className="mt-6 flex gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
          <Thermometer className="h-4 w-4 text-slate-500" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Temperature</p>
            <p className="text-sm font-semibold text-slate-900">{temperature}</p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
          <Droplets className="h-4 w-4 text-slate-500" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Humidity</p>
            <p className="text-sm font-semibold text-slate-900">{humidity}</p>
          </div>
        </div>
      </div>
    </div>
  );
}