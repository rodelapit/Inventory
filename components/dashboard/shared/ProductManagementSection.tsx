import type { ProductFeedItem } from "@/data/dashboard";
import { Search, Filter } from "lucide-react";

type ProductManagementSectionProps = {
  productFeed: ProductFeedItem[];
};

export function ProductManagementSection({
  productFeed,
}: ProductManagementSectionProps) {
  const inStockCount = productFeed.filter((item) => item.status === "In Stock").length;
  const lowCount = productFeed.filter((item) => item.status === "Low").length;
  const criticalCount = productFeed.filter((item) => item.status === "Critical").length;

  return (
    <section
      id="product-feed"
      className="scroll-mt-4 overflow-hidden rounded-[34px] border border-slate-900/8 bg-[rgba(255,255,255,0.84)] shadow-[0_30px_70px_rgba(148,163,184,0.18)] lg:flex-1"
    >
      <div className="border-b border-slate-900/8 px-4 py-5 sm:px-5 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Operations stream</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">Live product feed</h2>
            <p className="mt-2 text-sm text-slate-600">Real-time inventory signals with clearer status cues and faster scanning.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-500/14 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-700">
              {inStockCount} in stock
            </span>
            <span className="rounded-full border border-amber-500/14 bg-amber-500/10 px-3.5 py-2 text-sm font-semibold text-amber-700">
              {lowCount} low
            </span>
            <span className="rounded-full border border-rose-500/14 bg-rose-500/10 px-3.5 py-2 text-sm font-semibold text-rose-700">
              {criticalCount} critical
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="w-full min-w-0 sm:w-auto sm:min-w-[18rem] sm:max-w-sm md:max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute inset-y-0 left-4 flex h-full w-5 items-center text-slate-400" />
              <input
                aria-label="Search products"
                placeholder="Search products or SKU..."
                readOnly
                value=""
                className="w-full rounded-full border border-slate-900/8 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 sm:text-base"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 rounded-full border border-slate-900/8 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3.5 py-3.5 sm:px-5 lg:px-6 lg:py-5">
        <table className="w-full min-w-140 text-left lg:min-w-180">
          <thead className="text-[11px] uppercase tracking-[0.22em] text-slate-500 sm:text-xs">
            <tr>
              <th className="px-3.5 py-3 sm:px-5 lg:px-6 lg:py-4">SKU</th>
              <th className="px-3.5 py-3 sm:px-5 lg:px-6 lg:py-4">Product Name</th>
              <th className="px-3.5 py-3 sm:px-5 lg:px-6 lg:py-4">Stock Level</th>
              <th className="px-3.5 py-3 sm:px-5 lg:px-6 lg:py-4">Expiration</th>
              <th className="px-3.5 py-3 sm:px-5 lg:px-6 lg:py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {productFeed.map((item, index) => (
              <tr
                key={`${item.sku}-${item.expiration}-${index}`}
                className="border-t border-slate-900/8 text-xs text-slate-700 transition hover:bg-slate-50 sm:text-sm xl:text-base"
              >
                <td className="px-3.5 py-4 font-semibold text-sky-700 sm:px-5 lg:px-6">
                  <span className="rounded-full border border-sky-500/14 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-sky-700">
                    {item.sku}
                  </span>
                </td>
                <td className="px-3.5 py-4 sm:px-5 lg:px-6">
                  <div>
                    <p className="font-semibold text-slate-950">{item.productName}</p>
                    <p className="mt-1 text-xs text-slate-500">Live tracked inventory item</p>
                  </div>
                </td>
                <td className="px-3.5 py-4 sm:px-5 lg:px-6">
                  <div className="text-sm font-semibold text-slate-950">{item.stockLevel} units</div>
                </td>
                <td className="px-3.5 py-4 text-slate-600 sm:px-5 lg:px-6">{item.expiration}</td>
                <td className="px-3.5 py-4 sm:px-5 lg:px-6">
                  <span
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] sm:text-xs ${
                      item.status === "In Stock"
                        ? "bg-emerald-500/12 text-emerald-700"
                        : item.status === "Low"
                        ? "bg-amber-500/12 text-amber-700"
                        : "bg-rose-500/12 text-rose-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
