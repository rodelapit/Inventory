import { AppSidebar } from "../../../components/dashboard/admin/AppSidebar";
import { ThemeProvider } from "../../../components/ThemeProvider/ThemeProvider";
import type { ProductFeedItem, ZoneCard } from "@/data/dashboard";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { FileSpreadsheet, Download, Filter, CalendarDays, ArrowUpRight, ArrowDownRight, ShoppingCart, Wallet, ReceiptText, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";
const SALES_HISTORY_PAGE_SIZE = 12;

type OrderRow = {
  id: string;
  order_number?: string | null;
  customer_name?: string | null;
  total_amount?: number | null;
  order_status?: string | null;
  order_date?: string | null;
  created_at?: string | null;
};

type PaymentRow = {
  method?: string | null;
  amount?: number | null;
  paid_at?: string | null;
};

type SalesPaymentSummary = {
  method: string;
  amount: number;
  count: number;
};

type SalesSummary = {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  deliveredOrders: number;
  refundedOrders: number;
  voidedOrders: number;
  recentOrders: OrderRow[];
  salesHistory: OrderRow[];
  paymentMethods: SalesPaymentSummary[];
  monthlyRevenue: Array<{ month: string; revenue: number }>;
};

function normalizeOrderStatus(status?: string | null): "Delivered" | "In Transit" | "Pending" | "Refunded" | "Voided" {
  const value = (status ?? "").toLowerCase();
  if (value.includes("void") || value.includes("cancel")) return "Voided";
  if (value.includes("refund")) return "Refunded";
  if (value.includes("deliver") || value.includes("complete")) return "Delivered";
  if (value.includes("transit") || value.includes("ship")) return "In Transit";
  return "Pending";
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function loadOrders(supabase: ReturnType<typeof createSupabaseServerClient>) {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, total_amount, order_status, order_date, created_at")
    .order("order_date", { ascending: false })
    .limit(1000);

  if (error) {
    return { data: [] as OrderRow[], error };
  }

  return { data: (data ?? []) as OrderRow[], error: null };
}

function buildQueryString(params: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text.length === 0) continue;
    query.set(key, text);
  }
  return query.toString();
}

