import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type MetricKey = "revenue" | "orders" | "profit";

export type MonthlyPoint = {
  month: string;
  revenue: number;
  orders: number;
  profit: number;
};

export type Goal = {
  label: string;
  value: string;
  target: string;
  percent: number;
  tone: "blue" | "teal";
};

export type TrafficSource = {
  source: string;
  percent: number;
  colorClass: string;
};

export type OrderItem = {
  id: string;
  customer: string;
  amount: string;
  status: "Delivered" | "In Transit" | "Pending" | "Voided" | "Refunded";
  date: string;
};

export type ActivityItem = {
  actor: string;
  action: string;
  time: string;
};

export type OverviewCard = {
  title: string;
  value: string;
  trendText: string;
  iconKey: "Wallet" | "Users" | "ShoppingCart" | "Eye";
  iconClass: string;
  trendClass: string;
};

export type AdminPerformanceData = {
  monthlyPoints: MonthlyPoint[];
  monthlyGoals: Goal[];
  trafficSources: TrafficSource[];
  recentOrders: OrderItem[];
  recentActivity: ActivityItem[];
  overviewCards: OverviewCard[];
  totalVisits: string;
};

type ProductRow = {
  id: string;
  stock_level?: number | null;
  status?: string | null;
  storage_zone?: string | null;
  expiration?: string | null;
};

type OrderRow = {
  id: string;
  order_number?: string | null;
  customer_name?: string | null;
  total_amount?: number | null;
  order_status?: string | null;
  order_date?: string | null;
  created_at?: string | null;
};

type ProfileCount = { count: number | null };

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const trafficColors = ["bg-blue-500", "bg-teal-500", "bg-sky-500", "bg-cyan-500", "bg-indigo-500"];
const ORDER_TABLE_CANDIDATES = ["orders", "orders table"] as const;

