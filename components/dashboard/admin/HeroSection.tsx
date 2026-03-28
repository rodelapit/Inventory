import type { ActiveAlert, ZoneCard, StatCard } from "@/data/dashboard";
import { StatCard as StatCardComponent } from "../shared/StatCard";
import { AlertCard } from "../shared/AlertCard";

type HeroSectionProps = {
  systemStatusTitle: string;
  systemStatusMessage: string;
  statCards: StatCard[];
  zoneCards: ZoneCard[];
  activeAlerts: ActiveAlert[];
};

export function HeroSection({
  systemStatusTitle,
  systemStatusMessage,
  statCards,
  zoneCards,
  activeAlerts,
}: HeroSectionProps) {
  // simple capacity mapping for nicer UI (fallback values)
  const capacityMap: Record<string, number> = {
    "Ambient Storage": 15000,
    "Cold Storage": 5000,
    "Quarantined Stock": 500,
  };

  const totalCapacity = Object.values(capacityMap).reduce((s, v) => s + v, 0);

  return (
    <section id="dashboard-overview" className="space-y-6 xl:space-y-7">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCardComponent key={stat.title} stat={stat} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="space-y-4">
          <div className="rounded-4xl border border-slate-900/8 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_24px_60px_rgba(148,163,184,0.18)] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Storage intelligence</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">Storage zones</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {systemStatusTitle}. {systemStatusMessage}
                </p>
              </div>
              <div className="rounded-full border border-slate-900/8 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                {zoneCards.length} monitored zones
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {zoneCards.map((zone, index) => (
              <article
                key={zone.zone}
                className="min-w-0 overflow-hidden rounded-[28px] border border-slate-900/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-5 shadow-[0_20px_50px_rgba(148,163,184,0.16)]"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                      index === 0
                        ? "bg-sky-100 text-sky-700"
                        : index === 1
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {zone.zone}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      zone.trendUp ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    <span>{zone.trendUp ? "Up" : "Down"}</span>
                  </span>
                </div>
                <p className="mt-5 text-base text-slate-600 sm:text-lg">{zone.name}</p>
                <p className="mt-2 text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-4xl">
                  {zone.units.toLocaleString()}
                </p>
                <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                  <span className={zone.trendUp ? "text-emerald-700" : "text-rose-700"}>
                    {zone.trend}
                  </span>{" "}
                  vs last week
                </p>
                <div className="mt-5 h-2 rounded-full bg-slate-200">
                  <div
                    className={`h-2 rounded-full ${
                      index === 0
                        ? "bg-[linear-gradient(90deg,rgba(14,165,233,1),rgba(59,130,246,1))]"
                        : index === 1
                        ? "bg-[linear-gradient(90deg,rgba(16,185,129,1),rgba(6,182,212,1))]"
                        : "bg-[linear-gradient(90deg,rgba(245,158,11,1),rgba(249,115,22,1))]"
                    }`}
                    style={{ width: `${Math.max(18, Math.min(100, Math.round((zone.units / Math.max(totalCapacity, 1)) * 100 * 3))) }%` }}
                  />
                </div>
              </article>
            ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-4xl border border-slate-900/8 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_24px_60px_rgba(148,163,184,0.18)] sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Attention required</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Active alerts</h2>
              </div>
              <button className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-600">
                View all
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {activeAlerts.map((alert) => (
                <AlertCard key={alert.title} alert={alert} />
              ))}
            </div>

            <div className="mt-5 rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">System note</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Teams respond faster when the dashboard surfaces fewer but clearer exceptions. This layout prioritizes urgency before volume.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
