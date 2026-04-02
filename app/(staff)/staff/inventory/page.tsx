import { ThemeProvider } from "../../../../components/ThemeProvider/ThemeProvider";
import { StaffSidebar } from "../../../../components/dashboard/staff/StaffSidebar";
import { getDashboardData } from "../../../../lib/dashboard/get-dashboard-data";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
};

const zoneCapacities: Record<string, { capacity: number; temperature: string; humidity: string }> = {
  A: { capacity: 15000, temperature: "20-25°C", humidity: "45-55%" },
  B: { capacity: 5000, temperature: "2-4°C", humidity: "85-90%" },
  Q: { capacity: 500, temperature: "20°C", humidity: "50%" },
  C: { capacity: 3000, temperature: "-18 to -20°C", humidity: "40-55%" },
  D: { capacity: 8000, temperature: "18-22°C", humidity: "35-45%" },
  E: { capacity: 2000, temperature: "18-22°C", humidity: "50%" },
};

const zoneMeta: Record<string, string> = {
  A: "Ambient Storage",
  B: "Cold Storage",
  Q: "Quarantined Stock",
  C: "Frozen Storage",
  D: "Dry Storage",
  E: "Receiving Area",
};

const zoneColors: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-indigo-500/20", text: "text-indigo-300", border: "border-indigo-500/30" },
  B: { bg: "bg-cyan-500/20", text: "text-cyan-300", border: "border-cyan-500/30" },
  Q: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/30" },
  C: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30" },
  D: { bg: "bg-violet-500/20", text: "text-violet-300", border: "border-violet-500/30" },
  E: { bg: "bg-pink-500/20", text: "text-pink-300", border: "border-pink-500/30" },
};

export default async function StaffInventoryPage() {
  const cookieStore = await cookies();
  const staffAuth = cookieStore.get("staff_auth")?.value;

  if (staffAuth !== "1") {
    redirect("/staff/login");
  }

  // fetch latest products directly from Supabase
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
      products = [];
    }
  }

  // derive per-zone current values from products using storageZone
  const zoneCurrentMap = new Map<string, number>();
  for (const p of products) {
    const rawZone = (p.storageZone ?? "").toString().trim().toUpperCase();
    const zone = rawZone || "E";
    const previous = zoneCurrentMap.get(zone) ?? 0;
    const qty = Number.isNaN(Number(p.quantity)) ? 0 : Number(p.quantity);
    zoneCurrentMap.set(zone, previous + qty);
  }

  const zones: InventoryZone[] = Object.entries(zoneCapacities).map(
    ([id, { capacity, temperature, humidity }]) => {
      const current = zoneCurrentMap.get(id.toUpperCase()) ?? 0;
      const utilization = Math.round((current / Math.max(1, capacity)) * 100);
      return {
        id,
        label: `ZONE ${id}`,
        name: zoneMeta[id] || `Storage Zone ${id}`,
        current,
        capacity,
        utilization: Math.min(100, utilization),
        temperature,
        humidity,
      };
    }
  );

  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);
  const totalCurrent = zones.reduce((sum, z) => sum + z.current, 0);
  const avgUtilization = Math.round((totalCurrent / Math.max(1, totalCapacity)) * 100);
  const availableSpace = totalCapacity - totalCurrent;

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
                      const colors = zoneColors[zone.id.toUpperCase()] || zoneColors.A;
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
