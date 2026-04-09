import { ThemeProvider } from "../../../../components/ThemeProvider/ThemeProvider";
import { StaffSidebar } from "../../../../components/dashboard/staff/StaffSidebar";
import { PosTerminal } from "../../../../components/dashboard/admin/PosTerminal";
import { requireStaffSession } from "@/lib/auth/session";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type PosProduct = {
  sku: string;
  name: string;
  category: string;
  quantity: number;
  status: "In Stock" | "Low" | "Critical";
  price: number;
  supplier: string;
  storageZone?: string | null;
};

async function loadPosProducts(accessToken: string): Promise<PosProduct[]> {
  const env = getSupabaseEnv();
  if (!env) {
    return [];
  }

  // Query with the current staff session token so RLS policies evaluate as the logged-in staff user.
  const supabase = createClient(env.url, env.anonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const selectColumns = "sku, product_name, category, stock_level, status, price, supplier, storage_zone";

  const { data: sessionData, error: sessionError } = await supabase
    .from("products")
    .select(selectColumns)
    .order("product_name", { ascending: true });

  let data = sessionData;

  if (sessionError || (sessionData ?? []).length === 0) {
    if (sessionError) {
      console.warn("Unable to load products with staff session", sessionError.message);
    }

    // Fallback for strict RLS setups where staff read access is intentionally restricted.
    try {
      const admin = createSupabaseAdminClient();
      const { data: adminData, error: adminError } = await admin
        .from("products")
        .select(selectColumns)
        .order("product_name", { ascending: true });

      if (adminError) {
        console.warn("Unable to load products with admin fallback", adminError.message);
        return [];
      }

      data = adminData;
    } catch (fallbackError) {
      const message = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      console.warn("Admin fallback unavailable for staff POS", message);
      return [];
    }
  }

  type SupabaseProductRow = {
    sku: string;
    product_name: string;
    category?: string | null;
    stock_level?: number | null;
    status?: string | null;
    price?: number | null;
    supplier?: string | null;
    storage_zone?: string | null;
  };

  return ((data ?? []) as SupabaseProductRow[]).map((product) => {
    const rawStatus = product.status ?? "In Stock";
    const status: PosProduct["status"] =
      rawStatus === "Low" || rawStatus === "Critical" ? rawStatus : "In Stock";

    return {
      sku: product.sku,
      name: product.product_name,
      category: product.category ?? "",
      quantity: product.stock_level ?? 0,
      status,
      price: Number(product.price ?? 0),
      supplier: product.supplier ?? "",
      storageZone: product.storage_zone ?? null,
    };
  });
}

export default async function StaffPosPage() {
  const staffSession = await requireStaffSession();

  const liveDataUnavailable = !getSupabaseEnv();
  const products = await loadPosProducts(staffSession.accessToken);

  const totalUnits = products.reduce((sum, product) => sum + product.quantity, 0);
  const availableItems = products.filter((product) => product.quantity > 0).length;
  const lowStockItems = products.filter((product) => product.status !== "In Stock").length;

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
                <p className="mt-1 text-sm font-semibold text-slate-600">Internal POS checkout</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-500">
                    <span className="absolute inline-flex h-4 w-4 rounded-full bg-emerald-400/40" />
                  </span>
                  <span className="whitespace-nowrap">Checkout enabled</span>
                </div>
              </div>
            </header>

            <div className="px-4 py-6 sm:px-8 lg:px-10">
              <div className="mx-auto max-w-7xl space-y-5 pb-8">
                {liveDataUnavailable ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Live data unavailable. Supabase is not configured, so the POS catalog cannot load.
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-emerald-100 bg-white p-4 shadow-[0_18px_40px_rgba(148,163,184,0.12)] sm:p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">Products available</p>
                    <p className="mt-3 text-2xl font-bold text-emerald-950 sm:text-3xl">{availableItems}</p>
                  </div>
                  
                  <div className="rounded-lg border border-emerald-100 bg-white p-4 shadow-[0_18px_40px_rgba(148,163,184,0.12)] sm:p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">Units on hand</p>
                    <p className="mt-3 text-2xl font-bold text-emerald-950 sm:text-3xl">{totalUnits}</p>
                  </div>

                  <div className="rounded-lg border border-emerald-100 bg-white p-4 shadow-[0_18px_40px_rgba(148,163,184,0.12)] sm:p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">Low stock alerts</p>
                    <p className="mt-3 text-2xl font-bold text-emerald-950 sm:text-3xl">{lowStockItems}</p>
                  </div>
                </div>

                <PosTerminal initialProducts={products} actorUserId={staffSession.userId} />
              </div>
            </div>
          </main>
        </div>
      </ThemeProvider>
    </div>
  );
}