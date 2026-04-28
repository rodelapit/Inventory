import { createSupabaseAdminClient, createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type OrderRow = {
  id: string;
  order_number?: string | null;
  customer_name?: string | null;
  total_amount?: number | null;
  order_status?: string | null;
  order_date?: string | null;
  created_at?: string | null;
};

type OrderItemRow = {
  order_id?: string | null;
  product_id?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
};

type PaymentRow = {
  order_id?: string | null;
  method?: string | null;
  amount?: number | null;
  paid_at?: string | null;
  cashier_user_id?: string | null;
  reference_no?: string | null;
};

type ProductRow = {
  id: string;
  sku?: string | null;
  product_name?: string | null;
};

type ProfileRow = {
  user_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
};

export type StaffTransactionStatus = "Delivered" | "In Transit" | "Pending" | "Refunded" | "Voided";

export type StaffTransactionLineItem = {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type StaffTransactionRecord = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  amount: string;
  totalAmountValue: number;
  status: StaffTransactionStatus;
  date: string;
  orderDateIso: string | null;
  paymentMethod: string;
  paymentAmount: number;
  paymentReference: string | null;
  cashierUserId: string | null;
  cashierName: string;
  itemCount: number;
  lineItems: StaffTransactionLineItem[];
  searchText: string;
};

export type StaffCashierOption = {
  userId: string;
  label: string;
};

export type StaffTransactionFilters = {
  q?: string;
  status?: string;
  cashier?: string;
};

export type StaffTransactionSummary = {
  totalRevenue: number;
  totalOrders: number;
  deliveredOrders: number;
  refundedOrders: number;
  voidedOrders: number;
  totalItems: number;
  paymentMethods: Array<{ method: string; count: number; amount: number }>;
};

export type StaffTransactionData = {
  records: StaffTransactionRecord[];
  cashiers: StaffCashierOption[];
  summary: StaffTransactionSummary;
  loadError: string | null;
  filters: Required<StaffTransactionFilters>;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const maybeError = error as { message?: unknown };
    if (typeof maybeError.message === "string" && maybeError.message.trim().length > 0) {
      return maybeError.message;
    }
  }
  return "Unable to load transactions.";
}

