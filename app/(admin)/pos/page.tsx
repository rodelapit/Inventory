import { AppSidebar } from "../../../components/dashboard/admin/AppSidebar";
import { ThemeProvider } from "../../../components/ThemeProvider/ThemeProvider";
import { PageHeader } from "../../../components/dashboard/admin/PageHeader";
import { PosTerminal } from "../../../components/dashboard/admin/PosTerminal";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

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

async function loadPosProducts(): Promise<PosProduct[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("sku, product_name, category, stock_level, status, price, supplier, storage_zone")
    .order("product_name", { ascending: true });

  if (error) {
    console.error("Error loading products for POS", error);
    return [];
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

export default async function PosPage() {
  const liveDataUnavailable = !isSupabaseConfigured();
  const products = await loadPosProducts();

  const totalUnits = products.reduce((sum, product) => sum + product.quantity, 0);
  const availableItems = products.filter((product) => product.quantity > 0).length;
  const lowStockItems = products.filter((product) => product.status !== "In Stock").length;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eef2f7]">
      <div className="grid min-h-screen lg:grid-cols-[292px_minmax(0,1fr)]">
        <AppSidebar />

        <main className="flex min-w-0 flex-col">
          <ThemeProvider initial="dashboard">
            <PageHeader
              title="Internal POS"
              description="Complete in-store sales, reduce inventory automatically, and keep order history inside the operations hub."
              actions={
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                  Internal only
                </span>
              }
            />

            <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
              <div className="space-y-5 pb-10">
                {liveDataUnavailable ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Live data unavailable. Supabase is not configured, so the POS catalog cannot load.
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl border border-slate-900/8 bg-white/90 p-4 shadow-[0_18px_40px_rgba(148,163,184,0.18)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Products available</p>
                    <p className="mt-3 text-3xl font-bold text-slate-950">{availableItems}</p>
                  </div>
                  <div className="rounded-3xl border border-sky-100 bg-sky-50 p-4 shadow-[0_18px_40px_rgba(56,189,248,0.16)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Units on hand</p>
                    <p className="mt-3 text-3xl font-bold text-slate-950">{totalUnits}</p>
                  </div>
                  <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 shadow-[0_18px_40px_rgba(251,191,36,0.16)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Low stock alerts</p>
                    <p className="mt-3 text-3xl font-bold text-amber-900">{lowStockItems}</p>
                  </div>
                </div>

                <PosTerminal initialProducts={products} />
              </div>
            </div>
          </ThemeProvider>
        </main>
      </div>
    </div>
  );
}