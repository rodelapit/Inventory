import type { ActiveAlert, ZoneCard, StatCard } from "@/data/dashboard";
import { StatCard as StatCardComponent } from "../shared/StatCard";
import { AlertCard } from "../shared/AlertCard";

type StaffHeroSectionProps = {
  systemStatusTitle: string;
  systemStatusMessage: string;
  statCards: StatCard[];
  zoneCards: ZoneCard[];
  activeAlerts: ActiveAlert[];
};

export function StaffHeroSection({
  systemStatusTitle,
  systemStatusMessage,
  statCards,
  zoneCards,
  activeAlerts,
}: StaffHeroSectionProps) {
  const totalCurrent = zoneCards.reduce((s, z) => s + z.units, 0);

  return (
    <section id="staff-dashboard-overview" className="space-y-6 xl:space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-900/60 px-3 py-1 text-xs font-semibold text-indigo-200 ring-1 ring-indigo-500/40">
            <span className="text-base">2️⃣</span>
            <span>Staff Dashboard · Limited Access</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight text-violet-300 sm:text-4xl xl:text-5xl">
            Daily store operations hub
          </h1>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base xl:text-lg">
            The Staff handles day-to-day store work: serving customers, updating stock, and watching for low or expiring items.
          </p>
        </div>

        <div className="w-full rounded-2xl border border-white/10 bg-[#0b1230] p-4 text-sm text-slate-200 shadow-[0_0_24px_rgba(15,23,42,0.9)] sm:text-base lg:w-90">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Main features
          </p>
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>📦 View Products</li>
            <li>🧾 Process Sales</li>
            <li>📥 Update Stock</li>
            <li>⚠️ View Expiry / Low Stock Notifications</li>
            <li>📋 View Inventory List</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCardComponent key={stat.title} stat={stat} />
        ))}
      </div>

      <div
        id="staff-system-status"
        className="flex items-center gap-4 rounded-2xl border border-emerald-700/40 bg-linear-to-r from-emerald-950/80 to-sky-950/60 p-4 sm:p-5 lg:p-6"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600/25 shadow-[0_0_32px_rgba(52,211,153,0.5)] sm:h-14 sm:w-14">
          <div className="h-6 w-6 rounded-full bg-emerald-400/80" />
        </div>
        <div>
          <p className="text-lg font-semibold text-emerald-300 sm:text-xl xl:text-2xl">{systemStatusTitle}</p>
          <p className="mt-1 text-sm text-emerald-100/80 sm:text-base xl:text-lg">{systemStatusMessage}</p>
          <p className="mt-1 text-xs text-emerald-200/80 sm:text-sm">
            Live on-floor stock: <span className="font-semibold text-emerald-100">{totalCurrent.toLocaleString()} units</span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">Storage Zones</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {zoneCards.map((zone, index) => (
              <article
                key={zone.zone}
                className="min-w-0 rounded-xl border border-white/10 bg-[#111a3a] p-4 shadow-[0_0_18px_rgba(15,23,42,0.7)] sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold sm:text-sm ${
                      index === 0
                        ? "bg-indigo-500/20 text-indigo-300"
                        : index === 1
                        ? "bg-violet-500/20 text-violet-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {zone.zone}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold sm:text-sm ${
                      zone.trendUp ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    <span className="text-base">↗</span>
                  </span>
                </div>
                <p className="mt-3 text-base text-slate-300 sm:text-lg">{zone.name}</p>
                <p className="mt-2 text-2xl font-bold text-white sm:text-3xl xl:text-4xl">
                  {zone.units.toLocaleString()}
                </p>
                <p className="mt-2 text-xs text-slate-400 sm:text-sm xl:text-base">
                  <span className={zone.trendUp ? "text-emerald-400" : "text-rose-400"}>{zone.trend}</span>{" "}
                  vs last week
                </p>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">Expiry &amp; Low Stock</h2>
            <button className="text-sm font-semibold text-indigo-300 hover:text-indigo-200">
              View details 
              <span aria-hidden>→</span>
            </button>
          </div>
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <AlertCard key={alert.title} alert={alert} />
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