function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStatus(status?: string | null): StaffTransactionStatus {
  const value = String(status ?? "").toLowerCase();
  if (value.includes("void") || value.includes("cancel")) return "Voided";
  if (value.includes("refund")) return "Refunded";
  if (value.includes("deliver") || value.includes("complete")) return "Delivered";
  if (value.includes("transit") || value.includes("ship")) return "In Transit";
  return "Pending";
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeFilterValue(value?: string | null): string {
  return String(value ?? "").trim();
}

function normalizeCashierKey(value?: string | null): string {
  return normalizeFilterValue(value).toLowerCase();
}

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

export function buildStaffTransactionsCsv(data: StaffTransactionData): string {
  const lines: string[] = [];
  lines.push("Staff Transactions Export");
  lines.push(`Generated At,${new Date().toISOString()}`);
  lines.push(`Search,${csvEscape(data.filters.q)}`);
  lines.push(`Status,${csvEscape(data.filters.status)}`);
  lines.push(`Cashier,${csvEscape(data.filters.cashier)}`);
  lines.push("");

  lines.push("Summary");
  lines.push(toCsvLine(["Total Orders", data.summary.totalOrders]));
  lines.push(toCsvLine(["Total Revenue", data.summary.totalRevenue]));
  lines.push(toCsvLine(["Total Items", data.summary.totalItems]));
  lines.push(toCsvLine(["Delivered Orders", data.summary.deliveredOrders]));
  lines.push(toCsvLine(["Refunded Orders", data.summary.refundedOrders]));
  lines.push(toCsvLine(["Voided Orders", data.summary.voidedOrders]));
  lines.push("");

  lines.push("Transaction Detail");
  lines.push(toCsvLine(["Order", "Customer", "Cashier", "Payment Method", "Amount", "Status", "Date", "Items"]));
  for (const record of data.records) {
    lines.push(
      toCsvLine([
        record.orderNumber,
        record.customerName,
        record.cashierName,
        record.paymentMethod,
        record.amount,
        record.status,
        record.orderDateIso ?? record.date,
        record.itemCount,
      ]),
    );
    for (const item of record.lineItems) {
      lines.push(
        toCsvLine([
          `  ${record.orderNumber}`,
          item.sku,
          item.name,
          item.quantity,
          formatMoney(item.unitPrice),
          formatMoney(item.lineTotal),
          record.paymentReference ?? "",
        ]),
      );
    }
  }

  lines.push("");
  lines.push("Payment Methods");
  lines.push(toCsvLine(["Method", "Count", "Amount"]));
  for (const payment of data.summary.paymentMethods) {
    lines.push(toCsvLine([payment.method, payment.count, payment.amount]));
  }

  return lines.join("\n");
}

function pickCashierLabel(profile: ProfileRow | undefined, fallback: string): string {
  const name = String(profile?.full_name ?? "").trim();
  if (name) return name;

  const email = String(profile?.email ?? "").trim();
  if (email) return email;

  return fallback;
}

export async function loadStaffTransactions(filters: StaffTransactionFilters = {}): Promise<StaffTransactionData> {
  const normalizedFilters: Required<StaffTransactionFilters> = {
    q: normalizeFilterValue(filters.q),
    status: normalizeFilterValue(filters.status).toLowerCase(),
    cashier: normalizeFilterValue(filters.cashier),
  };

  if (!isSupabaseConfigured()) {
    return {
      records: [],
      cashiers: [],
      summary: {
        totalRevenue: 0,
        totalOrders: 0,
        deliveredOrders: 0,
        refundedOrders: 0,
        voidedOrders: 0,
        totalItems: 0,
        paymentMethods: [],
      },
      loadError: "Supabase is not configured.",
      filters: normalizedFilters,
    };
  }

  const useAdminClient = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabase = useAdminClient ? createSupabaseAdminClient() : createSupabaseServerClient();
  const loadErrorMessages: string[] = [];

  const [ordersResult, orderItemsResult, paymentsResult, productsResult, profilesResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, customer_name, total_amount, order_status, order_date, created_at")
      .order("order_date", { ascending: false })
      .limit(1000),
    supabase
      .from("order_items")
      .select("order_id, product_id, quantity, unit_price")
      .limit(4000),
    supabase
      .from("payments")
      .select("order_id, method, amount, paid_at, cashier_user_id, reference_no")
      .order("paid_at", { ascending: false })
      .limit(2000),
    supabase.from("products").select("id, sku, product_name").limit(2000),
    useAdminClient
      ? supabase.from("profiles").select("user_id, full_name, email, role").limit(2000)
      : Promise.resolve({ data: [] as ProfileRow[] | null, error: null }),
  ]);

  const orders = (ordersResult.data ?? []) as OrderRow[];
  const orderItems = (orderItemsResult.data ?? []) as OrderItemRow[];
  const payments = (paymentsResult.data ?? []) as PaymentRow[];
  const products = (productsResult.data ?? []) as ProductRow[];
  const profiles = (profilesResult as { data: ProfileRow[] | null; error: unknown }).data ?? [];

  if (ordersResult.error) loadErrorMessages.push(getErrorMessage(ordersResult.error));
  if (orderItemsResult.error) loadErrorMessages.push(getErrorMessage(orderItemsResult.error));
  if (paymentsResult.error) loadErrorMessages.push(getErrorMessage(paymentsResult.error));
  if (productsResult.error) loadErrorMessages.push(getErrorMessage(productsResult.error));
  if ((profilesResult as { error: unknown }).error) loadErrorMessages.push(getErrorMessage((profilesResult as { error: unknown }).error));

  const productById = new Map(products.map((product) => [product.id, product]));
  const itemsByOrderId = new Map<string, StaffTransactionLineItem[]>();

  for (const item of orderItems) {
    const orderId = String(item.order_id ?? "").trim();
    if (!orderId) continue;

    const product = item.product_id ? productById.get(item.product_id) : undefined;
    const sku = String(product?.sku ?? item.product_id ?? "").trim().toUpperCase() || "N/A";
    const name = String(product?.product_name ?? sku).trim() || sku;
    const quantity = Math.max(0, Number(item.quantity ?? 0));
    const unitPrice = Number(item.unit_price ?? 0);
    const lineTotal = Number((quantity * unitPrice).toFixed(2));

    const current = itemsByOrderId.get(orderId) ?? [];
    current.push({ sku, name, quantity, unitPrice, lineTotal });
    itemsByOrderId.set(orderId, current);
  }

  const profileByUserId = new Map<string, ProfileRow>();
  for (const profile of profiles) {
    const userId = normalizeFilterValue(profile.user_id);
    if (!userId) continue;
    profileByUserId.set(userId, profile);
  }

  const paymentByOrderId = new Map<string, PaymentRow>();
  for (const payment of payments) {
    const orderId = normalizeFilterValue(payment.order_id);
    if (!orderId || paymentByOrderId.has(orderId)) continue;
    paymentByOrderId.set(orderId, payment);
  }

  const records: StaffTransactionRecord[] = orders.map((order) => {
    const payment = paymentByOrderId.get(order.id);
    const lineItems = itemsByOrderId.get(order.id) ?? [];
    const cashierUserId = normalizeFilterValue(payment?.cashier_user_id) || null;
    const cashierProfile = cashierUserId ? profileByUserId.get(cashierUserId) : undefined;
    const fallbackCashier = cashierUserId ? `Cashier ${cashierUserId.slice(0, 8).toUpperCase()}` : "Unassigned cashier";
    const cashierName = pickCashierLabel(cashierProfile, fallbackCashier);
    const totalAmountValue = Number(order.total_amount ?? 0);
    const orderDateIso = order.order_date ?? order.created_at ?? null;
    const status = normalizeStatus(order.order_status);
    const orderNumber = String(order.order_number ?? order.id.slice(0, 8).toUpperCase()).trim() || order.id.slice(0, 8).toUpperCase();
    const itemCount = lineItems.reduce((sum, item) => sum + item.quantity, 0);
    const paymentMethod = String(payment?.method ?? "OTHER").trim().toUpperCase() || "OTHER";
    const paymentReference = String(payment?.reference_no ?? "").trim() || null;

    return {
      id: order.id,
      orderId: order.id,
      orderNumber,
      customerName: String(order.customer_name ?? "Walk-in Customer").trim() || "Walk-in Customer",
      amount: formatMoney(totalAmountValue),
      totalAmountValue,
      status,
      date: safeDate(orderDateIso)?.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
      }) ?? "-",
      orderDateIso,
      paymentMethod,
      paymentAmount: Number(payment?.amount ?? totalAmountValue),
      paymentReference,
      cashierUserId,
      cashierName,
      itemCount,
      lineItems,
      searchText: [
        orderNumber,
        order.customer_name ?? "",
        cashierName,
        cashierUserId ?? "",
        paymentMethod,
        paymentReference ?? "",
        status,
        ...lineItems.flatMap((item) => [item.sku, item.name]),
      ]
        .join(" ")
        .toLowerCase(),
    };
  });

  const filteredRecords = records.filter((record) => {
    if (normalizedFilters.status && normalizedFilters.status !== "all") {
      if (record.status.toLowerCase() !== normalizedFilters.status) {
        return false;
      }
    }

    if (normalizedFilters.cashier) {
      const cashierFilter = normalizeCashierKey(normalizedFilters.cashier);
      if (normalizeCashierKey(record.cashierUserId) !== cashierFilter && normalizeCashierKey(record.cashierName) !== cashierFilter) {
        return false;
      }
    }

    if (normalizedFilters.q) {
      const query = normalizedFilters.q.toLowerCase();
      if (!record.searchText.includes(query)) {
        return false;
      }
    }

    return true;
  });

  const totalRevenue = filteredRecords.reduce((sum, item) => sum + item.totalAmountValue, 0);
  const deliveredOrders = filteredRecords.filter((item) => item.status === "Delivered").length;
  const refundedOrders = filteredRecords.filter((item) => item.status === "Refunded").length;
  const voidedOrders = filteredRecords.filter((item) => item.status === "Voided").length;
  const totalItems = filteredRecords.reduce((sum, item) => sum + item.itemCount, 0);

  const paymentSummaryMap = new Map<string, { count: number; amount: number }>();
  for (const record of filteredRecords) {
    const current = paymentSummaryMap.get(record.paymentMethod) ?? { count: 0, amount: 0 };
    current.count += 1;
    current.amount += record.paymentAmount;
    paymentSummaryMap.set(record.paymentMethod, current);
  }

  const cashiersMap = new Map<string, StaffCashierOption>();
  for (const record of records) {
    if (!record.cashierUserId) continue;
    if (cashiersMap.has(record.cashierUserId)) continue;
    cashiersMap.set(record.cashierUserId, {
      userId: record.cashierUserId,
      label: record.cashierName,
    });
  }

  return {
    records: filteredRecords,
    cashiers: Array.from(cashiersMap.values()).sort((a, b) => a.label.localeCompare(b.label)),
    summary: {
      totalRevenue,
      totalOrders: filteredRecords.length,
      deliveredOrders,
      refundedOrders,
      voidedOrders,
      totalItems,
      paymentMethods: Array.from(paymentSummaryMap.entries())
        .sort((a, b) => b[1].amount - a[1].amount)
        .map(([method, summary]) => ({ method, count: summary.count, amount: summary.amount })),
    },
    loadError: loadErrorMessages.length > 0 ? loadErrorMessages[0] : null,
    filters: normalizedFilters,
  };
}
