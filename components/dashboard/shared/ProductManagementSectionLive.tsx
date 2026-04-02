"use client";

import { useEffect, useState } from "react";
import { ProductManagementSection } from "./ProductManagementSection";
import type { ProductFeedItem } from "@/data/dashboard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProductManagementSectionLiveProps = {
  initialProductFeed: ProductFeedItem[];
};

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getProductStatus(stockLevel: number | null | undefined): "In Stock" | "Low" | "Critical" {
  const level = stockLevel ?? 0;
  if (level === 0) return "Critical";
  if (level <= 10) return "Low";
  return "In Stock";
}

export function ProductManagementSectionLive({
  initialProductFeed,
}: ProductManagementSectionLiveProps) {
  const [productFeed, setProductFeed] = useState<ProductFeedItem[]>(initialProductFeed);
  const [pendingSku, setPendingSku] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleAdjustStock(sku: string, nextStock: number) {
    setPendingSku(sku);
    setActionError(null);

    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sku,
          stockLevel: Math.max(0, nextStock),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setActionError(json?.error ?? "Failed to update stock level.");
        return;
      }

      const updated = json?.data as {
        sku?: string;
        product_name?: string;
        stock_level?: number | null;
        expiration?: string | null;
      } | null;

      if (updated?.sku) {
        setProductFeed((prev) =>
          prev.map((item) =>
            item.sku === updated.sku
              ? {
                  ...item,
                  productName: updated.product_name ?? item.productName,
                  stockLevel: updated.stock_level ?? 0,
                  expiration: updated.expiration ? new Date(updated.expiration).toLocaleDateString() : item.expiration,
                  status: getProductStatus(updated.stock_level),
                }
              : item,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to adjust stock", error);
      setActionError("Failed to update stock level.");
    } finally {
      setPendingSku(null);
    }
  }

  useEffect(() => {
    try {
      const supabase = createSupabaseBrowserClient();

      // Subscribe to changes on the products table
      const subscription = supabase
        .channel("products-changes")
        .on(
          "postgres_changes",
          {
            event: "*", // Listen to INSERT, UPDATE, DELETE
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
                status: getProductStatus(newProduct.stock_level),
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
                        status: getProductStatus(updatedProduct.stock_level),
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
    <ProductManagementSection
      productFeed={productFeed}
      onAdjustStock={handleAdjustStock}
      pendingSku={pendingSku}
      actionError={actionError}
    />
  );
}
