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

export type OrderLineItem = {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderItem = {
  id: string;
  sourceOrderId: string;
  orderNumber: string;
  customer: string;
  customerName: string;
  amount: string;
  totalAmountValue: number;
  status: "Delivered" | "In Transit" | "Pending" | "Voided" | "Refunded";
  date: string;
  orderDateIso: string | null;
  paymentMethod: string;
  paymentAmount: number;
  itemCount: number;
  lineItems: OrderLineItem[];
  href: string;
};

export type AlertCenterItem = {
  id: string;
  title: string;
  message: string;
  severity: "critical" | "warning" | "info";
  category: "stock" | "expiry" | "returns" | "zone";
  metric: string;
  href: string;
};

export type ActivityItem = {
  actor: string;
  action: string;
  time: string;
  href?: string;
  orderId?: string;
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
  alertsCenter: AlertCenterItem[];
  recentOrders: OrderItem[];
  recentActivity: ActivityItem[];
  overviewCards: OverviewCard[];
  totalVisits: string;
};

type ProductRow = {
  id: string;
  sku?: string | null;
  product_name?: string | null;
  stock_level?: number | null;
  status?: string | null;
  storage_zone?: string | null;
  expiration?: string | null;
};

type ZoneRow = {
  id: string;
  label?: string | null;
  name?: string | null;
  capacity?: number | null;
  current?: number | null;
};

type OrderItemRow = {
  order_id?: string | null;
  product_id?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
};

type PaymentRow = {
  order_id?: string | null;
  method?: string | null;
  amount?: number | null;
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

// Provide a complete fallback dashboard payload when Supabase is offline or unconfigured.
const emptyPerformanceData: AdminPerformanceData = {
  monthlyPoints: monthLabels.map((month) => ({ month, revenue: 0, orders: 0, profit: 0 })),
  monthlyGoals: [
    { label: "Monthly Revenue", value: "₱0", target: "₱1,000", percent: 0, tone: "blue" },
    { label: "Delivered Orders", value: "0", target: "20", percent: 0, tone: "teal" },
    { label: "Critical Stock", value: "0", target: "0", percent: 100, tone: "blue" },
  ],
  trafficSources: [{ source: "No Zone Data", percent: 100, colorClass: "bg-slate-400" }],
  alertsCenter: [
    {
      id: "info-none",
      title: "No critical alerts",
      message: "Inventory and order signals are currently within safe thresholds.",
      severity: "info",
      category: "stock",
      metric: "0 active",
      href: "/reports",
    },
  ],
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

// Format money consistently across dashboard charts and summary cards.
function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

// Parse dates defensively because dashboard rows can be partially populated.
function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Convert timestamps into short relative labels for the activity feed.
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

// Reduce raw order statuses to the smaller set the dashboard understands.
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

// Build the rolling 12-month labels used by the analytics chart.
function getLast12MonthLabels(): string[] {
  const now = new Date();
  const labels: string[] = [];

  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(monthLabels[d.getMonth()]);
  }

  return labels;
}

// Derive alert cards from inventory, order, and zone data so operators see the urgent issues first.
function buildAlertsCenter(
  products: ProductRow[],
  orders: OrderRow[],
  zones: ZoneRow[],
): AlertCenterItem[] {
  const alerts: AlertCenterItem[] = [];

  const criticalCount = products.filter((row) => {
    const status = String(row.status ?? "").toLowerCase();
    return status.includes("critical") || Number(row.stock_level ?? 0) <= 0;
  }).length;

  const lowCount = products.filter((row) => {
    const stockLevel = Number(row.stock_level ?? 0);
    const status = String(row.status ?? "").toLowerCase();
    return !status.includes("critical") && (status.includes("low") || (stockLevel > 0 && stockLevel <= 10));
  }).length;

  if (criticalCount > 0) {
    alerts.push({
      id: "stock-critical",
      title: "Critical stock threshold reached",
      message: `${criticalCount} SKU(s) are at critical level and need replenishment now.`,
      severity: "critical",
      category: "stock",
      metric: `${criticalCount} critical`,
      href: "/inventory",
    });
  } else if (lowCount > 0) {
    alerts.push({
      id: "stock-low",
      title: "Low stock watchlist",
      message: `${lowCount} SKU(s) are low and should be scheduled for restock.`,
      severity: "warning",
      category: "stock",
      metric: `${lowCount} low`,
      href: "/inventory",
    });
  }

  const expiringIn7Days = products.filter((row) => {
    const expirationDate = safeDate(row.expiration);
    if (!expirationDate) return false;
    const days = Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 7;
  }).length;

  if (expiringIn7Days > 0) {
    alerts.push({
      id: "expiry-window",
      title: "Expiry window approaching",
      message: `${expiringIn7Days} SKU(s) expire within 7 days. Rotate stock and run markdowns if needed.`,
      severity: expiringIn7Days >= 5 ? "critical" : "warning",
      category: "expiry",
      metric: `${expiringIn7Days} expiring`,
      href: "/reports#expiry-risk",
    });
  }

  const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
  const recentOrders = orders.filter((order) => {
    const orderDate = safeDate(order.order_date ?? order.created_at);
    return orderDate ? orderDate.getTime() >= last24Hours : false;
  });

  const reversalCount = recentOrders.filter((order) => {
    const status = normalizeOrderStatus(order.order_status);
    return status === "Refunded" || status === "Voided";
  }).length;

  if (recentOrders.length > 0 && reversalCount > 0) {
    const ratio = reversalCount / recentOrders.length;
    if (reversalCount >= 3 || ratio >= 0.2) {
      alerts.push({
        id: "refund-spike",
        title: "Refund/void spike detected",
        message: `${reversalCount} reversal(s) in the last 24h across ${recentOrders.length} order(s).`,
        severity: ratio >= 0.35 ? "critical" : "warning",
        category: "returns",
        metric: `${Math.round(ratio * 100)}% reversal rate`,
        href: "/reports#sales-history",
      });
    }
  }

  const overflowingZones = zones
    .map((zone) => {
      const capacity = Number(zone.capacity ?? 0);
      const current = Number(zone.current ?? 0);
      if (capacity <= 0) return null;
      return {
        label: String(zone.label ?? zone.id ?? "ZONE").toUpperCase(),
        ratio: current / capacity,
      };
    })
    .filter((zone): zone is { label: string; ratio: number } => zone !== null)
    .filter((zone) => zone.ratio >= 0.9)
    .sort((a, b) => b.ratio - a.ratio);

  if (overflowingZones.length > 0) {
    const topZone = overflowingZones[0];
    alerts.push({
      id: "zone-overflow",
      title: "Zone capacity pressure",
      message: `${topZone.label} is at ${Math.round(topZone.ratio * 100)}% capacity. Rebalance stock allocation.`,
      severity: topZone.ratio >= 1 ? "critical" : "warning",
      category: "zone",
      metric: `${overflowingZones.length} zone(s) >= 90%`,
      href: "/inventory",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "info-none",
      title: "No critical alerts",
      message: "Inventory and order signals are currently within safe thresholds.",
      severity: "info",
      category: "stock",
      metric: "0 active",
      href: "/reports",
    });
  }

  return alerts;
}

export async function getAdminPerformanceData(): Promise<AdminPerformanceData> {
  // Return the fallback payload when the database is not available.
  if (!isSupabaseConfigured()) {
    return emptyPerformanceData;
  }

  const supabase = createSupabaseServerClient();

  try {
    const [
      { data: products, error: productsError },
      { data: orders, error: ordersError },
      { count: profileCount, error: profileError },
      { data: zones, error: zonesError },
      { data: orderItems, error: orderItemsError },
      { data: payments, error: paymentsError },
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id, sku, product_name, stock_level, status, storage_zone, expiration"),
      supabase
        .from("orders")
        .select("id, order_number, customer_name, total_amount, order_status, order_date, created_at")
        .order("order_date", { ascending: false })
        .limit(100),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("zones")
        .select("id, label, name, capacity, current"),
      supabase
        .from("order_items")
        .select("order_id, product_id, quantity, unit_price")
        .limit(1200),
      supabase
        .from("payments")
        .select("order_id, method, amount")
        .limit(1200),
    ]);

    // Track partial failures so the dashboard can still render with degraded data.
    const hasFetchWarnings = Boolean(
      productsError || ordersError || profileError || zonesError || orderItemsError || paymentsError,
    );

    const productRows = (products ?? []) as ProductRow[];
    const orderRows = (orders ?? []) as OrderRow[];
    const zoneRows = (zones ?? []) as ZoneRow[];
    const orderItemRows = (orderItems ?? []) as OrderItemRow[];
    const paymentRows = (payments ?? []) as PaymentRow[];
    const productById = new Map(productRows.map((product) => [product.id, product]));

    // Aggregate order totals into month buckets for the revenue chart.
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

    // Turn storage-zone totals into the traffic-source breakdown used by the donut chart.
    const trafficSources: TrafficSource[] = Array.from(zoneTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, units], index) => ({
        source: source.toUpperCase(),
        percent: totalUnits > 0 ? Math.max(1, Math.round((units / totalUnits) * 100)) : 0,
        colorClass: trafficColors[index] ?? "bg-slate-400",
      }));

    const orderItemsByOrderId = new Map<string, OrderLineItem[]>();
    for (const item of orderItemRows) {
      const orderId = String(item.order_id ?? "").trim();
      if (!orderId) continue;

      const product = item.product_id ? productById.get(item.product_id) : undefined;
      const quantity = Math.max(0, Number(item.quantity ?? 0));
      const unitPrice = Number(item.unit_price ?? 0);
      const lineItem: OrderLineItem = {
        sku: String(product?.sku ?? "UNKNOWN"),
        name: String(product?.product_name ?? "Unknown item"),
        quantity,
        unitPrice,
        lineTotal: Number((quantity * unitPrice).toFixed(2)),
      };

      const existing = orderItemsByOrderId.get(orderId) ?? [];
      existing.push(lineItem);
      orderItemsByOrderId.set(orderId, existing);
    }

    const paymentByOrderId = new Map<string, { method: string; amount: number }>();
    for (const payment of paymentRows) {
      const orderId = String(payment.order_id ?? "").trim();
      if (!orderId) continue;
      if (paymentByOrderId.has(orderId)) continue;

      paymentByOrderId.set(orderId, {
        method: String(payment.method ?? "other").toUpperCase(),
        amount: Number(payment.amount ?? 0),
      });
    }

    // Build the recent-orders list with display labels, payment metadata, and receipt links.
    const recentOrders: OrderItem[] = orderRows.slice(0, 6).map((row) => {
      const orderNumber = row.order_number?.trim() || row.id.slice(0, 8).toUpperCase();
      const displayId = orderNumber.startsWith("#") ? orderNumber : `#${orderNumber}`;
      const totalAmountValue = Number(row.total_amount ?? 0);
      const lineItems = orderItemsByOrderId.get(row.id) ?? [];
      const payment = paymentByOrderId.get(row.id);

      return {
        id: displayId,
        sourceOrderId: row.id,
        orderNumber,
        customer: row.customer_name?.trim() || "Walk-in Customer",
        customerName: row.customer_name?.trim() || "Walk-in Customer",
        amount: new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(totalAmountValue),
        totalAmountValue,
        status: normalizeOrderStatus(row.order_status),
        date: safeDate(row.order_date ?? row.created_at)?.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }) ?? "-",
        orderDateIso: row.order_date ?? row.created_at ?? null,
        paymentMethod: payment?.method ?? "OTHER",
        paymentAmount: payment?.amount ?? totalAmountValue,
        itemCount: lineItems.reduce((sum, line) => sum + line.quantity, 0),
        lineItems,
        href: "/reports#sales-history",
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
        href: "/reports#sales-history",
        orderId: order.id,
      })),
      {
        actor: "System",
        action: `${criticalItems} products currently flagged as critical stock.`,
        time: "Live",
        href: "/inventory",
      },
      ...expiringSoon.map((entry) => ({
        actor: "System",
        action: `${entry.row.id.slice(0, 6).toUpperCase()} is expiring soon in zone ${(entry.row.storage_zone ?? "N/A").toUpperCase()}.`,
        time: "Live",
        href: "/reports#expiry-risk",
      })),
    ].slice(0, 4);

    const alertsCenter = buildAlertsCenter(productRows, orderRows, zoneRows);

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
      alertsCenter,
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
