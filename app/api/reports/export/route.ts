import { NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type ExportProductRow = {
  sku: string;
  product_name: string;
  stock_level?: number | null;
  status?: string | null;
  expiration?: string | null;
};

type ExportZoneRow = {
  id?: string | number | null;
  label?: string | null;
  name?: string | null;
  current?: number | null;
};

function csvEscape(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsvLine(values: Array<string | number | null | undefined>): string {
  return values.map(csvEscape).join(",");
}

function parseDate(input: string | null | undefined): Date | null {
  if (!input) return null;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysUntil(date: Date): number {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = startOfTarget.getTime() - startOfToday.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const supabase = createSupabaseServerClient();

    const products = await (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("sku, product_name, stock_level, status, expiration")
        .order("product_name", { ascending: true });

      if (error) {
        console.error("Export reports products fetch error", error);
        throw new Error("Unable to load products for export");
      }

      return ((data ?? []) as ExportProductRow[]).map((p) => {
        const rawStatus = (p.status ?? "In Stock").toString();
        const status = rawStatus === "Low" || rawStatus === "Critical" ? rawStatus : "In Stock";
        return {
          sku: p.sku,
          productName: p.product_name,
          stockLevel: p.stock_level ?? 0,
          expiration: p.expiration ? new Date(p.expiration).toLocaleDateString() : "",
          status,
        };
      });
    })();

    const zones = await (async () => {
      const { data, error } = await supabase
        .from("zones")
        .select("id, label, name, current")
        .order("id", { ascending: true });

      if (error) {
        console.error("Export reports zones fetch error", error);
        throw new Error("Unable to load zones for export");
      }

      return ((data ?? []) as ExportZoneRow[]).map((z) => ({
        zone: z.label ?? (z.id ? `ZONE ${z.id}` : ""),
        name: z.name ?? "",
        units: z.current ?? 0,
      }));
    })();

    const totalProducts = products.length;
    const lowItems = products.filter((p) => p.status === "Low").length;
    const criticalItems = products.filter((p) => p.status === "Critical").length;
    const totalUnits = products.reduce((sum, p) => sum + (p.stockLevel ?? 0), 0);

    const expiryCandidates = products
      .map((p) => {
        const expirationDate = parseDate(p.expiration);
        if (!expirationDate) return null;
        return { ...p, daysToExpiry: daysUntil(expirationDate) };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => a.daysToExpiry - b.daysToExpiry)
      .slice(0, 10);

    const lines: string[] = [];
    lines.push("Inventory System Report");
    lines.push(`Generated At,${new Date().toISOString()}`);
    lines.push("");

    lines.push("Summary");
    lines.push(toCsvLine(["Total SKUs", totalProducts]));
    lines.push(toCsvLine(["Low Stock", lowItems]));
    lines.push(toCsvLine(["Critical Stock", criticalItems]));
    lines.push(toCsvLine(["Total Units", totalUnits]));
    lines.push("");

    lines.push("Zone Distribution");
    lines.push(toCsvLine(["Zone", "Name", "Units"]));
    for (const zone of zones) {
      lines.push(toCsvLine([zone.zone, zone.name, zone.units]));
    }
    lines.push("");

    lines.push("Product Stock Health");
    lines.push(toCsvLine(["SKU", "Product Name", "Status", "Stock Level", "Expiration"]));
    for (const product of products) {
      lines.push(
        toCsvLine([
          product.sku,
          product.productName,
          product.status,
          product.stockLevel,
          product.expiration,
        ]),
      );
    }
    lines.push("");

    lines.push("Top Expiry Risk");
    lines.push(toCsvLine(["SKU", "Product Name", "Status", "Expiration", "Days To Expiry"]));
    for (const item of expiryCandidates) {
      lines.push(toCsvLine([item.sku, item.productName, item.status, item.expiration, item.daysToExpiry]));
    }

    const csv = lines.join("\n");
    const dateLabel = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=reports-${dateLabel}.csv`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Unexpected reports export error", error);
    return NextResponse.json({ error: "Unable to export report" }, { status: 500 });
  }
}
