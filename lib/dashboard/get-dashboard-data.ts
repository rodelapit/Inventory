import type { ActiveAlert, DashboardData, ProductFeedItem, StatCard, ZoneCard } from "@/data/dashboard";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type DashboardProductRow = {
  id: string;
  sku: string;
  product_name: string;
  stock_level?: number | null;
  expiration?: string | null;
  status?: string | null;
  storage_zone?: string | null;
};

function buildStatCards(totalProducts: number, lowStockItems: number): StatCard[] {
  return [
    {
      title: "Total Products",
      value: totalProducts,
      change: "Live",
      changeType: "neutral",
      iconName: "Package",
    },
    {
      title: "Low Stock Items",
      value: lowStockItems,
      change: "Live",
      changeType: "neutral",
      iconName: "AlertTriangle",
    },
    {
      title: "Monthly Sales",
      value: "$0",
      change: "Live",
      changeType: "neutral",
      iconName: "TrendingUp",
    },
    {
      title: "Active Users",
      value: 0,
      change: "Live",
      changeType: "neutral",
      iconName: "Users",
    },
  ];
}

const emptyDashboardData: DashboardData = {
  systemStatusTitle: "Live Sync Active",
  systemStatusMessage: "Connected to Supabase realtime feed.",
  statCards: buildStatCards(0, 0),
  zoneCards: [],
  activeAlerts: [
    {
      title: "No urgent alerts",
      message: "Stock and expiration checks are currently within safe thresholds.",
      age: "Live update",
      type: "info",
    },
  ],
  productFeed: [],
};

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysUntil(date: Date): number {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = startOfTarget.getTime() - startOfToday.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function buildActiveAlerts(productFeed: ProductFeedItem[]): ActiveAlert[] {
  const alerts: ActiveAlert[] = [];

  const criticalItem = productFeed.find((item) => item.status === "Critical");
  const lowStockItem = productFeed.find((item) => item.status === "Low");
  const stockAlertSource = criticalItem ?? lowStockItem;

  if (stockAlertSource) {
    const isCritical = stockAlertSource.status === "Critical";
    alerts.push({
      title: isCritical ? "Critical stock alert" : "Low stock alert",
      message: `${stockAlertSource.productName} stock is ${isCritical ? "critical" : "low"}`,
      age: "Live update",
      type: isCritical ? "error" : "warning",
    });
  }

  const expiringSoon = productFeed
    .map((item) => {
      const expirationDate = parseDate(item.expiration);
      if (!expirationDate) return null;
      const days = daysUntil(expirationDate);
      return { item, days };
    })
    .filter((entry): entry is { item: ProductFeedItem; days: number } => {
      return entry !== null && entry.days >= 0 && entry.days <= 14;
    })
    .sort((a, b) => a.days - b.days)[0];

  if (expiringSoon) {
    const { item, days } = expiringSoon;
    const dayLabel = days === 1 ? "day" : "days";
    alerts.push({
      title: "Expiring soon",
      message: `${item.productName} expires in ${days} ${dayLabel}`,
      age: "Live update",
      type: days <= 3 ? "error" : "warning",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      title: "No urgent alerts",
      message: "Stock and expiration checks are currently within safe thresholds.",
      age: "Live update",
      type: "info",
    });
  }

  return alerts;
}

function buildZoneCards(
  products: Array<{ storage_zone?: string | null; stock_level?: number | null }>,
): ZoneCard[] {
  const zoneMeta: Record<string, { zone: string; name: string }> = {
    A: { zone: "ZONE A", name: "Ambient Storage" },
    B: { zone: "ZONE B", name: "Cold Storage" },
    Q: { zone: "ZONE Q", name: "Quarantined Stock" },
    C: { zone: "ZONE C", name: "Frozen Storage" },
    D: { zone: "ZONE D", name: "Dry Storage" },
    E: { zone: "ZONE E", name: "Receiving Area" },
  };

  const zoneTotals = new Map<string, number>();
  for (const p of products) {
    const zoneKey = (p.storage_zone ?? "").toString().trim().toUpperCase();
    if (!zoneKey) continue;
    const qty = Number.isNaN(Number(p.stock_level)) ? 0 : Number(p.stock_level ?? 0);
    zoneTotals.set(zoneKey, (zoneTotals.get(zoneKey) ?? 0) + qty);
  }

  if (zoneTotals.size === 0) {
    return [];
  }

  const totalUnits = Array.from(zoneTotals.values()).reduce((sum, units) => sum + units, 0);

  return Array.from(zoneTotals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, units]) => {
      const meta = zoneMeta[key] ?? { zone: `ZONE ${key}`, name: `Storage Zone ${key}` };
      const share = totalUnits > 0 ? (units / totalUnits) * 100 : 0;
      return {
        zone: meta.zone,
        name: meta.name,
        units,
        trend: `+${share.toFixed(1)}%`,
        trendUp: true,
      };
    });
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!isSupabaseConfigured()) {
    return emptyDashboardData;
  }

  const supabase = createSupabaseServerClient();

  try {
    const { data: products, error } = await supabase
      .from("products")
      .select("id, sku, product_name, stock_level, expiration, status, storage_zone")
      .order("product_name", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Supabase error fetching products:", error);
      return emptyDashboardData;
    }

    const productRows: DashboardProductRow[] = (products ?? []) as DashboardProductRow[];

    const productFeed: ProductFeedItem[] = productRows.map((p) => {
      const rawStatus = (p.status ?? "").toString().trim();
      const status: ProductFeedItem["status"] =
        rawStatus === "Low" || rawStatus === "Critical" || rawStatus === "In Stock"
          ? (rawStatus as ProductFeedItem["status"])
          : "In Stock";

      return {
        sku: p.sku,
        productName: p.product_name,
        stockLevel: p.stock_level ?? 0,
        expiration: p.expiration ? new Date(p.expiration).toLocaleDateString() : "",
        status,
      };
    });

    // Calculate stats from products
    const totalProducts = productFeed.length;
    const lowStockItems = productFeed.filter((p) => p.status === "Low" || p.status === "Critical").length;

    return {
      ...emptyDashboardData,
      productFeed,
      zoneCards: buildZoneCards(productRows),
      activeAlerts: buildActiveAlerts(productFeed),
      statCards: buildStatCards(totalProducts, lowStockItems),
    };
  } catch (err) {
    console.error("Unexpected error in getDashboardData:", err);
    return emptyDashboardData;
  }
}
