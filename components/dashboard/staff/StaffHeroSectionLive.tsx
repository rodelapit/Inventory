"use client";

import { useEffect, useState } from "react";
import { StaffHeroSection } from "./StaffHeroSection";
import type { StatCard, ZoneCard, ActiveAlert, ProductFeedItem } from "@/data/dashboard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type StaffHeroSectionLiveProps = {
  systemStatusTitle: string;
  systemStatusMessage: string;
  statCards: StatCard[];
  initialZoneCards: ZoneCard[];
  activeAlerts: ActiveAlert[];
  initialProductFeed: ProductFeedItem[];
};

type ProductRealtimeRow = {
  sku: string;
  product_name: string;
  stock_level?: number | null;
  expiration?: string | null;
  storage_zone?: string | null;
};

type ZoneRealtimeRow = {
  id: string;
  label?: string | null;
  name?: string | null;
  current?: number | null;
  capacity?: number | null;
};

type OrderRealtimeRow = {
  order_status?: string | null;
  order_date?: string | null;
  created_at?: string | null;
};

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
      const expirationDate = new Date(item.expiration);
      if (Number.isNaN(expirationDate.getTime())) return null;
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

function buildZoneCards(products: ProductRealtimeRow[], zones: ZoneRealtimeRow[]): ZoneCard[] {
  const zoneTotals = new Map<string, number>();

  for (const p of products) {
    const key = String(p.storage_zone ?? "").trim().toUpperCase() || "UNASSIGNED";
    zoneTotals.set(key, (zoneTotals.get(key) ?? 0) + Number(p.stock_level ?? 0));
  }

  const mappedZones = zones.map((zone) => {
    const id = String(zone.id ?? "").trim().toUpperCase();
    const label = String(zone.label ?? `ZONE ${id}`).trim() || `ZONE ${id}`;
    const name = String(zone.name ?? `Storage Zone ${id}`).trim() || `Storage Zone ${id}`;
    const units = zoneTotals.get(id) ?? Number(zone.current ?? 0);
    const capacity = Math.max(1, Number(zone.capacity ?? 1));
    const utilization = Math.round((units / capacity) * 100);

    return {
      zone: label,
      name,
      units,
      trend: `${utilization}% utilization`,
      trendUp: utilization < 90,
    };
  });

  const unassignedUnits = zoneTotals.get("UNASSIGNED") ?? 0;
  if (unassignedUnits > 0) {
    mappedZones.push({
      zone: "UNASSIGNED",
      name: "Unassigned Products",
      units: unassignedUnits,
      trend: "Needs zone assignment",
      trendUp: false,
    });
  }

  return mappedZones;
}

function normalizeStatus(value?: string | null): "Delivered" | "Pending" | "Voided" | "Refunded" {
  const status = String(value ?? "").toLowerCase();
  if (status.includes("void") || status.includes("cancel")) return "Voided";
  if (status.includes("refund")) return "Refunded";
  if (status.includes("deliver") || status.includes("complete")) return "Delivered";
  return "Pending";
}

function buildOperationalAlerts(
  productFeed: ProductFeedItem[],
  zoneCards: ZoneCard[],
  recentOrders: OrderRealtimeRow[],
): ActiveAlert[] {
  const alerts = buildActiveAlerts(productFeed);

  const overloadedZone = zoneCards
    .map((zone) => {
      const value = Number(zone.trend.replace(/[^0-9]/g, "") || "0");
      return { zone, value };
    })
    .filter((entry) => entry.value >= 90)
    .sort((a, b) => b.value - a.value)[0];

  if (overloadedZone) {
    alerts.push({
      title: "Zone overflow risk",
      message: `${overloadedZone.zone.zone} is at ${overloadedZone.value}% utilization.`,
      age: "Live update",
      type: overloadedZone.value >= 100 ? "error" : "warning",
    });
  }

  const window24h = Date.now() - 24 * 60 * 60 * 1000;
  const recent = recentOrders.filter((order) => {
    const date = new Date(order.order_date ?? order.created_at ?? "");
    return !Number.isNaN(date.getTime()) && date.getTime() >= window24h;
  });

  const reversals = recent.filter((order) => {
    const status = normalizeStatus(order.order_status);
    return status === "Refunded" || status === "Voided";
  }).length;

  if (recent.length > 0) {
    const ratio = reversals / recent.length;
    if (ratio >= 0.2 && reversals >= 2) {
      alerts.push({
        title: "Refund spike",
        message: `${reversals} reversal transactions in the last 24h (${Math.round(ratio * 100)}%).`,
        age: "Live update",
        type: ratio >= 0.35 ? "error" : "warning",
      });
    }
  }

  return alerts.slice(0, 5);
}

export function StaffHeroSectionLive({
  systemStatusTitle,
  systemStatusMessage,
  statCards,
  initialZoneCards,
  activeAlerts: initialAlerts,
  initialProductFeed,
}: StaffHeroSectionLiveProps) {
  const [productFeed, setProductFeed] = useState<ProductFeedItem[]>(initialProductFeed);
  const [productRows, setProductRows] = useState<ProductRealtimeRow[]>([]);
  const [zoneCards, setZoneCards] = useState<ZoneCard[]>(initialZoneCards);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>(initialAlerts);
  const [recentOrders, setRecentOrders] = useState<OrderRealtimeRow[]>([]);

  useEffect(() => {
    setActiveAlerts(buildOperationalAlerts(productFeed, zoneCards, recentOrders));
  }, [productFeed, zoneCards, recentOrders]);

  useEffect(() => {
    try {
      const supabase = createSupabaseBrowserClient();

      const refreshData = async () => {
        const [{ data: productsData }, { data: zonesData }, { data: ordersData }] = await Promise.all([
          supabase.from("products").select("sku, product_name, stock_level, expiration, storage_zone"),
          supabase.from("zones").select("id, label, name, current, capacity").order("id", { ascending: true }),
          supabase
            .from("orders")
            .select("order_status, order_date, created_at")
            .order("order_date", { ascending: false })
            .limit(100),
        ]);

        const products = (productsData ?? []) as ProductRealtimeRow[];
        const zones = (zonesData ?? []) as ZoneRealtimeRow[];
        const orders = (ordersData ?? []) as OrderRealtimeRow[];

        setProductRows(products);
        setRecentOrders(orders);
        setZoneCards(buildZoneCards(products, zones));

        setProductFeed(
          products.map((product) => ({
            sku: product.sku,
            productName: product.product_name,
            stockLevel: Number(product.stock_level ?? 0),
            expiration: product.expiration ? new Date(product.expiration).toLocaleDateString() : "",
            status:
              Number(product.stock_level ?? 0) <= 0
                ? "Critical"
                : Number(product.stock_level ?? 0) <= 10
                ? "Low"
                : "In Stock",
          })),
        );
      };

      void refreshData();

      const channel = supabase
        .channel("staff-hero-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "products",
          },
          () => void refreshData(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "zones" },
          () => void refreshData(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          () => void refreshData(),
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    } catch (error) {
      console.error("Failed to set up realtime subscription:", error);
    }
  }, []);

  return (
    <StaffHeroSection
      systemStatusTitle={systemStatusTitle}
      systemStatusMessage={systemStatusMessage}
      statCards={statCards}
      zoneCards={zoneCards}
      activeAlerts={activeAlerts}
    />
  );
}
