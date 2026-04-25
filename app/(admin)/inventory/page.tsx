import { AppSidebar } from "../../../components/dashboard/admin/AppSidebar";
import { ThemeProvider } from "../../../components/ThemeProvider/ThemeProvider";
import { PageHeader } from "../../../components/dashboard/admin/PageHeader";
import { InventoryStatsLive } from "../../../components/dashboard/admin/InventoryStatsLive";
import { InventoryZonesSectionLive } from "../../../components/dashboard/admin/InventoryZonesSectionLive";
import type { InventoryZone } from "../../../components/dashboard/admin/InventoryZonesSection";
import { Package, Archive, TrendingUp, BarChart3, Filter } from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

function normalizeZoneColor(value: string | null | undefined): InventoryZone["color"] {
  const color = String(value ?? "").trim().toLowerCase();
  if (color === "indigo" || color === "cyan" || color === "amber" || color === "blue" || color === "violet" || color === "pink") {
    return color;
  }
  return "indigo";
}

// Always use live data so inventory reflects the latest products
export const dynamic = "force-dynamic";

type InventoryProduct = {
  quantity: number;
  storageZone?: string | null;
};

type ZoneRow = {
  id: string;
  label?: string | null;
  name?: string | null;
  capacity?: number | null;
  temperature?: string | null;
  humidity?: string | null;
  color?: string | null;
};

function getSupabaseErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const maybeError = error as { message?: unknown };
    if (typeof maybeError.message === "string" && maybeError.message.trim().length > 0) {
      return maybeError.message;
    }
  }
  return "Unable to load inventory data.";
}

// NOTE: compute dynamic totals from products when available
export default async function InventoryPage() {
  // fetch latest products directly from Supabase to avoid server-side relative URL fetch issues
  let products: InventoryProduct[] = [];
  let configuredZones: InventoryZone[] = [];
  let loadError: string | null = null;
  const supabaseConfigured = isSupabaseConfigured();
  if (supabaseConfigured) {
    try {
      const supabase = createSupabaseServerClient();
      const [{ data: productData, error: productError }, { data: zoneData, error: zoneError }] = await Promise.all([
        supabase.from("products").select("stock_level, storage_zone"),
        supabase.from("zones").select("id, label, name, capacity, temperature, humidity, color").order("id", { ascending: true }),
      ]);

      if (!productError && Array.isArray(productData)) {
        type ProductZoneRow = {
          stock_level?: number | null;
          storage_zone?: string | null;
        };

        products = (productData as ProductZoneRow[]).map((p) => ({
          quantity: Number(p.stock_level ?? 0),
          storageZone: p.storage_zone ?? null,
        }));
      }

      if (productError && !loadError) {
        loadError = getSupabaseErrorMessage(productError);
      }

      if (!zoneError && Array.isArray(zoneData)) {
        configuredZones = (zoneData as ZoneRow[]).map((zone) => {
          const id = String(zone.id ?? "").trim().toUpperCase();
          const capacity = Number(zone.capacity ?? 0);
          return {
            id,
            label: String(zone.label ?? "").trim() || `ZONE ${id}`,
            name: String(zone.name ?? "").trim() || `Storage Zone ${id}`,
            current: 0,
            capacity: capacity > 0 ? capacity : 1000,
            utilization: 0,
            temperature: String(zone.temperature ?? "").trim() || "N/A",
            humidity: String(zone.humidity ?? "").trim() || "N/A",
            color: normalizeZoneColor(zone.color),
          };
        });
      }

      if (zoneError && !loadError) {
        loadError = getSupabaseErrorMessage(zoneError);
      }
    } catch {
      loadError = "Unable to load inventory data right now.";
      products = [];
      configuredZones = [];
    }
  }

  // derive per-zone current values from products using storageZone
  const zoneCurrentMap = new Map<string, number>();
  const knownZoneIds = new Set(configuredZones.map((zone) => zone.id.toUpperCase()));
  let unassignedCurrent = 0;

  for (const p of products) {
    const rawZone = (p.storageZone ?? "").toString().trim().toUpperCase();
    const qty = Number.isNaN(Number(p.quantity)) ? 0 : Number(p.quantity);

    if (!rawZone || !knownZoneIds.has(rawZone)) {
      unassignedCurrent += qty;
      continue;
    }

    const previous = zoneCurrentMap.get(rawZone) ?? 0;
    zoneCurrentMap.set(rawZone, previous + qty);
  }

  const zonesWithDynamicCurrent = configuredZones.map((zone) => {
    const current = zoneCurrentMap.get(zone.id.toUpperCase()) ?? 0;
    const utilization = Math.round((current / Math.max(1, zone.capacity)) * 100);
    return {
      ...zone,
      current,
      utilization: Math.min(100, utilization),
    };
  });

  const unassignedZone: InventoryZone = {
    id: "UNASSIGNED",
    label: "UNASSIGNED",
    name: "Unassigned Products",
    current: unassignedCurrent,
    capacity: Math.max(unassignedCurrent, 1),
    utilization: unassignedCurrent > 0 ? 100 : 0,
    temperature: "N/A",
    humidity: "N/A",
    color: "amber",
  };

  const zonesForDisplay = [...zonesWithDynamicCurrent, unassignedZone];
  const totalCapacity = zonesWithDynamicCurrent.reduce((sum, zone) => sum + zone.capacity, 0);
  const totalCurrent = zonesWithDynamicCurrent.reduce((sum, zone) => sum + zone.current, 0) + unassignedCurrent;
  const availableSpace = Math.max(0, totalCapacity - totalCurrent);
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
              {!supabaseConfigured ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Live data unavailable. Supabase is not configured, so inventory metrics may be empty.
                </div>
              ) : null}
              {loadError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  Inventory data could not be loaded: {loadError}
                </div>
              ) : null}
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

                <InventoryZonesSectionLive initialZones={zonesForDisplay} />
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
