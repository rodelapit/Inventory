import { AppSidebar } from "../../../components/dashboard/admin/AppSidebar";
import { ThemeProvider } from "../../../components/ThemeProvider/ThemeProvider";
import { mockDashboardData, type ProductFeedItem, type ZoneCard } from "@/data/dashboard";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { FileSpreadsheet, Download, Filter, CalendarDays, ArrowUpRight, ArrowDownRight } from "lucide-react";

export const dynamic = "force-dynamic";

async function loadReportsData(): Promise<{ productFeed: ProductFeedItem[]; zoneCards: ZoneCard[] }> {
  if (!isSupabaseConfigured()) {
    return {
      productFeed: mockDashboardData.productFeed,
      zoneCards: mockDashboardData.zoneCards,
    };
  }

  const supabase = createSupabaseServerClient();

  try {
    const { data: products, error: productError } = await supabase
      .from("products")
      .select("sku, product_name, stock_level, status, expiration");

    if (productError) {
      console.error("Error loading products for reports", productError);
      return {
        productFeed: mockDashboardData.productFeed,
        zoneCards: mockDashboardData.zoneCards,
      };
    }

    type ReportsProductRow = {
      sku: string;
      product_name: string;
      stock_level?: number | null;
      status?: string | null;
      expiration?: string | null;
    };

    const productRows: ReportsProductRow[] = (products ?? []) as ReportsProductRow[];
    const productFeed: ProductFeedItem[] = productRows.map((p) => {
      const rawStatus = p.status ?? "In Stock";
      const status: ProductFeedItem["status"] =
        rawStatus === "Low" || rawStatus === "Critical" ? rawStatus : "In Stock";

      return {
        sku: p.sku,
        productName: p.product_name,
        stockLevel: p.stock_level ?? 0,
        expiration: p.expiration ? new Date(p.expiration).toLocaleDateString() : "",
        status,
      };
    });

    const { data: zones, error: zoneError } = await supabase
      .from("zones")
      .select("id, label, name, current");

    let zoneCards: ZoneCard[];
    if (zoneError) {
      console.error("Error loading zones for reports", zoneError);
      zoneCards = mockDashboardData.zoneCards;
    } else {
      type ZoneRow = {
        id?: string | number | null;
        label?: string | null;
        name?: string | null;
        current?: number | null;
      };

      const zoneRows: ZoneRow[] = (zones ?? []) as ZoneRow[];
      zoneCards = zoneRows.map((z) => ({
        zone: z.label ?? (z.id ? `ZONE ${z.id}` : ""),
        name: z.name ?? "",
        units: z.current ?? 0,
        trend: "",
        trendUp: true,
      }));
    }

    return { productFeed, zoneCards };
  } catch (err) {
    console.error("Unexpected error loading reports data", err);
    return {
      productFeed: mockDashboardData.productFeed,
      zoneCards: mockDashboardData.zoneCards,
    };
  }
}

