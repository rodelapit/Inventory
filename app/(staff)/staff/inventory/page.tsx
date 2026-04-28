import { ThemeProvider } from "../../../../components/ThemeProvider/ThemeProvider";
import { StaffSidebar } from "../../../../components/dashboard/staff/StaffSidebar";
import { requireStaffSession } from "@/lib/auth/session";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

type InventoryProduct = {
  quantity: number;
  storageZone?: string | null;
};

type InventoryZone = {
  id: string;
  label: string;
  name: string;
  current: number;
  capacity: number;
  utilization: number;
  temperature: string;
  humidity: string;
  color: "indigo" | "cyan" | "amber" | "blue" | "violet" | "pink";
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

function normalizeZoneColor(value: string | null | undefined): InventoryZone["color"] {
  const color = String(value ?? "").trim().toLowerCase();
  if (color === "indigo" || color === "cyan" || color === "amber" || color === "blue" || color === "violet" || color === "pink") {
    return color;
  }
  return "indigo";
}

const zoneColors: Record<InventoryZone["color"], { bg: string; text: string; border: string }> = {
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  pink: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
};

export default async function StaffInventoryPage() {
  await requireStaffSession();

  // fetch latest products directly from Supabase
  let products: InventoryProduct[] = [];
  let configuredZones: InventoryZone[] = [];
  let loadError: string | null = null;
  if (isSupabaseConfigured()) {
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

  const zonesFromSupabase: InventoryZone[] = configuredZones.map((zone) => {
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

  const zones: InventoryZone[] = [...zonesFromSupabase, unassignedZone];

  const totalCapacity = zonesFromSupabase.reduce((sum, z) => sum + z.capacity, 0);
  const totalCurrent = zones.reduce((sum, z) => sum + z.current, 0);
  const avgUtilization = Math.round((totalCurrent / Math.max(1, totalCapacity)) * 100);
  const availableSpace = Math.max(0, totalCapacity - totalCurrent);

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
                <p className="mt-1 text-sm font-semibold text-slate-600">Storage zones &amp; utilization</p>
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
              <div className="mx-auto max-w-6xl space-y-8">
                {loadError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    Inventory data could not be loaded: {loadError}
                  </div>
                ) : null}
                <section className="space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold text-emerald-950 sm:text-4xl">
                      Inventory Management
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                      Monitor storage capacity and utilization across all zones. Track current stock levels and identify zones nearing capacity.
                    </p>
                  </div>
                </section>

                {/* Stats Overview */}
                <section className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-emerald-950">Overview</h2>
                    <p className="mt-1 text-sm text-slate-600">Key inventory metrics</p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-emerald-100 bg-white p-4 shadow-[0_18px_40px_rgba(148,163,184,0.12)] sm:p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">Total Capacity</p>
                      <p className="mt-3 text-2xl font-bold text-emerald-950 sm:text-3xl">
                        {totalCapacity.toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">units across all zones</p>
                    </div>

                    <div className="rounded-lg border border-emerald-100 bg-white p-4 shadow-[0_18px_40px_rgba(148,163,184,0.12)] sm:p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">Current Stock</p>
                      <p className="mt-3 text-2xl font-bold text-emerald-950 sm:text-3xl">
                        {totalCurrent.toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">units in storage</p>
                    </div>

                    <div className="rounded-lg border border-emerald-100 bg-white p-4 shadow-[0_18px_40px_rgba(148,163,184,0.12)] sm:p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">Available Space</p>
                      <p className="mt-3 text-2xl font-bold text-emerald-950 sm:text-3xl">
                        {availableSpace.toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">units remaining</p>
                    </div>

                    <div className="rounded-lg border border-emerald-100 bg-white p-4 shadow-[0_18px_40px_rgba(148,163,184,0.12)] sm:p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">Avg Utilization</p>
                      <p className="mt-3 text-2xl font-bold text-emerald-950 sm:text-3xl">
                        {avgUtilization}%
                      </p>
                      <p className="mt-1 text-xs text-slate-500">across all zones</p>
                    </div>
                  </div>
                </section>

                {/* Storage Zones Grid */}
                <section className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-emerald-950">Storage Zones</h2>
                    <p className="mt-1 text-sm text-slate-600">Capacity and utilization by zone</p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {zones.map((zone) => {
                      const colors = zoneColors[zone.color] || zoneColors.indigo;
                      const utilizationColor =
                        zone.utilization >= 90
                          ? "bg-rose-500"
                          : zone.utilization >= 75
                          ? "bg-amber-500"
                          : "bg-emerald-500";

                      return (
                        <div
                          key={zone.id}
                          className={`rounded-3xl border ${colors.border} ${colors.bg} p-6 shadow-[0_22px_55px_rgba(148,163,184,0.18)] ring-1 ring-inset ring-slate-900/5 transition hover:-translate-y-0.5`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${colors.text}`}>
                                {zone.label}
                              </p>
                              <p className="mt-3 text-lg font-semibold text-slate-900">{zone.name}</p>
                            </div>
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                          </div>

                          {/* Utilization Progress */}
                          <div className="mt-6">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600">Utilization</span>
                              <span className={`text-lg font-bold ${
                                zone.utilization >= 90
                                  ? "text-rose-500"
                                  : zone.utilization >= 75
                                  ? "text-amber-500"
                                  : "text-emerald-500"
                              }`}>
                                {zone.utilization}%
                              </span>
                            </div>
                            <div className="mt-3 h-3 rounded-full bg-slate-200">
                              <div
                                className={`h-3 rounded-full ${utilizationColor} transition-all duration-500`}
                                style={{ width: `${zone.utilization}%` }}
                              />
                            </div>
                          </div>

                          {/* Zone Stats */}
                          <div className="mt-6 grid grid-cols-2 gap-4">
                            <div className="rounded-2xl bg-slate-100 p-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-600">Current</p>
                              <p className="mt-2 text-lg font-bold text-slate-900">
                                {zone.current.toLocaleString()}
                                <span className="ml-1 text-sm text-slate-500">units</span>
                              </p>
                            </div>
                            <div className="rounded-2xl bg-slate-100 p-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-600">Capacity</p>
                              <p className="mt-2 text-lg font-bold text-slate-900">
                                {zone.capacity.toLocaleString()}
                                <span className="ml-1 text-sm text-slate-500">units</span>
                              </p>
                            </div>
                          </div>

                          {/* Environmental Data */}
                          <div className="mt-6 flex gap-3">
                            <div className="flex flex-1 items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3">
                              <span className="text-lg">🌡️</span>
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600">Temperature</p>
                                <p className="text-sm font-semibold text-slate-900">{zone.temperature}</p>
                              </div>
                            </div>
                            <div className="flex flex-1 items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3">
                              <span className="text-lg">💧</span>
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600">Humidity</p>
                                <p className="text-sm font-semibold text-slate-900">{zone.humidity}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
