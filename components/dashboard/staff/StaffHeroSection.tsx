import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const totalCurrent = zoneCards.reduce((s, z) => s + z.units, 0);

  return (
    <section id="staff-dashboard-overview" className="space-y-6 xl:space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100/80">
            <span className="text-base">2️⃣</span>
            <span>Staff Dashboard · Limited Access</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight text-emerald-950 sm:text-4xl xl:text-5xl">
            Daily store operations hub
          </h1>
          <p className="max-w-2xl text-sm text-slate-600 sm:text-base xl:text-lg">
            The Staff handles day-to-day store work: serving customers, updating stock, and watching for low or expiring items.
          </p>
        </div>

        <div className="w-full rounded-2xl border border-emerald-100 bg-white p-4 text-sm text-slate-700 shadow-[0_18px_40px_rgba(148,163,184,0.14)] sm:text-base lg:w-90">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Main features
          </p>
          <ul className="space-y-1.5 text-sm text-slate-700">
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
        className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-linear-to-r from-emerald-50 to-white p-4 sm:p-5 lg:p-6"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 shadow-[0_0_32px_rgba(74,222,128,0.25)] sm:h-14 sm:w-14">
          <div className="h-6 w-6 rounded-full bg-emerald-500/80" />
        </div>
        <div>
          <p className="text-lg font-semibold text-emerald-900 sm:text-xl xl:text-2xl">{systemStatusTitle}</p>
          <p className="mt-1 text-sm text-slate-600 sm:text-base xl:text-lg">{systemStatusMessage}</p>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Live on-floor stock: <span className="font-semibold text-emerald-700">{totalCurrent.toLocaleString()} units</span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-xl font-semibold text-emerald-950 sm:text-2xl">Storage Zones</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {zoneCards.map((zone, index) => (
              <article
                key={zone.zone}
                className="min-w-0 rounded-xl border border-emerald-100 bg-white p-4 shadow-[0_18px_40px_rgba(148,163,184,0.14)] sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold sm:text-sm ${
                      index === 0
                        ? "bg-emerald-600 text-white"
                        : index === 1
                        ? "bg-emerald-500/30 text-emerald-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {zone.zone}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold sm:text-sm ${
                      zone.trendUp ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    <span className="text-base">↗</span>
                  </span>
                </div>
                <p className="mt-3 text-base text-slate-600 sm:text-lg">{zone.name}</p>
                <p className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl xl:text-4xl">
                  {zone.units.toLocaleString()}
                </p>
                <p className="mt-2 text-xs text-slate-500 sm:text-sm xl:text-base">
                  <span className={zone.trendUp ? "text-emerald-600" : "text-rose-500"}>{zone.trend}</span>{" "}
                  vs last week
                </p>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-emerald-950 sm:text-2xl">Expiry &amp; Low Stock</h2>
            <button
              type="button"
              onClick={() => router.push("/staff/inventory")}
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-600"
            >
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
