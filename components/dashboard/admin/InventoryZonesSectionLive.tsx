"use client";

import { useEffect, useState } from "react";
import { InventoryZonesSection, type InventoryZone } from "./InventoryZonesSection";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type InventoryProduct = {
  quantity: number;
  storageZone?: string | null;
};

type InventoryZonesSectionLiveProps = {
  initialZones: InventoryZone[];
};

function calculateZoneCurrents(
  products: InventoryProduct[],
  zoneIds: Set<string>
): Map<string, number> {
  const zoneCurrentMap = new Map<string, number>();

  for (const p of products) {
    const rawZone = (p.storageZone ?? "").toString().trim().toUpperCase() || "UNASSIGNED";
    const zone = zoneIds.has(rawZone) ? rawZone : "UNASSIGNED";
    const previous = zoneCurrentMap.get(zone) ?? 0;
    const qty = Number.isNaN(Number(p.quantity)) ? 0 : Number(p.quantity);
    zoneCurrentMap.set(zone, previous + qty);
  }

  return zoneCurrentMap;
}

export function InventoryZonesSectionLive({
  initialZones,
}: InventoryZonesSectionLiveProps) {
  const [zones, setZones] = useState<InventoryZone[]>(initialZones);

  useEffect(() => {
    try {
      const supabase = createSupabaseBrowserClient();

      // Subscribe to changes on the products table
      const subscription = supabase
        .channel("products-zones")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "products",
          },
          () => {
            // On any change, refetch all products to recalculate zone totals
            supabase
              .from("products")
              .select("stock_level, storage_zone")
              .then(({ data, error }) => {
                if (!error && Array.isArray(data)) {
                  const products: InventoryProduct[] = (data as any[]).map((p) => ({
                    quantity: Number(p.stock_level ?? 0),
                    storageZone: p.storage_zone ?? null,
                  }));

                  setZones((prevZones) => {
                    const zoneIds = new Set(prevZones.map((zone) => zone.id.toUpperCase()));
                    const zoneCurrentMap = calculateZoneCurrents(products, zoneIds);

                    return prevZones.map((zone) => {
                      const current = zoneCurrentMap.get(zone.id.toUpperCase()) ?? 0;
                      const utilization = Math.round(
                        (current / Math.max(1, zone.capacity)) * 100
                      );

                      return {
                        ...zone,
                        current,
                        utilization: Math.min(100, utilization),
                      };
                    });
                  });
                }
              });
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.warn("Failed to set up realtime subscription for inventory zones:", error);
    }
  }, []);

  return <InventoryZonesSection initialZones={zones} />;
}
