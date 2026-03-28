import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient, createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type ProductSelectRow = {
  sku: string;
  product_name: string;
  category?: string | null;
  stock_level?: number | null;
  status?: string | null;
  price?: number | null;
  supplier?: string | null;
  storage_zone?: string | null;
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured", data: [] }, { status: 500 });
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("products")
      .select("sku, product_name, category, stock_level, status, price, supplier, storage_zone")
      .order("product_name", { ascending: true });

    if (error) {
      console.error("API /api/products select error", error);
      return NextResponse.json({ error: error.message, data: [] }, { status: 500 });
    }

    const rows = (data ?? []).map((p: ProductSelectRow) => ({
      sku: p.sku,
      name: p.product_name,
      category: p.category ?? "",
      quantity: p.stock_level ?? 0,
      status: p.status ?? "In Stock",
      price: Number(p.price ?? 0),
      supplier: p.supplier ?? "",
      storageZone: p.storage_zone ?? null,
    }));

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("Unexpected error in /api/products", err);
    return NextResponse.json({ error: "Unexpected error", data: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const sku = String(body.sku ?? "").trim();
    const name = String(body.name ?? "").trim();
    const category = String(body.category ?? "").trim() || null;
    const stock_level = Number.isNaN(Number(body.quantity)) ? 0 : Number(body.quantity);
    const status = String(body.status ?? "In Stock");
    const price = Number.isNaN(Number(body.price)) ? 0 : Number(body.price);
    const supplier = String(body.supplier ?? "").trim() || null;
    const expiration = body.expiration ? new Date(body.expiration).toISOString() : null;
    const storage_zone = String(body.storage_zone ?? "").trim() || null;

    if (!sku || !name) {
      return NextResponse.json({ error: "SKU and name required" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("products").insert({
      sku,
      product_name: name,
      category,
      stock_level,
      status,
      price,
      supplier,
      expiration,
      storage_zone,
    }).select().single();

    if (error) {
      console.error("API /api/products insert error", error);

      const isRlsError =
        error.code === "42501" ||
        error.message.toLowerCase().includes("row-level security");

      if (isRlsError) {
        return NextResponse.json(
          {
            error:
              "Insert blocked by Supabase RLS. Add SUPABASE_SERVICE_ROLE_KEY to .env.local or create an INSERT policy for your authenticated role.",
          },
          { status: 403 },
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // invalidate cached server-rendered pages that depend on products
    try {
      revalidatePath("/products");
      revalidatePath("/");
      // inventory overview derives its totals from all products
      revalidatePath("/inventory");
    } catch (e) {
      // Best-effort: log but don't fail the response
      console.error("revalidatePath error:", e);
    }

    return NextResponse.json({ data: data });
  } catch (err) {
    console.error("Unexpected error in POST /api/products", err);

    if (err instanceof Error && err.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is not configured. Add it to .env.local so server API routes can write products.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
