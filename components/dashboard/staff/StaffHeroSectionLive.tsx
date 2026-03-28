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

function buildZoneCards(
  products: ProductFeedItem[],
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
  
  // This is a simplified calculation - in reality we'd need the storage_zone from products table
  // For now, we'll just distribute based on stock level
  for (const p of products) {
    // We can't determine zone from productFeed, so this is a limitation
    // A better approach would be to fetch full product data with zones
  }

  // Return initial zone cards if we can't recalculate
  return [];
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
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>(initialAlerts);

  useEffect(() => {
    setActiveAlerts(buildActiveAlerts(productFeed));
  }, [productFeed]);

  useEffect(() => {
    try {
      const supabase = createSupabaseBrowserClient();

      // Subscribe to changes on the products table
      const subscription = supabase
        .channel("products-changes-hero")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "products",
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newProduct = payload.new as {
                sku: string;
                product_name: string;
                stock_level?: number | null;
                expiration?: string | null;
              };

              const newFeedItem: ProductFeedItem = {
                sku: newProduct.sku,
                productName: newProduct.product_name,
                stockLevel: newProduct.stock_level ?? 0,
                expiration: newProduct.expiration
                  ? new Date(newProduct.expiration).toLocaleDateString()
                  : "",
                status:
                  (newProduct.stock_level ?? 0) === 0
                    ? "Critical"
                    : (newProduct.stock_level ?? 0) <= 10
                    ? "Low"
                    : "In Stock",
              };

              setProductFeed((prev) => [newFeedItem, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              const updatedProduct = payload.new as {
                sku: string;
                product_name: string;
                stock_level?: number | null;
                expiration?: string | null;
              };

              setProductFeed((prev) =>
                prev.map((item) =>
                  item.sku === updatedProduct.sku
                    ? {
                        ...item,
                        productName: updatedProduct.product_name,
                        stockLevel: updatedProduct.stock_level ?? 0,
                        expiration: updatedProduct.expiration
                          ? new Date(updatedProduct.expiration).toLocaleDateString()
                          : "",
                        status:
                          (updatedProduct.stock_level ?? 0) === 0
                            ? "Critical"
                            : (updatedProduct.stock_level ?? 0) <= 10
                            ? "Low"
                            : "In Stock",
                      }
                    : item
                )
              );
            } else if (payload.eventType === "DELETE") {
              const deletedProduct = payload.old as { sku: string };
              setProductFeed((prev) => prev.filter((item) => item.sku !== deletedProduct.sku));
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
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
      zoneCards={initialZoneCards}
      activeAlerts={activeAlerts}
    />
  );
}
