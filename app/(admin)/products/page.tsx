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

const fallbackProducts: ProductRow[] = [
  {
    sku: "PRD-1081",
    name: "Coca-Cola",
    category: "Beverages",
    quantity: 184,
    status: "In Stock",
    price: 1.99,
    supplier: "Coca-Cola Company",
  },
  {
    sku: "PRD-1043",
    name: "Instant Noodles Pack",
    category: "Dry Goods",
    quantity: 62,
    status: "Low",
    price: 0.99,
    supplier: "Asian Foods Inc",
  },
  {
    sku: "PRD-1180",
    name: "Whole Milk",
    category: "Dairy",
    quantity: 28,
    status: "Critical",
    price: 3.49,
    supplier: "Fresh Dairy Co",
  },
  {
    sku: "PRD-1205",
    name: "Orange Juice",
    category: "Beverages",
    quantity: 145,
    status: "In Stock",
    price: 4.99,
    supplier: "Tropicana Foods",
  },
  {
    sku: "PRD-1312",
    name: "Greek Yogurt",
    category: "Dairy",
    quantity: 89,
    status: "In Stock",
    price: 2.49,
    supplier: "Chobani LLC",
  },
];

async function getProducts(): Promise<ProductRow[]> {
  if (!isSupabaseConfigured()) {
    return fallbackProducts;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("sku, product_name, category, stock_level, status, price, supplier, storage_zone")
    .order("product_name", { ascending: true });

  if (error) {
    console.error("Error loading products for catalog", error);
    return [];
  }

  if (!data) {
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

  return (data as SupabaseProductRow[]).map((p) => {
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
}

export default async function ProductsPage() {
  const productRows = await getProducts();
  const totalProducts = productRows.length;
  const lowStockCount = productRows.filter((p) => p.status === "Low" || p.status === "Critical").length;
  const categoriesCount = new Set(productRows.map((p) => p.category).filter(Boolean)).size;
  const totalValue = productRows.reduce((sum, p) => sum + p.quantity * p.price, 0);
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
              <div className="mx-auto max-w-7xl space-y-5">
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
                      ${totalValue.toFixed(2)}
                    </p>
                  </div>
                </div>

                <section className="rounded-3xl border border-slate-900/8 bg-white/95 pb-4 pt-3.5 shadow-[0_22px_55px_rgba(148,163,184,0.2)]">
                  <ProductsClient initialRows={productRows} />
                </section>
              </div>
            </div>
          </ThemeProvider>
        </main>
      </div>
    </div>
  );
}
570698-52