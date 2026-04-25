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
  indigo: { bg: "bg-indigo-500/20", text: "text-indigo-300", border: "border-indigo-500/30" },
  cyan: { bg: "bg-cyan-500/20", text: "text-cyan-300", border: "border-cyan-500/30" },
  amber: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/30" },
  blue: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30" },
  violet: { bg: "bg-violet-500/20", text: "text-violet-300", border: "border-violet-500/30" },
  pink: { bg: "bg-pink-500/20", text: "text-pink-300", border: "border-pink-500/30" },
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
                          className={`rounded-xl border ${colors.border} ${colors.bg} p-5 sm:p-6`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${colors.text}`}>
                                {zone.label}
                              </p>
                              <p className="mt-2 text-lg font-semibold text-emerald-50">{zone.name}</p>
                            </div>
                            <TrendingUp className="h-5 w-5 text-emerald-400" />
                          </div>

                          {/* Utilization Bar */}
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-emerald-300">{zone.utilization}%</span>
                              <span className="text-xs text-emerald-300/70">
                                {zone.current.toLocaleString()} / {zone.capacity.toLocaleString()} units
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-emerald-950/40">
                              <div
                                className={`h-full ${utilizationColor} transition-all`}
                                style={{ width: `${zone.utilization}%` }}
                              />
                            </div>
                          </div>

                          {/* Zone Details */}
                          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-emerald-900/30 pt-3">
                            <div>
                              <p className="text-xs text-emerald-300/70">Temperature</p>
                              <p className="mt-1 text-sm font-semibold text-emerald-50">{zone.temperature}</p>
                            </div>
                            <div>
                              <p className="text-xs text-emerald-300/70">Humidity</p>
                              <p className="mt-1 text-sm font-semibold text-emerald-50">{zone.humidity}</p>
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
