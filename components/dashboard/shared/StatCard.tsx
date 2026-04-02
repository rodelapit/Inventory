import type { StatCard as StatCardType } from "@/data/dashboard";
import { Package, AlertTriangle, TrendingUp, Users } from "lucide-react";

type StatCardProps = {
  stat: StatCardType;
};

function getIconComponent(iconName: string) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Package,
    AlertTriangle,
    TrendingUp,
    Users,
  };
  return iconMap[iconName] || Package;
}

export function StatCard({ stat }: StatCardProps) {
  const Icon = getIconComponent(stat.iconName);
  const tone =
    stat.changeType === "positive"
      ? "text-emerald-700 border-emerald-500/14 bg-emerald-500/10"
      : stat.changeType === "negative"
      ? "text-rose-700 border-rose-500/14 bg-rose-500/10"
      : "text-slate-700 border-slate-900/8 bg-slate-100";

  return (
    <div className="overflow-hidden rounded-[30px] border border-emerald-100 bg-white p-6 shadow-[0_24px_60px_rgba(148,163,184,0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_70px_rgba(148,163,184,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{stat.title}</p>
          <p className="mt-4 text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-4xl">
            {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
          </p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(220,252,231,0.85))] shadow-[0_18px_32px_rgba(148,163,184,0.14)]">
          <Icon className="h-6 w-6 text-emerald-700" />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${tone}`}>
          {stat.change}
        </span>
        <span className="text-sm text-slate-500">from last month</span>
      </div>
    </div>
  );
}