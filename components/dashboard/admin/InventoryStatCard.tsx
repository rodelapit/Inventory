import { Package, Archive, TrendingUp, BarChart3 } from "lucide-react";

interface InventoryStatCardProps {
  title: string;
  value: string | number;
  description: string;
  iconName: "Package" | "Archive" | "TrendingUp" | "BarChart3";
  color: "purple" | "cyan" | "emerald" | "fuchsia";
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const iconMap = {
  Package,
  Archive,
  TrendingUp,
  BarChart3,
};

export function InventoryStatCard({ title, value, description, iconName, color, trend }: InventoryStatCardProps) {
  const Icon = iconMap[iconName];

  const colorClasses = {
    purple: {
      badge: "bg-violet-100 text-violet-800",
      iconBg: "bg-violet-100 text-violet-700",
      value: "text-slate-900",
    },
    cyan: {
      badge: "bg-sky-100 text-sky-800",
      iconBg: "bg-sky-100 text-sky-700",
      value: "text-slate-900",
    },
    emerald: {
      badge: "bg-emerald-100 text-emerald-800",
      iconBg: "bg-emerald-100 text-emerald-700",
      value: "text-slate-900",
    },
    fuchsia: {
      badge: "bg-pink-100 text-pink-800",
      iconBg: "bg-pink-100 text-pink-700",
      value: "text-slate-900",
    },
  };

  const classes = colorClasses[color];

  return (
    <div className="group rounded-3xl border border-slate-900/6 bg-white/90 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(148,163,184,0.22)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${classes.badge}`}>
            {title}
          </p>
          <p className={`mt-3 text-2xl font-bold sm:text-3xl ${classes.value}`}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">{description}</p>
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <span className={trend.isPositive ? "font-semibold text-emerald-600" : "font-semibold text-rose-600"}>
                {trend.isPositive ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-slate-500">vs last month</span>
            </div>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${classes.iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}