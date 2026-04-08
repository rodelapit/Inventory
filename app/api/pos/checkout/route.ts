import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { endRequestLog, logRequestError, logRequestEvent, startRequestLog } from "@/lib/observability/request";

type PosAction = "checkout" | "refund" | "void";

type PosCartItem = {
  sku: string;
  quantity: number;
};

type DiscountType = "none" | "percent" | "fixed";

type ProductRow = {
  id: string;
  sku: string;
  product_name: string;
  stock_level?: number | null;
  price?: number | null;
  status?: string | null;
};

type PaymentMethod = "cash" | "gcash" | "card" | "mixed" | "other";

type OrderInsertPayload = {
  order_number: string;
  customer_name: string;
  total_amount: number;
  order_status: string;
  order_date: string;
};

type OrderRow = {
  id: string;
  order_number?: string | null;
  customer_name?: string | null;
  total_amount?: number | null;
  order_status?: string | null;
  order_date?: string | null;
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

function normalizePaymentMethod(value: string): PaymentMethod {
  const method = value.trim().toLowerCase();
  if (method === "cash" || method === "gcash" || method === "card" || method === "mixed") {
    return method;
  }
  return "other";
}

async function insertOrder(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  payload: OrderInsertPayload,
): Promise<{ data: OrderRow | null; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from("orders")
    .insert(payload)
    .select("id, order_number, customer_name, total_amount, order_status, order_date")
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: (data as OrderRow) ?? null, error: null };
}

