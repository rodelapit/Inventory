"use client";

import { useEffect, useState } from "react";
import { InventoryZonesSection, type InventoryZone } from "./InventoryZonesSection";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type InventoryProduct = {
  quantity: number;
  storageZone?: string | null;
};

const inventoryZones: InventoryZone[] = [
  {
    id: "A",
    label: "ZONE A",
    name: "Ambient Storage",
    current: 0,
    capacity: 15000,
    utilization: 0,
    temperature: "20-25°C",
    humidity: "45-55%",
    color: "indigo",
  },
  {
    id: "B",
    label: "ZONE B",
    name: "Cold Storage",
    current: 0,
    capacity: 5000,
    utilization: 0,
    temperature: "2-4°C",
    humidity: "85-90%",
    color: "cyan",
  },
  {
    id: "Q",
    label: "ZONE Q",
    name: "Quarantined Stock",
    current: 0,
    capacity: 500,
    utilization: 0,
    temperature: "20°C",
    humidity: "50%",
    color: "amber",
  },
  {
    id: "C",
    label: "ZONE C",
    name: "Frozen Storage",
    current: 0,
    capacity: 3000,
    utilization: 0,
    temperature: "-18 to -20°C",
    humidity: "40-55%",
    color: "blue",
  },
  {
    id: "D",
    label: "ZONE D",
    name: "Dry Storage",
    current: 0,
    capacity: 8000,
    utilization: 0,
    temperature: "18-22°C",
    humidity: "35-45%",
    color: "violet",
  },
  {
    id: "E",
    label: "ZONE E",
    name: "Receiving Area",
    current: 0,
    capacity: 2000,
    utilization: 0,
    temperature: "18-22°C",
    humidity: "50%",
    color: "pink",
  },
];

type InventoryZonesSectionLiveProps = {
  initialZones: InventoryZone[];
};

function calculateZoneCurrents(
  products: InventoryProduct[]
): Map<string, number> {
  const zoneCurrentMap = new Map<string, number>();

  for (const p of products) {
    const rawZone = (p.storageZone ?? "").toString().trim().toUpperCase();
    const zone = rawZone || "E";
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

                  const zoneCurrentMap = calculateZoneCurrents(products);

                  setZones((prevZones) =>
                    prevZones.map((zone) => {
                      const current = zoneCurrentMap.get(zone.id.toUpperCase()) ?? 0;
                      const utilization = Math.round(
                        (current / Math.max(1, zone.capacity)) * 100
                      );

                      return {
                        ...zone,
                        current,
                        utilization: Math.min(100, utilization),
                      };
                    })
                  );
                }
              });
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error("Failed to set up realtime subscription for inventory zones:", error);
    }
  }, []);

  return <InventoryZonesSection initialZones={zones} />;
}
