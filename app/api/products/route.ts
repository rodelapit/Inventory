import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient, createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { endRequestLog, logRequestError, logRequestEvent, startRequestLog } from "@/lib/observability/request";

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const maybeError = error as { message?: unknown };
    if (typeof maybeError.message === "string" && maybeError.message.trim().length > 0) {
      return maybeError.message;
    }
  }
  return String(error ?? "Unknown error");
}

function getSupabaseErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" ? maybeCode : null;
}

export async function GET() {
  const context = startRequestLog("/api/products", "products_list");

  if (!isSupabaseConfigured()) {
    endRequestLog(context, 500);
    return NextResponse.json({ error: "Supabase not configured", data: [], requestId: context.requestId }, { status: 500 });
  }

  try {
    // Prefer service-role reads for admin dashboards; fallback to server client when key is absent.
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createSupabaseAdminClient()
      : createSupabaseServerClient();

    const { data, error } = await supabase
      .from("products")
      .select("sku, product_name, category, stock_level, status, price, supplier, storage_zone")
      .order("product_name", { ascending: true });

    if (error) {
      const code = getSupabaseErrorCode(error);
      const message = getErrorMessage(error);
      const isRlsError = code === "42501" || message.toLowerCase().includes("row-level security");
      const isMissingTable = code === "42P01";
      const status = isRlsError ? 403 : 500;

      await logRequestError(context, "products_list_failed", error, {
        code: code ?? "unknown",
        missingTable: isMissingTable,
        rlsBlocked: isRlsError,
      });
      endRequestLog(context, status);

      return NextResponse.json(
        {
          error: message,
          code,
          data: [],
          requestId: context.requestId,
        },
        { status },
      );
    }
    logRequestEvent(context, "products_listed", { count: data?.length ?? 0 } as never);
    endRequestLog(context, 200);

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

    return NextResponse.json({ data: rows, requestId: context.requestId });
  } catch (err) {
    await logRequestError(context, "products_list_unexpected", err);
    endRequestLog(context, 500);
    return NextResponse.json({ error: "Unexpected error", data: [], requestId: context.requestId }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const context = startRequestLog("/api/products", "products_create");
  try {
    const body = await req.json();

    let sku = String(body.sku ?? "").trim();
    const name = String(body.name ?? "").trim();
    const category = String(body.category ?? "").trim() || null;
    const stock_level = Number.isNaN(Number(body.quantity)) ? 0 : Number(body.quantity);
    const status = String(body.status ?? "In Stock");
    const price = Number.isNaN(Number(body.price)) ? 0 : Number(body.price);
    const supplier = String(body.supplier ?? "").trim() || null;
    const expiration = body.expiration ? new Date(body.expiration).toISOString() : null;
    const storage_zone = String(body.storage_zone ?? "").trim() || null;

    if (!name) {
      endRequestLog(context, 400);
      return NextResponse.json({ error: "Product name required", requestId: context.requestId }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      endRequestLog(context, 500);
      return NextResponse.json({ error: "Supabase not configured", requestId: context.requestId }, { status: 500 });
    }

    // Auto-generate SKU if not provided
    if (!sku) {
      const supabaseCheck = createSupabaseAdminClient();
      const { data: allProducts } = await supabaseCheck
        .from("products")
        .select("sku")
        .order("sku", { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (allProducts && allProducts.length > 0) {
        const lastSku = allProducts[0].sku;
        const match = lastSku.match(/(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      sku = `PROD${String(nextNumber).padStart(3, "0")}`;
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
            requestId: context.requestId,
          },
          { status: 403 },
        );
      }

      await logRequestError(context, "products_create_failed", error);
      endRequestLog(context, 500);
      return NextResponse.json({ error: error.message, requestId: context.requestId }, { status: 500 });
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

    logRequestEvent(context, "product_created", { sku, stock_level } as never);
    endRequestLog(context, 200);
    return NextResponse.json({ data: data, requestId: context.requestId });
  } catch (err) {
    console.error("Unexpected error in POST /api/products", err);

    if (err instanceof Error && err.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is not configured. Add it to .env.local so server API routes can write products.",
          requestId: context.requestId,
        },
        { status: 500 },
      );
    }

    await logRequestError(context, "products_create_unexpected", err);
    endRequestLog(context, 500);
    return NextResponse.json({ error: "Unexpected error", requestId: context.requestId }, { status: 500 });
  }
}

function normalizeStockStatus(stockLevel: number): "In Stock" | "Low" | "Critical" {
  if (stockLevel <= 0) return "Critical";
  if (stockLevel <= 10) return "Low";
  return "In Stock";
}

export async function PATCH(req: Request) {
  const context = startRequestLog("/api/products", "products_adjust_stock");
  try {
    if (!isSupabaseConfigured()) {
      endRequestLog(context, 500);
      return NextResponse.json({ error: "Supabase not configured", requestId: context.requestId }, { status: 500 });
    }

    const body = await req.json();
    const sku = String(body.sku ?? "").trim();
    const inputStock = Number(body.stockLevel);

    if (!sku) {
      endRequestLog(context, 400);
      return NextResponse.json({ error: "SKU is required", requestId: context.requestId }, { status: 400 });
    }

    if (Number.isNaN(inputStock) || inputStock < 0) {
      endRequestLog(context, 400);
      return NextResponse.json({ error: "stockLevel must be a non-negative number", requestId: context.requestId }, { status: 400 });
    }

    const stockLevel = Math.floor(inputStock);
    const status = normalizeStockStatus(stockLevel);

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("products")
      .update({
        stock_level: stockLevel,
        status,
      })
      .eq("sku", sku)
      .select("sku, product_name, stock_level, expiration, status")
      .single();

    if (error) {
      console.error("API /api/products patch error", error);
      await logRequestError(context, "products_adjust_stock_failed", error, { sku, stockLevel } as never);
      endRequestLog(context, 500);
      return NextResponse.json({ error: error.message, requestId: context.requestId }, { status: 500 });
    }

    try {
      revalidatePath("/");
      revalidatePath("/products");
      revalidatePath("/inventory");
      revalidatePath("/reports");
      revalidatePath("/staff");
      revalidatePath("/staff/products");
      revalidatePath("/staff/inventory");
    } catch (e) {
      console.error("revalidatePath error (PATCH /api/products):", e);
    }

    logRequestEvent(context, "product_stock_adjusted", { sku, stockLevel, status } as never);
    endRequestLog(context, 200);
    return NextResponse.json({ data, requestId: context.requestId });
  } catch (err) {
    console.error("Unexpected error in PATCH /api/products", err);
    await logRequestError(context, "products_adjust_stock_unexpected", err);
    endRequestLog(context, 500);
    return NextResponse.json({ error: "Unexpected error", requestId: context.requestId }, { status: 500 });
  }
}