export default async function ReportsPage() {
  const { productFeed, zoneCards } = await loadReportsData();

  const totalProducts = productFeed.length;
  const lowItems = productFeed.filter((p) => p.status === "Low").length;
  const criticalItems = productFeed.filter((p) => p.status === "Critical").length;
  const totalUnits = productFeed.reduce((sum, p) => sum + p.stockLevel, 0);

  const totalZoneUnits = zoneCards.reduce((sum, z) => sum + z.units, 0) || 1;
  const zoneDistribution = zoneCards.map((z) => ({
    ...z,
    share: Math.round((z.units / totalZoneUnits) * 100),
  }));

  const expirySorted = [...productFeed].sort((a, b) => {
    const da = new Date(a.expiration).getTime();
    const db = new Date(b.expiration).getTime();
    if (Number.isNaN(da) || Number.isNaN(db)) return 0;
    return da - db;
  });

  const topExpiryRisk = expirySorted.slice(0, 4);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="grid min-h-screen lg:grid-cols-[292px_minmax(0,1fr)]">
        <AppSidebar />

        <main className="flex min-w-0 flex-col">
          <ThemeProvider initial="dashboard">
            <header className="border-b border-slate-900/8 bg-[rgba(244,239,230,0.9)] px-4 py-5 backdrop-blur-xl sm:px-6 lg:px-8">
              <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700/80">
                    Reports
                  </p>
                  <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-3xl">
                    Analytics &amp; reports
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base">
                    Review stock health, zone utilization, and expiry risk at a glance.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button className="flex items-center gap-2 rounded-full border border-slate-900/8 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-[0_12px_30px_rgba(148,163,184,0.22)] sm:px-4 sm:text-sm">
                    <CalendarDays className="h-4 w-4 text-emerald-700" />
                    Last 30 days
                  </button>
                  <button className="flex items-center gap-2 rounded-full border border-slate-900/8 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-[0_12px_30px_rgba(148,163,184,0.18)] sm:px-4 sm:text-sm">
                    <Filter className="h-4 w-4 text-slate-700" />
                    Filters
                  </button>
                  <button className="flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_18px_40px_rgba(16,185,129,0.65)] hover:bg-emerald-700 sm:px-4 sm:text-sm">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                </div>
              </div>
            </header>

            <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
              <div className="mx-auto max-w-7xl space-y-6">
                {/* KPI cards */}
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-3xl border border-slate-900/8 bg-white/90 p-4 shadow-[0_18px_40px_rgba(148,163,184,0.18)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Total SKUs
                      </p>
                      <FileSpreadsheet className="h-5 w-5 text-slate-500" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-slate-950">{totalProducts}</p>
                    <p className="mt-1 text-xs text-slate-500">Unique products tracked in the catalog</p>
                  </div>

                  <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 shadow-[0_18px_40px_rgba(251,191,36,0.18)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                        Low stock
                      </p>
                      <ArrowDownRight className="h-5 w-5 text-amber-700" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-amber-900">{lowItems}</p>
                    <p className="mt-1 text-xs text-amber-800/80">Items flagged for replenishment soon</p>
                  </div>

                  <div className="rounded-3xl border border-rose-100 bg-rose-50 p-4 shadow-[0_18px_40px_rgba(244,63,94,0.18)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-800">
                        Critical stock
                      </p>
                      <ArrowDownRight className="h-5 w-5 text-rose-700" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-rose-900">{criticalItems}</p>
                    <p className="mt-1 text-xs text-rose-800/80">Items at or below safety threshold</p>
                  </div>

                  <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 shadow-[0_18px_40px_rgba(16,185,129,0.18)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                        Total units
                      </p>
                      <ArrowUpRight className="h-5 w-5 text-emerald-700" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-emerald-900">{totalUnits}</p>
                    <p className="mt-1 text-xs text-emerald-800/80">Sum of on-hand units across products</p>
                  </div>
                </section>

                {/* Zone utilization + expiry risk */}
                <section className="grid gap-6 lg:grid-cols-[1.4fr_minmax(0,1fr)]">
                  {/* Zones */}
                  <div className="rounded-3xl border border-slate-900/8 bg-white/95 p-4 sm:p-5 shadow-[0_22px_55px_rgba(148,163,184,0.2)]">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-white sm:text-xl">Inventory by Zone</h2>
                        <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                          Distribution of units across storage zones.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {zoneDistribution.map((zone) => (
                        <div key={zone.zone} className="rounded-xl bg-black/20 p-3 sm:p-3.5">
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold tracking-[0.16em] text-indigo-800">
                                {zone.zone}
                              </span>
                              <span className="text-slate-900">{zone.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-900">{zone.units.toLocaleString()} units</p>
                              <p className="text-[11px] text-slate-500">{zone.share}% of zone volume</p>
                            </div>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-linear-to-r from-indigo-500 to-fuchsia-500"
                              style={{ width: `${zone.share}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expiry risk */}
                  <div id="expiry-risk" className="rounded-3xl border border-rose-100 bg-rose-50 p-4 sm:p-5 shadow-[0_22px_55px_rgba(248,113,113,0.18)]">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-rose-900 sm:text-xl">Expiry risk</h2>
                        <p className="mt-1 text-xs text-rose-800/80 sm:text-sm">
                          Products closest to their expiration date.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {topExpiryRisk.map((item, index) => (
                        <div
                          key={`${item.sku}-${index}`}
                          className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-2.5 text-xs sm:text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-rose-900">{item.productName}</p>
                            <p className="mt-0.5 text-[11px] text-rose-800/80">SKU {item.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-rose-200">{item.expiration}</p>
                            <p className="mt-0.5 text-[11px] text-rose-200/80">Check rotation</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Stock health table */}
                <section className="rounded-2xl border border-white/10 bg-[#0f1735] p-4 sm:p-5 shadow-[0_0_32px_rgba(15,23,42,0.9)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white sm:text-xl">Stock Health Report</h2>
                      <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                        Detailed snapshot of current inventory status per product.
                      </p>
                    </div>
                    <button className="hidden items-center gap-2 rounded-full border border-slate-600/70 bg-[#050b26] px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-900/60 sm:inline-flex">
                      <Download className="h-4 w-4" />
                      Export table
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-1 text-left text-xs sm:text-sm">
                      <thead className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2 text-right">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productFeed.map((item, index) => (
                          <tr key={`${item.sku}-${index}`} className="rounded-xl bg-[#050b26]/80">
                            <td className="max-w-xs px-3 py-2.5 align-middle">
                              <p className="truncate text-sm font-semibold text-slate-100">
                                {item.productName}
                              </p>
                            </td>
                            <td className="px-3 py-2.5 align-middle text-[13px] text-slate-300">
                              {item.sku}
                            </td>
                            <td className="px-3 py-2.5 align-middle">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${{
                                  "In Stock": "bg-emerald-500/10 text-emerald-300",
                                  Low: "bg-amber-500/10 text-amber-300",
                                  Critical: "bg-rose-500/10 text-rose-300",
                                }[item.status]}`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right align-middle text-sm font-semibold text-slate-100">
                              {item.stockLevel.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          </ThemeProvider>
        </main>
      </div>
    </div>
  );
}
