import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

type PosAction = "checkout" | "refund" | "void";

type PosCartItem = {
  sku: string;
  quantity: number;
};

type DiscountType = "none" | "percent" | "fixed";

type ProductRow = {
  sku: string;
  product_name: string;
  stock_level?: number | null;
  price?: number | null;
  status?: string | null;
};

type ReceiptLineItem = {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

function normalizeStockStatus(stockLevel: number): "In Stock" | "Low" | "Critical" {
  if (stockLevel <= 0) return "Critical";
  if (stockLevel <= 10) return "Low";
  return "In Stock";
}

function buildOrderNumber(): string {
  const stamp = new Date();
  const datePart = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, "0")}${String(stamp.getDate()).padStart(2, "0")}`;
  const timePart = `${String(stamp.getHours()).padStart(2, "0")}${String(stamp.getMinutes()).padStart(2, "0")}${String(stamp.getSeconds()).padStart(2, "0")}`;
  const suffix = String(Math.floor(Math.random() * 9000) + 1000);
  return `POS-${datePart}-${timePart}-${suffix}`;
}

async function rollbackStockLevels(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  originalStockLevels: Map<string, number>,
) {
  for (const [sku, stockLevel] of originalStockLevels.entries()) {
    try {
      await supabase
        .from("products")
        .update({
          stock_level: stockLevel,
          status: normalizeStockStatus(stockLevel),
        })
        .eq("sku", sku);
    } catch (error) {
      console.error(`Failed to roll back stock for ${sku}`, error);
    }
  }
}

function normalizeDiscountType(input: unknown): DiscountType {
  const raw = String(input ?? "none").trim().toLowerCase();
  if (raw === "percent") return "percent";
  if (raw === "fixed") return "fixed";
  return "none";
}

function calculateDiscountAmount(subtotal: number, discountType: DiscountType, discountValueRaw: number): number {
  const discountValue = Number.isFinite(discountValueRaw) ? Math.max(0, discountValueRaw) : 0;

  if (discountType === "percent") {
    const clampedPercent = Math.min(100, discountValue);
    return Number((subtotal * (clampedPercent / 100)).toFixed(2));
  }

  if (discountType === "fixed") {
    return Number(Math.min(subtotal, discountValue).toFixed(2));
  }

  return 0;
}

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const body = await req.json();
    const actionRaw = String(body.action ?? "checkout").trim().toLowerCase();
    const action: PosAction = actionRaw === "refund" ? "refund" : actionRaw === "void" ? "void" : "checkout";
    const cartItems = Array.isArray(body.items) ? (body.items as PosCartItem[]) : [];
    const cashierName = String(body.cashierName ?? "Internal Sale").trim() || "Internal Sale";
    const paymentMethod = String(body.paymentMethod ?? "Cash").trim() || "Cash";
    const sourceOrderNumber = String(body.sourceOrderNumber ?? "").trim();
    const promoCode = String(body.promoCode ?? "").trim().toUpperCase() || null;
    const discountType = normalizeDiscountType(body.discountType);
    const discountValue = Number(body.discountValue ?? 0);

    if (cartItems.length === 0) {
      return NextResponse.json({ error: "Add at least one item to continue" }, { status: 400 });
    }

    const mergedCart = new Map<string, number>();
    for (const item of cartItems) {
      const sku = String(item.sku ?? "").trim().toUpperCase();
      const quantity = Math.floor(Number(item.quantity));

      if (!sku || !Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json({ error: "Each cart item must have a valid SKU and quantity" }, { status: 400 });
      }

      mergedCart.set(sku, (mergedCart.get(sku) ?? 0) + quantity);
    }

    const skus = Array.from(mergedCart.keys());
    const supabase = createSupabaseAdminClient();

    const { data: productRows, error: productError } = await supabase
      .from("products")
      .select("sku, product_name, stock_level, price, status")
      .in("sku", skus);

    if (productError) {
      console.error("POS checkout product lookup failed", productError);
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }

    const products = (productRows ?? []) as ProductRow[];
    const productMap = new Map(products.map((product) => [product.sku.toUpperCase(), product]));

    const missingSkus = skus.filter((sku) => !productMap.has(sku));
    if (missingSkus.length > 0) {
      return NextResponse.json(
        { error: `Some SKUs were not found: ${missingSkus.join(", ")}` },
        { status: 400 },
      );
    }

    const originalStockLevels = new Map<string, number>();
    const receiptItems: ReceiptLineItem[] = [];
    let subtotal = 0;

    for (const [sku, quantity] of mergedCart.entries()) {
      const product = productMap.get(sku);
      const currentStock = Number(product?.stock_level ?? 0);
      const unitPrice = Number(product?.price ?? 0);

      if (action === "checkout" && quantity > currentStock) {
        return NextResponse.json(
          { error: `${product?.product_name ?? sku} only has ${currentStock} units in stock` },
          { status: 400 },
        );
      }

      originalStockLevels.set(sku, currentStock);

      const nextStock = action === "checkout" ? currentStock - quantity : currentStock + quantity;
      const updateResult = await supabase
        .from("products")
        .update({
          stock_level: nextStock,
          status: normalizeStockStatus(nextStock),
        })
        .eq("sku", sku);

      if (updateResult.error) {
        await rollbackStockLevels(supabase, originalStockLevels);
        console.error(`POS checkout stock update failed for ${sku}`, updateResult.error);
        return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
      }

      const lineTotal = Number((unitPrice * quantity).toFixed(2));
      subtotal += lineTotal;
      receiptItems.push({
        sku,
        name: product?.product_name ?? sku,
        quantity,
        unitPrice,
        lineTotal,
      });
    }

    const resolvedDiscountType = action === "checkout" ? discountType : "none";
    const discountAmount = action === "checkout"
      ? calculateDiscountAmount(subtotal, resolvedDiscountType, discountValue)
      : 0;
    const taxableBase = Math.max(0, subtotal - discountAmount);
    const taxAmount = Number((taxableBase * 0.08).toFixed(2));
    const finalTotal = Number((taxableBase + taxAmount).toFixed(2));
    const orderTotalForInsert = action === "checkout" ? finalTotal : Number((-1 * finalTotal).toFixed(2));

    const orderNumber = buildOrderNumber();
    const completedAt = new Date().toISOString();
    const orderStatus =
      action === "checkout"
        ? `Completed - ${paymentMethod}`
        : action === "refund"
        ? `Refunded - ${paymentMethod}`
        : `Voided - ${paymentMethod}`;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name:
          action === "checkout"
            ? cashierName
            : `${cashierName} (${action.toUpperCase()}${sourceOrderNumber ? ` ${sourceOrderNumber}` : ""})`,
        total_amount: orderTotalForInsert,
        order_status: orderStatus,
        order_date: completedAt,
      })
      .select()
      .single();

    if (orderError) {
      await rollbackStockLevels(supabase, originalStockLevels);
      console.error("POS checkout order insert failed", orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    if (action !== "checkout" && sourceOrderNumber) {
      await supabase
        .from("orders")
        .update({ order_status: orderStatus })
        .eq("order_number", sourceOrderNumber);
    }

    try {
      revalidatePath("/");
      revalidatePath("/inventory");
      revalidatePath("/products");
      revalidatePath("/reports");
      revalidatePath("/pos");
    } catch (error) {
      console.error("POS checkout revalidation failed", error);
    }

    return NextResponse.json({
      data: {
        order,
        action,
        sourceOrderNumber: sourceOrderNumber || null,
        orderNumber,
        cashierName,
        paymentMethod,
        promoCode,
        discountType: resolvedDiscountType,
        discountValue: resolvedDiscountType === "none" ? 0 : Number(discountValue.toFixed(2)),
        discountAmount,
        subtotal: Number(subtotal.toFixed(2)),
        taxAmount,
        completedAt,
        totalAmount: finalTotal,
        orderStatus,
        itemCount: receiptItems.reduce((sum, item) => sum + item.quantity, 0),
        items: receiptItems,
      },
    });
  } catch (error) {
    console.error("Unexpected POS checkout error", error);
    return NextResponse.json({ error: "Unable to complete sale" }, { status: 500 });
  }
}