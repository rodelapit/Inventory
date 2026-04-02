import { AppSidebar } from "../../../components/dashboard/admin/AppSidebar";
import { ThemeProvider } from "../../../components/ThemeProvider/ThemeProvider";
import { PageHeader } from "../../../components/dashboard/admin/PageHeader";
import { InventoryStatsLive } from "../../../components/dashboard/admin/InventoryStatsLive";
import { InventoryZonesSectionLive } from "../../../components/dashboard/admin/InventoryZonesSectionLive";
import type { InventoryZone } from "../../../components/dashboard/admin/InventoryZonesSection";
import { Package, Archive, TrendingUp, BarChart3, Filter } from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

const inventoryZones: InventoryZone[] = [
  {
    id: "A",
    label: "ZONE A",
    name: "Ambient Storage",
    current: 12480,
    capacity: 15000,
    utilization: 83,
    temperature: "20-25°C",
    humidity: "45-55%",
    color: "indigo",
  },
  {
    id: "B",
    label: "ZONE B",
    name: "Cold Storage",
    current: 4210,
    capacity: 5000,
    utilization: 84,
    temperature: "2-4°C",
    humidity: "85-90%",
    color: "cyan",
  },
  {
    id: "Q",
    label: "ZONE Q",
    name: "Quarantined Stock",
    current: 320,
    capacity: 500,
    utilization: 64,
    temperature: "20°C",
    humidity: "50%",
    color: "amber",
  },
  {
    id: "C",
    label: "ZONE C",
    name: "Frozen Storage",
    current: 2456,
    capacity: 3000,
    utilization: 82,
    temperature: "-18 to -20°C",
    humidity: "40-55%",
    color: "blue",
  },
  {
    id: "D",
    label: "ZONE D",
    name: "Dry Storage",
    current: 6234,
    capacity: 8000,
    utilization: 78,
    temperature: "18-22°C",
    humidity: "35-45%",
    color: "violet",
  },
  {
    id: "E",
    label: "ZONE E",
    name: "Receiving Area",
    current: 1876,
    capacity: 2000,
    utilization: 94,
    temperature: "18-22°C",
    humidity: "50%",
    color: "pink",
  },
];

const totalCapacity = inventoryZones.reduce((sum, zone) => sum + zone.capacity, 0);

// Always use live data so inventory reflects the latest products
export const dynamic = "force-dynamic";

type InventoryProduct = {
  quantity: number;
  storageZone?: string | null;
};

// NOTE: compute dynamic totals from products when available
export default async function InventoryPage() {
  // fetch latest products directly from Supabase to avoid server-side relative URL fetch issues
  let products: InventoryProduct[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseServerClient();
      const { data, error } = await supabase
        .from("products")
        .select("stock_level, storage_zone");

      if (!error && Array.isArray(data)) {
        type ProductZoneRow = {
          stock_level?: number | null;
          storage_zone?: string | null;
        };

        products = (data as ProductZoneRow[]).map((p) => ({
          quantity: Number(p.stock_level ?? 0),
          storageZone: p.storage_zone ?? null,
        }));
      }
    } catch {
      // keep empty products on query failure
      products = [];
    }
  }

  // derive per-zone current values from products using storageZone
  const zoneCurrentMap = new Map<string, number>();
  for (const p of products) {
    const rawZone = (p.storageZone ?? "").toString().trim().toUpperCase();
    // Default unassigned stock to receiving area so newly added products are reflected immediately.
    const zone = rawZone || "E";
    const previous = zoneCurrentMap.get(zone) ?? 0;
    const qty = Number.isNaN(Number(p.quantity)) ? 0 : Number(p.quantity);
    zoneCurrentMap.set(zone, previous + qty);
  }

  const zonesWithDynamicCurrent = inventoryZones.map((zone) => {
    const current = zoneCurrentMap.get(zone.id.toUpperCase()) ?? 0;
    const utilization = Math.round((current / Math.max(1, zone.capacity)) * 100);
    return {
      ...zone,
      current,
      utilization: Math.min(100, utilization),
    };
  });

  const totalCurrent = zonesWithDynamicCurrent.reduce((sum, z) => sum + z.current, 0);
  const availableSpace = totalCapacity - totalCurrent;
  const avgUtilization = Math.round((totalCurrent / Math.max(1, totalCapacity)) * 100);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eef2f7]">
      <div className="grid min-h-screen lg:grid-cols-[292px_minmax(0,1fr)]">
        <AppSidebar />

        <main className="flex min-w-0 flex-col">
          <PageHeader
            title="Inventory Management"
            description="Monitor storage capacity, conditions, and utilization across all zones."
            actions={
              <button className="flex items-center gap-2 rounded-full border border-slate-900/8 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 shadow-[0_12px_30px_rgba(148,163,184,0.22)] hover:bg-white">
                <Filter className="h-4 w-4 text-sky-700" />
                Filters
              </button>
            }
          />

          <ThemeProvider initial="inventory">
            <div className="flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
              {/* Statistics Overview */}
              <section>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Overview</h2>
                  <p className="mt-1 text-sm text-slate-600">Key capacity and utilization metrics</p>
                </div>

                <InventoryStatsLive
                  initialStats={{
                    totalCurrent,
                    availableSpace,
                    avgUtilization,
                  }}
                />
              </section>

              {/* Storage Zones */}
              <section>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Storage zones</h2>
                  <p className="mt-1 text-sm text-slate-600">Capacity, conditions, and utilization by zone</p>
                </div>

                <InventoryZonesSectionLive initialZones={zonesWithDynamicCurrent} />
              </section>

              {/* Quick Actions */}
              <section>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Quick actions</h2>
                  <p className="mt-1 text-sm text-slate-600">Jump into the most common inventory tasks</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Link
                    href="/products"
                    className="flex items-center gap-3 rounded-2xl border border-slate-900/8 bg-white/90 p-4 text-left shadow-[0_16px_40px_rgba(148,163,184,0.16)] transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                      <Package className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Products</p>
                      <p className="text-sm text-slate-600">Review and update items</p>
                    </div>
                  </Link>

                  <Link
                    href="/reports"
                    className="flex items-center gap-3 rounded-2xl border border-slate-900/8 bg-white/90 p-4 text-left shadow-[0_16px_40px_rgba(148,163,184,0.16)] transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
                      <Archive className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Inventory count</p>
                      <p className="text-sm text-slate-600">Perform stock audit</p>
                    </div>
                  </Link>

                  <Link
                    href="/reports"
                    className="flex items-center gap-3 rounded-2xl border border-slate-900/8 bg-white/90 p-4 text-left shadow-[0_16px_40px_rgba(148,163,184,0.16)] transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Reports</p>
                      <p className="text-sm text-slate-600">Generate analytics</p>
                    </div>
                  </Link>

                  <Link
                    href="/reports#expiry-risk"
                    className="flex items-center gap-3 rounded-2xl border border-slate-900/8 bg-white/90 p-4 text-left shadow-[0_16px_40px_rgba(148,163,184,0.16)] transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                      <BarChart3 className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Alerts</p>
                      <p className="text-sm text-slate-600">Configure notifications</p>
                    </div>
                  </Link>
                </div>
              </section>
            </div>
          </ThemeProvider>
        </main>
      </div>
    </div>
  );
}
