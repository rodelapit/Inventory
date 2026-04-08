import { AppSidebar } from "../../components/dashboard/admin/AppSidebar";
import { ThemeProvider } from "../../components/ThemeProvider/ThemeProvider";
import { Bell, CalendarDays, Search } from "lucide-react";
import { PerformanceOverviewPanel } from "../../components/dashboard/admin/PerformanceOverviewPanel";
import { getAdminPerformanceData } from "@/lib/dashboard/get-admin-performance-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const performanceData = await getAdminPerformanceData();
  const liveDataUnavailable = !isSupabaseConfigured();
  const notifications = performanceData.alertsCenter;
  const notificationCount = notifications.length;

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#eef2f7] text-slate-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_60%)]" />
        <div className="absolute -right-32 top-14 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="absolute -left-40 top-36 h-80 w-80 rounded-full bg-sky-300/18 blur-3xl" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[292px_minmax(0,1fr)]">
        <AppSidebar />

        <main className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-900/8 bg-[rgba(239,244,251,0.9)] px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8 xl:px-10">
            <div className="flex w-full flex-wrap items-center gap-4 lg:flex-nowrap lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700/85">
                  Operations overview
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-3xl">
                  Live inventory overview for fast decisions.
                </h1>
              </div>

              <div className="ml-auto flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <form
                  action="/products"
                  method="get"
                  className="flex min-w-0 items-center gap-3 rounded-full border border-slate-900/8 bg-white/85 px-4 py-2.5 shadow-[0_20px_45px_rgba(148,163,184,0.16)] sm:min-w-[18rem]"
                >
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    name="q"
                    placeholder="Search products, SKU, supplier"
                    className="w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-500"
                  />
                </form>
                <div className="flex items-center gap-3">
                  <div className="hidden items-center gap-2 rounded-full border border-slate-900/8 bg-white/85 px-4 py-3 text-sm text-slate-600 shadow-[0_20px_45px_rgba(148,163,184,0.16)] md:flex">
                    <CalendarDays className="h-4 w-4 text-sky-700" />
                    <span>{todayLabel}</span>
                  </div>
                  <details className="group relative">
                    <summary
                      aria-label="Notifications"
                      className="relative flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-slate-900/8 bg-white/88 text-slate-700 shadow-[0_20px_45px_rgba(148,163,184,0.16)] transition hover:-translate-y-0.5 hover:bg-white"
                    >
                      <Bell className="h-4 w-4" />
                      {notificationCount > 0 ? (
                        <>
                          <span className="absolute right-2 top-2 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                            {notificationCount}
                          </span>
                          <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-rose-500" />
                        </>
                      ) : null}
                    </summary>

                    <div className="absolute right-0 top-14 z-30 w-[min(24rem,88vw)] rounded-2xl border border-slate-900/8 bg-white/98 p-3 shadow-[0_24px_55px_rgba(148,163,184,0.3)] opacity-0 transition group-open:opacity-100">
                      <div className="mb-2 flex items-center justify-between px-1">
                        <p className="text-sm font-semibold text-slate-900">Notifications</p>
                        <p className="text-xs text-slate-500">{notificationCount} new</p>
                      </div>

                      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                        {notifications.length > 0 ? (
                          notifications.map((item, index) => (
                            <article
                              key={`${item.id}-${index}`}
                              className="rounded-xl border border-slate-900/8 bg-slate-50/70 p-3"
                            >
                              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                              <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                              <p className="mt-2 text-xs font-medium text-sky-700">{item.metric}</p>
                            </article>
                          ))
                        ) : (
                          <div className="rounded-xl border border-slate-900/8 bg-slate-50/70 p-3 text-sm text-slate-600">
                            No notifications right now.
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </header>

          <ThemeProvider initial="dashboard">
            <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
              <div className="flex w-full flex-col gap-6 pb-10 lg:gap-7">
                {liveDataUnavailable ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Live data unavailable. Supabase is not configured, so dashboard data may be empty.
                  </div>
                ) : null}
                <PerformanceOverviewPanel data={performanceData} />
              </div>
            </div>
          </ThemeProvider>
        </main>
      </div>
    </div>
  );
}