const emptyPerformanceData: AdminPerformanceData = {
  monthlyPoints: monthLabels.map((month) => ({ month, revenue: 0, orders: 0, profit: 0 })),
  monthlyGoals: [
    { label: "Monthly Revenue", value: "₱0", target: "₱1,000", percent: 0, tone: "blue" },
    { label: "Delivered Orders", value: "0", target: "20", percent: 0, tone: "teal" },
    { label: "Critical Stock", value: "0", target: "0", percent: 100, tone: "blue" },
  ],
  trafficSources: [{ source: "No Zone Data", percent: 100, colorClass: "bg-slate-400" }],
  recentOrders: [],
  recentActivity: [{ actor: "System", action: "is waiting for inventory and order activity.", time: "Live" }],
  overviewCards: [
    {
      title: "Total Revenue",
      value: "₱0.00",
      trendText: "Add orders to see trends",
      iconKey: "Wallet",
      iconClass: "bg-blue-100 text-blue-700",
      trendClass: "text-slate-600",
    },
    {
      title: "Active Users",
      value: "0",
      trendText: "User profiles will appear here",
      iconKey: "Users",
      iconClass: "bg-teal-100 text-teal-700",
      trendClass: "text-slate-600",
    },
    {
      title: "Total Orders",
      value: "0",
      trendText: "Create orders to populate this",
      iconKey: "ShoppingCart",
      iconClass: "bg-sky-100 text-sky-700",
      trendClass: "text-slate-600",
    },
    {
      title: "Critical Items",
      value: "0",
      trendText: "No critical items detected",
      iconKey: "Eye",
      iconClass: "bg-amber-100 text-amber-700",
      trendClass: "text-emerald-600",
    },
  ],
  totalVisits: "0",
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function relativeTimeFrom(date?: string | null): string {
  const parsed = safeDate(date);
  if (!parsed) return "Recently";

  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function normalizeOrderStatus(status?: string | null): "Delivered" | "In Transit" | "Pending" | "Voided" | "Refunded" {
  const value = (status ?? "").toLowerCase();

  if (value.includes("void") || value.includes("cancel")) {
    return "Voided";
  }

  if (value.includes("refund")) {
    return "Refunded";
  }

  if (value.includes("deliver") || value.includes("complete")) {
    return "Delivered";
  }

  if (value.includes("transit") || value.includes("ship")) {
    return "In Transit";
  }

  return "Pending";
}

function getLast12MonthLabels(): string[] {
  const now = new Date();
  const labels: string[] = [];

  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(monthLabels[d.getMonth()]);
  }

  return labels;
}

function isMissingOrdersTableError(error: unknown): boolean {
  const message =
    error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message.toLowerCase()
      : String(error ?? "").toLowerCase();

  return (
    message.includes("could not find the table") ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

async function loadOrdersWithFallback(supabase: ReturnType<typeof createSupabaseServerClient>) {
  let lastError: { message: string } | null = null;

  for (const table of ORDER_TABLE_CANDIDATES) {
    const { data, error } = await supabase
      .from(table)
      .select("id, order_number, customer_name, total_amount, order_status, order_date, created_at")
      .order("order_date", { ascending: false })
      .limit(100);

    if (!error) {
      return { data: (data ?? []) as OrderRow[], error: null };
    }

    lastError = { message: error.message };
    if (!isMissingOrdersTableError(error)) {
      return { data: [] as OrderRow[], error: lastError };
    }
  }

  return { data: [] as OrderRow[], error: lastError };
}

export async function getAdminPerformanceData(): Promise<AdminPerformanceData> {
  if (!isSupabaseConfigured()) {
    return emptyPerformanceData;
  }

  const supabase = createSupabaseServerClient();

  try {
    const ordersPromise = loadOrdersWithFallback(supabase);

    const [{ data: products, error: productsError }, { data: orders, error: ordersError }, { count: profileCount, error: profileError }] = await Promise.all([
      supabase
        .from("products")
        .select("id, stock_level, status, storage_zone, expiration"),
      ordersPromise,
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true }),
    ]);

    const hasFetchWarnings = Boolean(productsError || ordersError || profileError);

    const productRows = (products ?? []) as ProductRow[];
    const orderRows = (orders ?? []) as OrderRow[];

    const monthlyOrderMap = new Map<string, { revenue: number; orders: number }>();
    const monthSequence = getLast12MonthLabels();

    for (const row of orderRows) {
      const orderDate = safeDate(row.order_date ?? row.created_at);
      if (!orderDate) continue;
      const key = monthLabels[orderDate.getMonth()];
      const current = monthlyOrderMap.get(key) ?? { revenue: 0, orders: 0 };
      current.revenue += Number(row.total_amount ?? 0);
      current.orders += 1;
      monthlyOrderMap.set(key, current);
    }

    const monthlyPoints: MonthlyPoint[] = monthSequence.map((month) => {
      const monthData = monthlyOrderMap.get(month) ?? { revenue: 0, orders: 0 };
      return {
        month,
        revenue: Math.round(monthData.revenue),
        orders: monthData.orders,
        profit: Math.round(monthData.revenue * 0.3),
      };
    });

    const totalRevenue = orderRows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
    const totalOrders = orderRows.length;
    const deliveredOrders = orderRows.filter((row) => normalizeOrderStatus(row.order_status) === "Delivered").length;

    const criticalItems = productRows.filter((row) => {
      const status = (row.status ?? "").toLowerCase();
      return status.includes("critical") || Number(row.stock_level ?? 0) <= 0;
    }).length;

    const totalUnits = productRows.reduce((sum, row) => sum + Number(row.stock_level ?? 0), 0);

    const zoneTotals = new Map<string, number>();
    for (const row of productRows) {
      const zone = (row.storage_zone ?? "Unassigned").trim() || "Unassigned";
      const qty = Number(row.stock_level ?? 0);
      zoneTotals.set(zone, (zoneTotals.get(zone) ?? 0) + qty);
    }

    const trafficSources: TrafficSource[] = Array.from(zoneTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, units], index) => ({
        source: source.toUpperCase(),
        percent: totalUnits > 0 ? Math.max(1, Math.round((units / totalUnits) * 100)) : 0,
        colorClass: trafficColors[index] ?? "bg-slate-400",
      }));

    const recentOrders: OrderItem[] = orderRows.slice(0, 6).map((row) => {
      const orderNumber = row.order_number?.trim();
      const orderId = orderNumber?.length ? orderNumber : row.id.slice(0, 8).toUpperCase();

      return {
        id: orderNumber?.startsWith("#") ? orderNumber : `#${orderId}`,
        customer: row.customer_name?.trim() || "Walk-in Customer",
        amount: new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(Number(row.total_amount ?? 0)),
        status: normalizeOrderStatus(row.order_status),
        date: safeDate(row.order_date ?? row.created_at)?.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }) ?? "-",
      };
    });

    const expiringSoon = productRows
      .map((row) => ({ row, date: safeDate(row.expiration) }))
      .filter((entry): entry is { row: ProductRow; date: Date } => entry.date !== null)
      .filter((entry) => {
        const days = Math.ceil((entry.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 14;
      })
      .slice(0, 2);

    const recentActivity: ActivityItem[] = [
      ...(hasFetchWarnings
        ? [{ actor: "System", action: "Some analytics sources are temporarily unavailable.", time: "Live" }]
        : []),
      ...recentOrders.slice(0, 2).map((order) => ({
        actor: order.customer,
        action: `placed order ${order.id} (${order.status.toLowerCase()}).`,
        time: relativeTimeFrom(orderRows.find((row) => row.customer_name === order.customer)?.order_date),
      })),
      {
        actor: "System",
        action: `${criticalItems} products currently flagged as critical stock.`,
        time: "Live",
      },
      ...expiringSoon.map((entry) => ({
        actor: "System",
        action: `${entry.row.id.slice(0, 6).toUpperCase()} is expiring soon in zone ${(entry.row.storage_zone ?? "N/A").toUpperCase()}.`,
        time: "Live",
      })),
    ].slice(0, 4);

    const lastMonthRevenue = monthlyPoints[monthlyPoints.length - 2]?.revenue ?? 0;
    const currentRevenue = monthlyPoints[monthlyPoints.length - 1]?.revenue ?? 0;
    const revenueTrend =
      lastMonthRevenue > 0
        ? `${(((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)}% vs last month`
        : "Tracking current month";

    const monthlyRevenueTarget = Math.max(currentRevenue * 1.15, 1000);
    const deliveredTarget = Math.max(Math.ceil(totalOrders * 1.1), 10);
    const criticalTarget = Math.max(criticalItems - 3, 0);

    const monthlyGoals: Goal[] = [
      {
        label: "Monthly Revenue",
        value: formatMoney(currentRevenue),
        target: formatMoney(monthlyRevenueTarget),
        percent: Math.min(100, Math.round((currentRevenue / Math.max(monthlyRevenueTarget, 1)) * 100)),
        tone: "blue",
      },
      {
        label: "Delivered Orders",
        value: `${deliveredOrders}`,
        target: `${deliveredTarget}`,
        percent: Math.min(100, Math.round((deliveredOrders / Math.max(deliveredTarget, 1)) * 100)),
        tone: "teal",
      },
      {
        label: "Critical Stock Reduction",
        value: `${criticalItems}`,
        target: `${criticalTarget}`,
        percent: criticalItems === 0 ? 100 : Math.max(0, Math.round((criticalTarget / criticalItems) * 100)),
        tone: "blue",
      },
    ];

    const overviewCards: OverviewCard[] = [
      {
        title: "Total Revenue",
        value: formatMoney(totalRevenue),
        trendText: revenueTrend,
        iconKey: "Wallet",
        iconClass: "bg-blue-100 text-blue-700",
        trendClass: currentRevenue >= lastMonthRevenue ? "text-emerald-600" : "text-rose-600",
      },
      {
        title: "Active Users",
        value: `${profileCount ?? 0}`,
        trendText: "Synced from user profiles",
        iconKey: "Users",
        iconClass: "bg-teal-100 text-teal-700",
        trendClass: "text-emerald-600",
      },
      {
        title: "Total Orders",
        value: `${totalOrders}`,
        trendText: `${deliveredOrders} delivered so far`,
        iconKey: "ShoppingCart",
        iconClass: "bg-sky-100 text-sky-700",
        trendClass: "text-sky-700",
      },
      {
        title: "Critical Items",
        value: `${criticalItems}`,
        trendText: criticalItems > 0 ? "Needs urgent replenishment" : "Inventory is stable",
        iconKey: "Eye",
        iconClass: "bg-amber-100 text-amber-700",
        trendClass: criticalItems > 0 ? "text-rose-600" : "text-emerald-600",
      },
    ];

    return {
      monthlyPoints,
      monthlyGoals,
      trafficSources: trafficSources.length > 0 ? trafficSources : [{ source: "NO ZONE DATA", percent: 100, colorClass: "bg-slate-400" }],
      recentOrders,
      recentActivity:
        recentActivity.length > 0
          ? recentActivity
          : [{ actor: "System", action: "No recent activity yet.", time: "Live" }],
      overviewCards,
      totalVisits: new Intl.NumberFormat("en-US").format(totalUnits),
    };
  } catch {
    return emptyPerformanceData;
  }
}
