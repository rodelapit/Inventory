import { ThemeProvider } from "../../../../components/ThemeProvider/ThemeProvider";
import { StaffSidebar } from "../../../../components/dashboard/staff/StaffSidebar";
import { ProductManagementSectionLive } from "../../../../components/dashboard/shared/ProductManagementSectionLive";
import { getDashboardData } from "../../../../lib/dashboard/get-dashboard-data";
import { requireStaffSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function StaffProductsPage() {
  await requireStaffSession();

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
                <p className="mt-1 text-sm font-semibold text-slate-600">Product inventory view</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-500">
                    <span className="absolute inline-flex h-4 w-4 rounded-full bg-emerald-400/40" />
                  </span>
                  <span className="whitespace-nowrap">Read-only</span>
                </div>
              </div>
            </header>

            <div className="px-4 py-6 sm:px-8 lg:px-10">
              <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:gap-5">
                <section className="space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold text-emerald-950 sm:text-4xl">
                      Product Inventory
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                      View all products, stock levels, expiration dates, and storage locations. Use this to quickly check item availability and status.
                    </p>
                  </div>
                </section>

                <section
                  aria-label="Staff product view"
                  className="scroll-mt-4 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-(--card-bg) pt-3.5 shadow-[0_20px_50px_rgba(148,163,184,0.14)] lg:flex-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 sm:px-5 lg:px-6 lg:pb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-emerald-950 sm:text-3xl">Products &amp; Stock</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Real-time product list with quantities and status
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
