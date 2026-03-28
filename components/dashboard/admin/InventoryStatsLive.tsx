"use client";

import { useEffect, useState } from "react";
import { InventoryStatCard } from "./InventoryStatCard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type InventoryProduct = {
  quantity: number;
  storageZone?: string | null;
};

type InventoryStats = {
  totalCurrent: number;
  availableSpace: number;
  avgUtilization: number;
};

const zoneCapacities: Record<string, number> = {
  A: 15000,
  B: 5000,
  Q: 500,
  C: 3000,
  D: 8000,
  E: 2000,
};

const totalCapacity = Object.values(zoneCapacities).reduce((sum, cap) => sum + cap, 0);

function calculateStats(products: InventoryProduct[]): InventoryStats {
  let totalCurrent = 0;

  for (const p of products) {
    const qty = Number.isNaN(Number(p.quantity)) ? 0 : Number(p.quantity);
    totalCurrent += qty;
  }

  const availableSpace = totalCapacity - totalCurrent;
  const avgUtilization = Math.round((totalCurrent / Math.max(1, totalCapacity)) * 100);

  return {
    totalCurrent,
    availableSpace,
    avgUtilization,
  };
}

type InventoryStatsLiveProps = {
  initialStats: {
    totalCurrent: number;
    availableSpace: number;
    avgUtilization: number;
  };
};

export function InventoryStatsLive({ initialStats }: InventoryStatsLiveProps) {
  const [stats, setStats] = useState<InventoryStats>(initialStats);

  useEffect(() => {
    try {
      const supabase = createSupabaseBrowserClient();

      // Subscribe to changes on the products table
      const subscription = supabase
        .channel("products-inventory-stats")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "products",
          },
          () => {
            // On any change, refetch all products to recalculate stats
            supabase
              .from("products")
              .select("stock_level, storage_zone")
              .then(({ data, error }) => {
                if (!error && Array.isArray(data)) {
                  const products: InventoryProduct[] = (data as any[]).map((p) => ({
                    quantity: Number(p.stock_level ?? 0),
                    storageZone: p.storage_zone ?? null,
                  }));

                  const newStats = calculateStats(products);
                  setStats(newStats);
                }
              });
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error("Failed to set up realtime subscription for inventory stats:", error);
    }
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <InventoryStatCard
        title="Total capacity"
        value={totalCapacity}
        description="units capacity"
        iconName="Archive"
        color="purple"
        trend={{ value: 5.2, isPositive: true }}
      />
      <InventoryStatCard
        title="Current stock"
        value={stats.totalCurrent}
        description="units in storage"
        iconName="Package"
        color="cyan"
        trend={{ value: 2.1, isPositive: true }}
      />
      <InventoryStatCard
        title="Available space"
        value={stats.availableSpace}
        description="units remaining"
        iconName="TrendingUp"
        color="emerald"
        trend={{ value: 1.8, isPositive: false }}
      />
      <InventoryStatCard
        title="Avg. utilization"
        value={`${stats.avgUtilization}%`}
        description="across all zones"
        iconName="BarChart3"
        color="fuchsia"
      />
    </div>
  );
}
