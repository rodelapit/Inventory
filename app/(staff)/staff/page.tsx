import { ThemeProvider } from "../../../components/ThemeProvider/ThemeProvider";
import { StaffSidebar } from "../../../components/dashboard/staff/StaffSidebar";
import { StaffHeroSectionLive } from "../../../components/dashboard/staff/StaffHeroSectionLive";
import { ProductManagementSectionLive } from "../../../components/dashboard/shared/ProductManagementSectionLive";
import { getDashboardData } from "../../../lib/dashboard/get-dashboard-data";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  const cookieStore = await cookies();
  const staffAuth = cookieStore.get("staff_auth")?.value;

  if (staffAuth !== "1") {
    redirect("/staff/login");
  }

  const dashboardData = await getDashboardData();

  return (
    <div className="min-h-screen overflow-x-hidden bg-(--bg) text-(--text)">
      <ThemeProvider initial="staff">
        <div className="grid min-h-screen lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)]">
          <StaffSidebar />

          <main className="flex min-w-0 flex-col bg-(--bg)">
            <header className="flex shrink-0 items-center justify-between border-b border-emerald-100 bg-white px-4 py-3 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                  Staff workspace
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600">Today&apos;s store operations</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-500">
                    <span className="absolute inline-flex h-4 w-4 rounded-full bg-emerald-400/40" />
                  </span>
                  <span className="whitespace-nowrap">On shift</span>
                </div>
              </div>
            </header>

            <div className="px-4 py-6 sm:px-8 lg:px-10">
              <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:gap-5">
                <StaffHeroSectionLive
                  systemStatusTitle={dashboardData.systemStatusTitle}
                  systemStatusMessage={dashboardData.systemStatusMessage}
                  statCards={dashboardData.statCards}
                  initialZoneCards={dashboardData.zoneCards}
                  activeAlerts={dashboardData.activeAlerts}
                  initialProductFeed={dashboardData.productFeed}
                />

                <section
                  aria-label="Staff product view"
                  className="scroll-mt-4 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-(--card-bg) pt-3.5 shadow-[0_20px_50px_rgba(148,163,184,0.14)] lg:flex-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 sm:px-5 lg:px-6 lg:pb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-emerald-950 sm:text-3xl">Products &amp; Stock</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        View products, update quantities, and check low / expiring items.
                      </p>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden px-3.5 pb-3.5 sm:px-5 lg:px-6 lg:pb-5">
                    <ProductManagementSectionLive initialProductFeed={dashboardData.productFeed} />
                  </div>
                </section>
              </div>
            </div>
          </main>
        </div>
      </ThemeProvider>
    </div>
  );
}