async function fetchOrderByNumber(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  orderNumber: string,
) {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, total_amount, order_status, order_date")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

async function updateSourceOrderStatus(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  orderNumber: string,
  orderStatus: string,
) {
  const { error } = await supabase
    .from("orders")
    .update({ order_status: orderStatus })
    .eq("order_number", orderNumber);

  if (error) {
    console.error("POS source order status update failed", error);
  }
}

async function cleanupOrderArtifacts(supabase: ReturnType<typeof createSupabaseAdminClient>, orderId: string) {
  await supabase.from("payments").delete().eq("order_id", orderId);
  await supabase.from("stock_movements").delete().eq("source_order_id", orderId);
  await supabase.from("order_items").delete().eq("order_id", orderId);
  await supabase.from("orders").delete().eq("id", orderId);
}

export async function POST(req: Request) {
  const logContext = startRequestLog("/api/pos/checkout", "pos_transaction");

  const fail = async (
    status: number,
    errorMessage: string,
    event: string,
    details?: Record<string, unknown>,
    error?: unknown,
  ) => {
    if (error) {
      await logRequestError(logContext, event, error, details as never);
    } else {
      logRequestEvent(logContext, event, details as never);
    }
    endRequestLog(logContext, status);
    return NextResponse.json({ error: errorMessage, requestId: logContext.requestId }, { status });
  };

  try {
    if (!isSupabaseConfigured()) {
      return fail(500, "Supabase not configured", "supabase_not_configured");
    }

    const body = await req.json();
    const actionRaw = String(body.action ?? "checkout").trim().toLowerCase();
    const action: PosAction = actionRaw === "refund" ? "refund" : actionRaw === "void" ? "void" : "checkout";
    const cartItems = Array.isArray(body.items) ? (body.items as PosCartItem[]) : [];
    const cashierName = String(body.cashierName ?? "Internal Sale").trim() || "Internal Sale";
    const paymentMethodInput = String(body.paymentMethod ?? "cash").trim();
    const paymentMethod = normalizePaymentMethod(paymentMethodInput);
    const sourceOrderNumber = String(body.sourceOrderNumber ?? "").trim();
    const promoCode = String(body.promoCode ?? "").trim().toUpperCase() || null;
    const discountType = normalizeDiscountType(body.discountType);
    const discountValue = Number(body.discountValue ?? 0);
    const cashierUserIdRaw = String(body.cashierUserId ?? "").trim();
    const cashierUserId = cashierUserIdRaw.length > 0 ? cashierUserIdRaw : null;
    logContext.userId = cashierUserId;

    logRequestEvent(logContext, "payload_received", {
      action,
      itemCount: cartItems.length,
      paymentMethod,
    } as never);

    if (cartItems.length === 0) {
      return fail(400, "Add at least one item to continue", "validation_failed", { reason: "empty_cart" });
    }

    const mergedCart = new Map<string, number>();
    for (const item of cartItems) {
      const sku = String(item.sku ?? "").trim().toUpperCase();
      const quantity = Math.floor(Number(item.quantity));

      if (!sku || !Number.isFinite(quantity) || quantity <= 0) {
        return fail(400, "Each cart item must have a valid SKU and quantity", "validation_failed", {
          reason: "invalid_item",
        });
      }

      mergedCart.set(sku, (mergedCart.get(sku) ?? 0) + quantity);
    }

    const skus = Array.from(mergedCart.keys());
    const supabase = createSupabaseAdminClient();

    const { data: productRows, error: productError } = await supabase
      .from("products")
      .select("id, sku, product_name, stock_level, price, status")
      .in("sku", skus);

    if (productError) {
      console.error("POS checkout product lookup failed", productError);
      return fail(500, productError.message, "product_lookup_failed", { skus }, productError);
    }

    const products = (productRows ?? []) as ProductRow[];
    const productMap = new Map(products.map((product) => [product.sku.toUpperCase(), product]));

    const missingSkus = skus.filter((sku) => !productMap.has(sku));
    if (missingSkus.length > 0) {
      return fail(400, `Some SKUs were not found: ${missingSkus.join(", ")}`, "validation_failed", {
        reason: "missing_skus",
      });
    }

    const originalStockLevels = new Map<string, number>();
    const receiptItems: ReceiptLineItem[] = [];
    const movementPayload: Array<{
      productId: string;
      sku: string;
      movementType: "sale" | "refund" | "void";
      qtyDelta: number;
      beforeQty: number;
      afterQty: number;
    }> = [];
    let subtotal = 0;

    for (const [sku, quantity] of mergedCart.entries()) {
      const product = productMap.get(sku);
      const currentStock = Number(product?.stock_level ?? 0);
      const unitPrice = Number(product?.price ?? 0);

      if (action === "checkout" && quantity > currentStock) {
        return fail(400, `${product?.product_name ?? sku} only has ${currentStock} units in stock`, "validation_failed", {
          reason: "insufficient_stock",
          sku,
        });
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
        return fail(500, updateResult.error.message, "stock_update_failed", { sku }, updateResult.error);
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

      movementPayload.push({
        productId: product?.id ?? "",
        sku,
        movementType: action === "checkout" ? "sale" : action,
        qtyDelta: action === "checkout" ? -quantity : quantity,
        beforeQty: currentStock,
        afterQty: nextStock,
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
        ? `Completed - ${paymentMethod.toUpperCase()}`
        : action === "refund"
        ? `Refunded - ${paymentMethod.toUpperCase()}`
        : `Voided - ${paymentMethod.toUpperCase()}`;

    const orderInsertPayload = {
      order_number: orderNumber,
      customer_name:
        action === "checkout"
          ? cashierName
          : `${cashierName} (${action.toUpperCase()}${sourceOrderNumber ? ` ${sourceOrderNumber}` : ""})`,
      total_amount: orderTotalForInsert,
      order_status: orderStatus,
      order_date: completedAt,
    };

    const orderInsertResult = await insertOrder(supabase, orderInsertPayload);

    if (orderInsertResult.error || !orderInsertResult.data) {
      await rollbackStockLevels(supabase, originalStockLevels);
      console.error("POS checkout order insert failed", orderInsertResult.error);
      return fail(
        500,
        orderInsertResult.error?.message ?? "Unable to persist order",
        "order_insert_failed",
        undefined,
        orderInsertResult.error,
      );
    }

    const order = orderInsertResult.data;

    const orderItemsPayload = receiptItems.map((item) => {
      const product = productMap.get(item.sku);
      return {
        order_id: order.id,
        product_id: product?.id ?? null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      };
    });

    const { error: orderItemsError } = await supabase.from("order_items").insert(orderItemsPayload);
    if (orderItemsError) {
      await rollbackStockLevels(supabase, originalStockLevels);
      await cleanupOrderArtifacts(supabase, order.id);
      console.error("POS checkout order items insert failed", orderItemsError);
      return fail(500, orderItemsError.message, "order_items_insert_failed", { orderId: order.id }, orderItemsError);
    }

    const { error: stockMovementError } = await supabase.from("stock_movements").insert(
      movementPayload.map((movement) => ({
        product_id: movement.productId,
        sku: movement.sku,
        movement_type: movement.movementType,
        qty_delta: movement.qtyDelta,
        before_qty: movement.beforeQty,
        after_qty: movement.afterQty,
        source_order_id: order.id,
        reason:
          action === "checkout"
            ? "POS checkout"
            : action === "refund"
            ? "POS refund"
            : "POS void",
        actor_user_id: cashierUserId,
      })),
    );

    if (stockMovementError) {
      await rollbackStockLevels(supabase, originalStockLevels);
      await cleanupOrderArtifacts(supabase, order.id);
      console.error("POS checkout stock movement insert failed", stockMovementError);
      return fail(500, stockMovementError.message, "stock_movements_insert_failed", { orderId: order.id }, stockMovementError);
    }

    const paymentInsertPayload = {
      order_id: order.id,
      method: paymentMethod,
      amount: finalTotal,
      reference_no: sourceOrderNumber || promoCode,
      paid_at: completedAt,
      cashier_user_id: cashierUserId,
    };

    const { error: paymentInsertError } = await supabase.from("payments").insert(paymentInsertPayload);
    if (paymentInsertError) {
      await rollbackStockLevels(supabase, originalStockLevels);
      await cleanupOrderArtifacts(supabase, order.id);
      console.error("POS checkout payment insert failed", paymentInsertError);
      return fail(500, paymentInsertError.message, "payments_insert_failed", { orderId: order.id }, paymentInsertError);
    }

    const orderFetchResult = await fetchOrderByNumber(supabase, orderNumber);

    if (orderFetchResult.error) {
      await rollbackStockLevels(supabase, originalStockLevels);
      await cleanupOrderArtifacts(supabase, order.id);
      console.error("POS checkout order verification failed", orderFetchResult.error);
      return fail(500, orderFetchResult.error.message, "order_verify_failed", { orderId: order.id }, orderFetchResult.error);
    }

    const persistedOrder = orderFetchResult.data ?? order;

    if (action === "checkout" && promoCode) {
      const { data: promoRow } = await supabase
        .from("promotions")
        .select("times_used")
        .eq("code", promoCode)
        .eq("active", true)
        .maybeSingle();

      const nextTimesUsed = Number(promoRow?.times_used ?? 0) + 1;
      await supabase
        .from("promotions")
        .update({ times_used: nextTimesUsed })
        .eq("code", promoCode)
        .eq("active", true);
    }

    if (action !== "checkout" && sourceOrderNumber) {
      await updateSourceOrderStatus(supabase, sourceOrderNumber, orderStatus);
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

    logRequestEvent(logContext, "transaction_persisted", {
      orderId: persistedOrder?.id ?? order.id,
      action,
      itemCount: receiptItems.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: finalTotal,
    } as never);
    endRequestLog(logContext, 200);

    return NextResponse.json({
      data: {
        order: persistedOrder ?? null,
        action,
        sourceOrderNumber: sourceOrderNumber || null,
        orderNumber,
        cashierName,
        paymentMethod: paymentMethod.toUpperCase(),
        promoCode,
        discountType: resolvedDiscountType,
        discountValue: resolvedDiscountType === "none" ? 0 : Number(discountValue.toFixed(2)),
        discountAmount,
        subtotal: Number(subtotal.toFixed(2)),
        taxAmount,
        completedAt,
        totalAmount: finalTotal,
        orderStatus,
        orderPersistence: persistedOrder ? "saved" : "unknown",
        orderTable: "orders",
        requestId: logContext.requestId,
        itemCount: receiptItems.reduce((sum, item) => sum + item.quantity, 0),
        items: receiptItems,
      },
    });
  } catch (error) {
    console.error("Unexpected POS checkout error", error);
    await logRequestError(logContext, "pos_unexpected_error", error);
    endRequestLog(logContext, 500);
    return NextResponse.json({ error: "Unable to complete sale", requestId: logContext.requestId }, { status: 500 });
  }
}