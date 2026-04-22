import { AppSidebar } from "../../../components/dashboard/admin/AppSidebar";
import { ThemeProvider } from "../../../components/ThemeProvider/ThemeProvider";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import ProductsClient from "@/components/products/ProductsClient";

// Always fetch fresh data for this page so new products show immediately.
export const dynamic = "force-dynamic";

type ProductRow = {
  sku: string;
  name: string;
  category: string;
  quantity: number;
  status: "In Stock" | "Low" | "Critical";
  price: number;
  supplier: string;
  storageZone?: string | null;
};

type ProductLoadResult = {
  rows: ProductRow[];
  error: string | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const maybeError = error as { message?: unknown; details?: unknown };
    const message = typeof maybeError.message === "string" ? maybeError.message : "";
    const details = typeof maybeError.details === "string" ? maybeError.details : "";
    return [message, details].filter(Boolean).join(" - ") || "Unknown error";
  }
  return String(error ?? "Unknown error");
}

async function getProducts(): Promise<ProductLoadResult> {
  if (!isSupabaseConfigured()) {
    return { rows: [], error: "Supabase is not configured." };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("sku, product_name, category, stock_level, status, price, supplier, storage_zone")
    .order("product_name", { ascending: true });

  if (error) {
    // Connectivity issues are surfaced to the page banner below; avoid throwing noisy dev overlays.
    console.warn("Unable to load products for catalog", getErrorMessage(error));
    return { rows: [], error: getErrorMessage(error) };
  }

  if (!data) {
    return { rows: [], error: null };
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

  const rows = (data as SupabaseProductRow[]).map((p) => {
    const rawStatus = p.status ?? "In Stock";
    const status: ProductRow["status"] =
      rawStatus === "Low" || rawStatus === "Critical" ? rawStatus : "In Stock";

    return {
      sku: p.sku,
      name: p.product_name,
      category: p.category ?? "",
      quantity: p.stock_level ?? 0,
      status,
      price: Number(p.price ?? 0),
      supplier: p.supplier ?? "",
      storageZone: p.storage_zone ?? null,
    };
  });

  return { rows, error: null };
}

export default async function ProductsPage() {
  const liveDataUnavailable = !isSupabaseConfigured();
  const productResult = await getProducts();
  const productRows = productResult.rows;
  const productLoadError = productResult.error;
  const totalProducts = productRows.length;
  const lowStockCount = productRows.filter((p) => p.status === "Low" || p.status === "Critical").length;
  const categoriesCount = new Set(productRows.map((p) => p.category).filter(Boolean)).size;
  const totalValue = productRows.reduce((sum, p) => sum + p.quantity * p.price, 0);
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eef2f7]">
      <div className="grid min-h-screen lg:grid-cols-[292px_minmax(0,1fr)]">
        <AppSidebar />

        <main className="flex min-w-0 flex-col">
          <ThemeProvider initial="dashboard">
            <header className="border-b border-slate-900/8 bg-[rgba(239,244,251,0.9)] px-4 py-5 backdrop-blur-xl sm:px-6 lg:px-8">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700/85">
                    Products
                  </p>
                  <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-3xl">
                    Product catalog
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base">
                    Manage inventory levels, pricing, and storage zones in one place.
                  </p>
                </div>
              </div>
            </header>

            <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
              <div className="space-y-5">
                {liveDataUnavailable ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Live data unavailable. Supabase is not configured, so products cannot be loaded.
                  </div>
                ) : null}
                {!liveDataUnavailable && productLoadError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    Unable to load products from Supabase: {productLoadError}
                  </div>
                ) : null}
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-3xl border border-slate-900/8 bg-white/90 p-4 shadow-[0_18px_40px_rgba(148,163,184,0.18)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Total products
                    </p>
                    <p className="mt-3 text-3xl font-bold text-slate-950">{totalProducts}</p>
                  </div>
                  <div className="rounded-3xl border border-rose-100 bg-rose-50 p-4 shadow-[0_18px_40px_rgba(248,113,113,0.16)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                      Low or critical
                    </p>
                    <p className="mt-3 text-3xl font-bold text-rose-900">{lowStockCount}</p>
                  </div>
                  <div className="rounded-3xl border border-sky-100 bg-sky-50 p-4 shadow-[0_18px_40px_rgba(56,189,248,0.16)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      Categories
                    </p>
                    <p className="mt-3 text-3xl font-bold text-slate-950">{categoriesCount}</p>
                  </div>
                  <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 shadow-[0_18px_40px_rgba(16,185,129,0.18)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Total value
                    </p>
                    <p className="mt-3 text-2xl font-bold text-emerald-900 sm:text-3xl">
                      ₱{totalValue.toFixed(2)}
                    </p>
                  </div>
                </div>

                <section className="rounded-3xl border border-slate-900/8 bg-white/95 pb-4 pt-3.5 shadow-[0_22px_55px_rgba(148,163,184,0.2)]">
                  <ProductsClient initialRows={productRows} initialLoadError={productLoadError} />
                </section>
              </div>
            </div>
          </ThemeProvider>
        </main>
      </div>
    </div>
  );
}