async function loadReportsData(): Promise<{ productFeed: ProductFeedItem[]; zoneCards: ZoneCard[]; salesSummary: SalesSummary }> {
  if (!isSupabaseConfigured()) {
    return {
      productFeed: [],
      zoneCards: [],
      salesSummary: {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        deliveredOrders: 0,
        refundedOrders: 0,
        voidedOrders: 0,
        recentOrders: [],
        salesHistory: [],
        paymentMethods: [],
        monthlyRevenue: [],
      },
    };
  }

  const supabase = createSupabaseServerClient();

  try {
    const [productsResult, zonesResult, ordersResult, paymentsResult] = await Promise.all([
      supabase.from("products").select("sku, product_name, stock_level, status, expiration"),
      supabase.from("zones").select("id, label, name, current"),
      loadOrders(supabase),
      supabase.from("payments").select("method, amount, paid_at"),
    ]);

    const { data: products, error: productError } = productsResult;
    if (productError) {
      console.error("Error loading products for reports", productError);
    }

    type ReportsProductRow = {
      sku: string;
      product_name: string;
      stock_level?: number | null;
      status?: string | null;
      expiration?: string | null;
    };

    const productRows: ReportsProductRow[] = (products ?? []) as ReportsProductRow[];
    const productFeed: ProductFeedItem[] = productRows.map((p) => {
      const rawStatus = p.status ?? "In Stock";
      const status: ProductFeedItem["status"] =
        rawStatus === "Low" || rawStatus === "Critical" ? rawStatus : "In Stock";

      return {
        sku: p.sku,
        productName: p.product_name,
        stockLevel: p.stock_level ?? 0,
        expiration: p.expiration ? new Date(p.expiration).toLocaleDateString() : "",
        status,
      };
    });

    let zoneCards: ZoneCard[];
    if (zonesResult.error) {
      console.error("Error loading zones for reports", zonesResult.error);
      zoneCards = [];
    } else {
      type ZoneRow = {
        id?: string | number | null;
        label?: string | null;
        name?: string | null;
        current?: number | null;
      };

      const zoneRows: ZoneRow[] = (zonesResult.data ?? []) as ZoneRow[];
      zoneCards = zoneRows.map((z) => ({
        zone: z.label ?? (z.id ? `ZONE ${z.id}` : ""),
        name: z.name ?? "",
        units: z.current ?? 0,
        trend: "",
        trendUp: true,
      }));
    }

    const orderRows = (ordersResult.data ?? []) as OrderRow[];
    const paymentRows = (paymentsResult.data ?? []) as PaymentRow[];

    const totalRevenue = orderRows.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);
    const totalOrders = orderRows.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const deliveredOrders = orderRows.filter((order) => normalizeOrderStatus(order.order_status) === "Delivered").length;
    const refundedOrders = orderRows.filter((order) => normalizeOrderStatus(order.order_status) === "Refunded").length;
    const voidedOrders = orderRows.filter((order) => normalizeOrderStatus(order.order_status) === "Voided").length;

    const paymentMap = new Map<string, { amount: number; count: number }>();
    for (const payment of paymentRows) {
      const method = String(payment.method ?? "other").trim().toLowerCase() || "other";
      const current = paymentMap.get(method) ?? { amount: 0, count: 0 };
      current.amount += Number(payment.amount ?? 0);
      current.count += 1;
      paymentMap.set(method, current);
    }

    const paymentMethods: SalesPaymentSummary[] = Array.from(paymentMap.entries())
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([method, summary]) => ({
        method: method.toUpperCase(),
        amount: summary.amount,
        count: summary.count,
      }));

    const monthlyMap = new Map<string, number>();
    for (const order of orderRows) {
      const orderDate = safeDate(order.order_date ?? order.created_at);
      if (!orderDate) continue;
      const key = orderDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(order.total_amount ?? 0));
    }

    const monthlyRevenue = Array.from(monthlyMap.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .slice(-6);

    const recentOrders = orderRows.slice(0, 6);
    const salesHistory = orderRows;

    return {
      productFeed,
      zoneCards,
      salesSummary: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        deliveredOrders,
        refundedOrders,
        voidedOrders,
        recentOrders,
        salesHistory,
        paymentMethods,
        monthlyRevenue,
      },
    };
  } catch (err) {
    console.error("Unexpected error loading reports data", err);
    return {
      productFeed: [],
      zoneCards: [],
      salesSummary: {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        deliveredOrders: 0,
        refundedOrders: 0,
        voidedOrders: 0,
        recentOrders: [],
        salesHistory: [],
        paymentMethods: [],
        monthlyRevenue: [],
      },
    };
  }
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: {
    page?: string;
    q?: string;
    status?: string;
  };
}) {
  const liveDataUnavailable = !isSupabaseConfigured();
  const { productFeed, zoneCards, salesSummary } = await loadReportsData();

  const query = String(searchParams?.q ?? "").trim();
  const statusRaw = String(searchParams?.status ?? "all").trim().toLowerCase();
  const statusFilter =
    statusRaw === "delivered" ||
    statusRaw === "in-transit" ||
    statusRaw === "pending" ||
    statusRaw === "refunded" ||
    statusRaw === "voided"
      ? statusRaw
      : "all";
  const parsedPage = Number(searchParams?.page ?? 1);
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;

  const totalProducts = productFeed.length;
  const lowItems = productFeed.filter((p) => p.status === "Low").length;
  const criticalItems = productFeed.filter((p) => p.status === "Critical").length;
  const totalUnits = productFeed.reduce((sum, p) => sum + p.stockLevel, 0);

  const totalZoneUnits = zoneCards.reduce((sum, z) => sum + z.units, 0) || 1;
  const zoneDistribution = zoneCards.map((z) => ({
    ...z,
    share: Math.round((z.units / totalZoneUnits) * 100),
  }));

  const expirySorted = [...productFeed].sort((a, b) => {
    const da = new Date(a.expiration).getTime();
    const db = new Date(b.expiration).getTime();
    if (Number.isNaN(da) || Number.isNaN(db)) return 0;
    return da - db;
  });

  const topExpiryRisk = expirySorted.slice(0, 4);

  const filteredSalesHistory = salesSummary.salesHistory.filter((order) => {
    const normalizedStatus = normalizeOrderStatus(order.order_status);
    const statusMatches =
      statusFilter === "all" ||
      (statusFilter === "in-transit" ? normalizedStatus === "In Transit" : normalizedStatus.toLowerCase() === statusFilter);

    if (!statusMatches) return false;
    if (!query) return true;

    const searchBlob = [order.order_number ?? "", order.customer_name ?? "", normalizedStatus].join(" ").toLowerCase();
    return searchBlob.includes(query.toLowerCase());
  });

  const totalFilteredRows = filteredSalesHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredRows / SALES_HISTORY_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * SALES_HISTORY_PAGE_SIZE;
  const pagedSalesHistory = filteredSalesHistory.slice(pageStart, pageStart + SALES_HISTORY_PAGE_SIZE);

  const prevPageQuery = buildQueryString({
    q: query || null,
    status: statusFilter === "all" ? null : statusFilter,
    page: safeCurrentPage > 1 ? safeCurrentPage - 1 : 1,
  });
  const nextPageQuery = buildQueryString({
    q: query || null,
    status: statusFilter === "all" ? null : statusFilter,
    page: safeCurrentPage < totalPages ? safeCurrentPage + 1 : totalPages,
  });

  return (
    <div id="top" className="min-h-screen overflow-x-hidden bg-[#eef2f7]">
      <div className="grid min-h-screen lg:grid-cols-[292px_minmax(0,1fr)]">
        <AppSidebar />

        <main className="flex min-w-0 flex-col">
          <ThemeProvider initial="dashboard">
            <header className="border-b border-slate-900/8 bg-[rgba(239,244,251,0.9)] px-4 py-5 backdrop-blur-xl sm:px-6 lg:px-8">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700/85">
                    Reports
                  </p>
                  <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-3xl">
                    Analytics &amp; reports
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base">
                    Review stock health, zone utilization, and expiry risk at a glance.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-slate-900/8 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-[0_12px_30px_rgba(148,163,184,0.22)] sm:px-4 sm:text-sm">
                    <CalendarDays className="h-4 w-4 text-sky-700" />
                    Full history
                  </div>
                  <a href="#sales-history" className="flex items-center gap-2 rounded-full border border-slate-900/8 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-[0_12px_30px_rgba(148,163,184,0.18)] sm:px-4 sm:text-sm">
                    <Filter className="h-4 w-4 text-slate-700" />
                    Jump to filters
                  </a>
                  <a
                    href="/api/reports/export"
                    className="flex items-center gap-2 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_18px_40px_rgba(14,165,233,0.5)] hover:bg-sky-700 sm:px-4 sm:text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </a>
                </div>
              </div>
            </header>

            <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
              <div className="space-y-6">
                {liveDataUnavailable ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Live data unavailable. Supabase is not configured, so reports may appear empty.
                  </div>
                ) : null}
                {/* KPI cards */}
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-3xl border border-sky-100 bg-white/90 p-4 shadow-[0_18px_40px_rgba(148,163,184,0.18)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                        Total SKUs
                      </p>
                      <FileSpreadsheet className="h-5 w-5 text-sky-700" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-slate-950">{totalProducts}</p>
                    <p className="mt-1 text-xs text-slate-500">Unique products tracked in the catalog</p>
                  </div>

                  <div className="rounded-3xl border border-sky-100 bg-sky-50 p-4 shadow-[0_18px_40px_rgba(14,165,233,0.12)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                        Low stock
                      </p>
                      <ArrowDownRight className="h-5 w-5 text-sky-700" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-sky-950">{lowItems}</p>
                    <p className="mt-1 text-xs text-slate-500">Items flagged for replenishment soon</p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-[0_18px_40px_rgba(148,163,184,0.12)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                        Critical stock
                      </p>
                      <ArrowDownRight className="h-5 w-5 text-slate-600" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-slate-900">{criticalItems}</p>
                    <p className="mt-1 text-xs text-slate-500">Items at or below safety threshold</p>
                  </div>

                  <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 shadow-[0_18px_40px_rgba(16,185,129,0.18)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                        Total units
                      </p>
                      <ArrowUpRight className="h-5 w-5 text-emerald-700" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-emerald-900">{totalUnits}</p>
                    <p className="mt-1 text-xs text-emerald-800/80">Sum of on-hand units across products</p>
                  </div>
                </section>

                {/* Zone utilization + expiry risk */}
                <section className="grid gap-6 lg:grid-cols-[1.4fr_minmax(0,1fr)]">
                  {/* Zones */}
                  <div className="rounded-3xl border border-slate-900/8 bg-white/95 p-4 sm:p-5 shadow-[0_22px_55px_rgba(148,163,184,0.2)]">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-950 sm:text-xl">Inventory by Zone</h2>
                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                          Distribution of units across storage zones.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {zoneDistribution.map((zone) => (
                        <div key={zone.zone} className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-3.5">
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold tracking-[0.16em] text-sky-700">
                                {zone.zone}
                              </span>
                              <span className="text-slate-900">{zone.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-900">{zone.units.toLocaleString()} units</p>
                              <p className="text-[11px] text-slate-500">{zone.share}% of zone volume</p>
                            </div>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-linear-to-r from-sky-500 to-emerald-500"
                              style={{ width: `${zone.share}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expiry risk */}
                  <div id="expiry-risk" className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_22px_55px_rgba(148,163,184,0.14)]">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-950 sm:text-xl">Expiry risk</h2>
                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                          Products closest to their expiration date.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {topExpiryRisk.map((item, index) => (
                        <div
                          key={`${item.sku}-${index}`}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs sm:text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{item.productName}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">SKU {item.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-700">{item.expiration}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">Check rotation</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Sales performance */}
                <section className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Sales performance</h2>
                    <p className="mt-1 text-sm text-slate-600">POS revenue, order flow, and payment mix.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-3xl border border-sky-100 bg-sky-50 p-4 shadow-[0_18px_40px_rgba(14,165,233,0.14)]">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Revenue</p>
                        <Wallet className="h-5 w-5 text-sky-700" />
                      </div>
                      <p className="mt-3 text-3xl font-bold text-sky-950">{formatMoney(salesSummary.totalRevenue)}</p>
                      <p className="mt-1 text-xs text-sky-800/80">Total completed sales value</p>
                    </div>

                    <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 shadow-[0_18px_40px_rgba(16,185,129,0.14)]">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Orders</p>
                        <ShoppingCart className="h-5 w-5 text-emerald-700" />
                      </div>
                      <p className="mt-3 text-3xl font-bold text-emerald-950">{salesSummary.totalOrders}</p>
                      <p className="mt-1 text-xs text-emerald-800/80">POS transactions recorded</p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-[0_18px_40px_rgba(148,163,184,0.12)]">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Avg order</p>
                        <ReceiptText className="h-5 w-5 text-slate-600" />
                      </div>
                      <p className="mt-3 text-3xl font-bold text-slate-950">{formatMoney(salesSummary.averageOrderValue)}</p>
                      <p className="mt-1 text-xs text-slate-500">Average revenue per order</p>
                    </div>

                    <div className="rounded-3xl border border-sky-100 bg-white p-4 shadow-[0_18px_40px_rgba(14,165,233,0.08)]">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Returns</p>
                        <CreditCard className="h-5 w-5 text-sky-700" />
                      </div>
                      <p className="mt-3 text-3xl font-bold text-slate-950">{salesSummary.refundedOrders + salesSummary.voidedOrders}</p>
                      <p className="mt-1 text-xs text-slate-500">Refunded or voided orders</p>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1.4fr_minmax(0,1fr)]">
                    <div className="rounded-3xl border border-slate-900/8 bg-white/95 p-4 sm:p-5 shadow-[0_22px_55px_rgba(148,163,184,0.2)]">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-950 sm:text-xl">Recent sales</h3>
                          <p className="mt-1 text-xs text-slate-500 sm:text-sm">Latest POS orders and their status.</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-y-1 text-left text-xs sm:text-sm">
                          <thead className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            <tr>
                              <th className="px-3 py-2">Order</th>
                              <th className="px-3 py-2">Customer</th>
                              <th className="px-3 py-2">Amount</th>
                              <th className="px-3 py-2">Status</th>
                              <th className="px-3 py-2 text-right">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {salesSummary.recentOrders.map((order) => {
                              const status = normalizeOrderStatus(order.order_status);
                              const orderLabel = order.order_number ?? order.id.slice(0, 8).toUpperCase();
                              return (
                                <tr key={order.id} className="rounded-xl bg-slate-50">
                                  <td className="px-3 py-2.5 align-middle font-semibold text-slate-900">{orderLabel}</td>
                                  <td className="px-3 py-2.5 align-middle text-slate-600">{order.customer_name ?? "Walk-in Customer"}</td>
                                  <td className="px-3 py-2.5 align-middle font-semibold text-slate-900">{formatMoney(Number(order.total_amount ?? 0))}</td>
                                  <td className="px-3 py-2.5 align-middle">
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${status === "Delivered" ? "bg-emerald-100 text-emerald-700" : status === "Refunded" ? "bg-sky-100 text-sky-700" : status === "Voided" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-700"}`}>
                                      {status}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-right align-middle text-slate-600">
                                    {(order.order_date ?? order.created_at) ? new Date(order.order_date ?? order.created_at ?? "").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-900/8 bg-white/95 p-4 sm:p-5 shadow-[0_22px_55px_rgba(148,163,184,0.2)]">
                      <h3 className="text-lg font-semibold text-slate-950 sm:text-xl">Payment mix</h3>
                      <p className="mt-1 text-xs text-slate-500 sm:text-sm">Breakdown of recorded payment methods.</p>

                      <div className="mt-4 space-y-3">
                        {salesSummary.paymentMethods.length > 0 ? (
                          salesSummary.paymentMethods.map((payment) => (
                            <div key={payment.method} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{payment.method}</p>
                                  <p className="mt-0.5 text-xs text-slate-500">{payment.count} payment(s)</p>
                                </div>
                                <p className="text-sm font-semibold text-slate-900">{formatMoney(payment.amount)}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                            No payment records yet.
                          </div>
                        )}
                      </div>

                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Refund / void count</p>
                        <p className="mt-2 text-2xl font-bold text-slate-950">{salesSummary.refundedOrders + salesSummary.voidedOrders}</p>
                        <p className="mt-1 text-xs text-slate-500">Tracked from order status values</p>
                      </div>

                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sales trend</p>
                        <div className="mt-3 space-y-2">
                          {salesSummary.monthlyRevenue.length > 0 ? (
                            salesSummary.monthlyRevenue.map((entry) => (
                              <div key={entry.month}>
                                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                                  <span>{entry.month}</span>
                                  <span>{formatMoney(entry.revenue)}</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-200">
                                  <div
                                    className="h-2 rounded-full bg-linear-to-r from-sky-500 to-emerald-500"
                                    style={{ width: `${Math.min(100, Math.round((entry.revenue / Math.max(1, salesSummary.totalRevenue)) * 100))}%` }}
                                  />
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">No sales trend data yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section id="sales-history" className="rounded-3xl border border-slate-900/8 bg-white/95 p-4 sm:p-5 shadow-[0_22px_55px_rgba(148,163,184,0.2)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950 sm:text-xl">Sales history</h2>
                      <p className="mt-1 text-xs text-slate-500 sm:text-sm">Search and filter loaded sales records from Supabase.</p>
                    </div>
                    <a href="#top" className="text-sm font-semibold text-sky-700 transition hover:text-sky-600">
                      Back to top
                    </a>
                  </div>

                  <form method="get" action="/reports#sales-history" className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Search</span>
                      <input
                        type="text"
                        name="q"
                        defaultValue={query}
                        placeholder="Order number or customer"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-hidden ring-sky-500 transition focus:ring-2"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Status</span>
                      <select
                        name="status"
                        defaultValue={statusFilter}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-hidden ring-sky-500 transition focus:ring-2"
                      >
                        <option value="all">All</option>
                        <option value="delivered">Delivered</option>
                        <option value="in-transit">In Transit</option>
                        <option value="pending">Pending</option>
                        <option value="refunded">Refunded</option>
                        <option value="voided">Voided</option>
                      </select>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="inline-flex items-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(14,165,233,0.35)] transition hover:bg-sky-700"
                      >
                        Apply
                      </button>
                      <a
                        href="/reports#sales-history"
                        className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Reset
                      </a>
                    </div>
                  </form>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-1 text-left text-xs sm:text-sm">
                      <thead className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Order</th>
                          <th className="px-3 py-2">Customer</th>
                          <th className="px-3 py-2">Amount</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedSalesHistory.map((order) => {
                          const status = normalizeOrderStatus(order.order_status);
                          const orderLabel = order.order_number ?? order.id.slice(0, 8).toUpperCase();

                          return (
                            <tr key={order.id} className="rounded-xl bg-slate-50">
                              <td className="px-3 py-2.5 font-semibold text-slate-900">{orderLabel}</td>
                              <td className="px-3 py-2.5 text-slate-600">{order.customer_name ?? "Walk-in Customer"}</td>
                              <td className="px-3 py-2.5 font-semibold text-slate-900">{formatMoney(Number(order.total_amount ?? 0))}</td>
                              <td className="px-3 py-2.5">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${status === "Delivered" ? "bg-emerald-100 text-emerald-700" : status === "Refunded" ? "bg-sky-100 text-sky-700" : status === "Voided" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-700"}`}>
                                  {status}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right text-slate-600">
                                {(order.order_date ?? order.created_at) ? new Date(order.order_date ?? order.created_at ?? "").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}
                              </td>
                            </tr>
                          );
                        })}
                        {pagedSalesHistory.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                              No orders matched your current filters.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
                    <p>
                      Showing {totalFilteredRows === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + SALES_HISTORY_PAGE_SIZE, totalFilteredRows)} of {totalFilteredRows} record(s)
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={safeCurrentPage <= 1 ? "#sales-history" : `/reports?${prevPageQuery}#sales-history`}
                        className={`rounded-lg border px-3 py-1.5 font-semibold transition ${safeCurrentPage <= 1 ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                      >
                        Previous
                      </a>
                      <span className="font-semibold text-slate-700">Page {safeCurrentPage} of {totalPages}</span>
                      <a
                        href={safeCurrentPage >= totalPages ? "#sales-history" : `/reports?${nextPageQuery}#sales-history`}
                        className={`rounded-lg border px-3 py-1.5 font-semibold transition ${safeCurrentPage >= totalPages ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                      >
                        Next
                      </a>
                    </div>
                  </div>
                </section>

                {/* Stock health table */}
                <section className="rounded-2xl border border-slate-900/8 bg-slate-950 p-4 sm:p-5 shadow-[0_0_32px_rgba(15,23,42,0.2)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white sm:text-xl">Stock Health Report</h2>
                      <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                        Detailed snapshot of current inventory status per product.
                      </p>
                    </div>
                    <a
                      href="/api/reports/export"
                      className="hidden items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-800 sm:inline-flex"
                    >
                      <Download className="h-4 w-4" />
                      Export table
                    </a>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-1 text-left text-xs sm:text-sm">
                      <thead className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2 text-right">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productFeed.map((item, index) => (
                          <tr key={`${item.sku}-${index}`} className="rounded-xl bg-slate-900/80">
                            <td className="max-w-xs px-3 py-2.5 align-middle">
                                <p className="truncate text-sm font-semibold text-white">
                                {item.productName}
                              </p>
                            </td>
                            <td className="px-3 py-2.5 align-middle text-[13px] text-slate-300">
                              {item.sku}
                            </td>
                            <td className="px-3 py-2.5 align-middle">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${{
                                  "In Stock": "bg-emerald-500/10 text-emerald-300",
                                  Low: "bg-sky-500/10 text-sky-300",
                                  Critical: "bg-slate-500/10 text-slate-200",
                                }[item.status]}`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right align-middle text-sm font-semibold text-white">
                              {item.stockLevel.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          </ThemeProvider>
        </main>
      </div>
    </div>
  );
}
