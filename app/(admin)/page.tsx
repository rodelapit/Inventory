import { AppSidebar } from "../../components/dashboard/admin/AppSidebar";
import { HeroSection } from "../../components/dashboard/admin/HeroSection";
import { ProductManagementSection } from "../../components/dashboard/shared/ProductManagementSection";
import { getDashboardData } from "../../lib/dashboard/get-dashboard-data";
import { ThemeProvider } from "../../components/ThemeProvider/ThemeProvider";
import { Bell, CalendarDays, Search, Sparkles } from "lucide-react";

export default async function Home() {
  const dashboardData = await getDashboardData();
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_55%)]" />
        <div className="absolute -right-32 top-16 h-72 w-72 rounded-full bg-sky-400/12 blur-3xl" />
        <div className="absolute -left-40 top-40 h-80 w-80 rounded-full bg-emerald-400/12 blur-3xl" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[292px_minmax(0,1fr)]">
        <AppSidebar />

        <main className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-900/8 bg-[rgba(244,239,230,0.76)] px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8 xl:px-10">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 lg:flex-nowrap lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700/80">
                  Operations overview
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-3xl">
                  Live inventory overview for fast decisions.
                </h1>
              </div>

              <div className="ml-auto flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3 rounded-full border border-slate-900/8 bg-white/78 px-4 py-3 shadow-[0_20px_45px_rgba(148,163,184,0.16)] sm:min-w-[18rem]">
                  <Search className="h-4 w-4 text-slate-400" />
                  <span className="truncate text-sm text-slate-500">Search products, zones, or alerts</span>
                </div>
                <div
                  id="admin-status"
                  className="scroll-mt-4 hidden items-center gap-3 rounded-full border border-slate-900/8 bg-white/78 px-4 py-3 text-xs font-semibold text-slate-700 shadow-[0_20px_45px_rgba(148,163,184,0.16)] sm:flex"
                >
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-500">
                    <span className="absolute inline-flex h-4 w-4 rounded-full bg-emerald-500/25" />
                  </span>
                  <span className="whitespace-nowrap">Control room online</span>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-700">
                    Live sync active
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden items-center gap-2 rounded-full border border-slate-900/8 bg-white/78 px-4 py-3 text-sm text-slate-600 shadow-[0_20px_45px_rgba(148,163,184,0.16)] md:flex">
                    <CalendarDays className="h-4 w-4 text-emerald-700" />
                    <span>{todayLabel}</span>
                  </div>
                  <button
                    aria-label="Notifications"
                    className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-900/8 bg-white/82 text-slate-700 shadow-[0_20px_45px_rgba(148,163,184,0.16)] transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    <Bell className="h-4 w-4" />
                    <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-rose-500" />
                  </button>
                </div>
              </div>
            </div>
          </header>

          <ThemeProvider initial="dashboard">
            <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
              <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-10 lg:gap-7">
                <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="overflow-hidden rounded-4xl border border-slate-900/8 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(12,74,110,0.94),rgba(6,95,70,0.9))] p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.24)] sm:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-100">
                          <Sparkles className="h-3.5 w-3.5" />
                          Modern control workspace
                        </div>
                        <h2 className="mt-5 text-3xl font-bold tracking-[-0.04em] sm:text-4xl xl:text-[3.25rem] xl:leading-[1.02]">
                          Every inventory signal in one operating rhythm.
                        </h2>
                        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
                          Prioritize expiring stock, balance zones, and keep replenishment moving with a dashboard designed for fast operational decisions.
                        </p>
                      </div>
                      <div className="rounded-[28px] border border-white/14 bg-white/10 p-4 backdrop-blur sm:min-w-56">
                        <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/80">Today&apos;s focus</p>
                        <p className="mt-3 text-3xl font-bold">09</p>
                        <p className="mt-1 text-sm text-slate-200">SKUs need action in the next 24 hours.</p>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-3xl border border-white/12 bg-white/10 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Fulfillment pace</p>
                        <p className="mt-2 text-2xl font-semibold text-white">1,284 units</p>
                        <p className="mt-2 text-sm text-emerald-200">+12% over yesterday</p>
                      </div>
                      <div className="rounded-3xl border border-white/12 bg-white/10 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Zone balance</p>
                        <p className="mt-2 text-2xl font-semibold text-white">Healthy</p>
                        <p className="mt-2 text-sm text-slate-200">Only one storage lane above the preferred threshold.</p>
                      </div>
                      <div className="rounded-3xl border border-white/12 bg-white/10 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Replenishment queue</p>
                        <p className="mt-2 text-2xl font-semibold text-white">14 runs</p>
                        <p className="mt-2 text-sm text-amber-100">4 require supervisor approval.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-4xl border border-slate-900/8 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_24px_60px_rgba(148,163,184,0.18)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Shift summary</p>
                      <div className="mt-4 space-y-4">
                        <div className="flex items-center justify-between rounded-[22px] bg-slate-50 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">Staff on floor</p>
                            <p className="text-xs text-slate-500">Active warehouse and dispatch crew</p>
                          </div>
                          <span className="text-2xl font-bold text-slate-950">18</span>
                        </div>
                        <div className="flex items-center justify-between rounded-[22px] bg-slate-50 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">Open exceptions</p>
                            <p className="text-xs text-slate-500">Damaged, delayed, or unassigned stock</p>
                          </div>
                          <span className="text-2xl font-bold text-amber-600">7</span>
                        </div>
                        <div className="flex items-center justify-between rounded-[22px] bg-slate-50 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">Cycle counts due</p>
                            <p className="text-xs text-slate-500">Scheduled before end of day</p>
                          </div>
                          <span className="text-2xl font-bold text-sky-700">3</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <HeroSection
                  systemStatusTitle={dashboardData.systemStatusTitle}
                  systemStatusMessage={dashboardData.systemStatusMessage}
                  statCards={dashboardData.statCards}
                  zoneCards={dashboardData.zoneCards}
                  activeAlerts={dashboardData.activeAlerts}
                />
                <ProductManagementSection productFeed={dashboardData.productFeed} />
              </div>
            </div>
          </ThemeProvider>
        </main>
      </div>
    </div>
  );
}
