import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/lib/observability/request", () => ({
  startRequestLog: () => ({
    requestId: "req-test",
    route: "/api/pos/checkout",
    action: "pos_transaction",
    userId: null,
    startedAt: Date.now(),
  }),
  logRequestEvent: vi.fn(),
  logRequestError: vi.fn(async () => undefined),
  endRequestLog: vi.fn(),
}));

type MockClient = {
  from: (table: string) => any;
};

let currentClient: MockClient;

vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => currentClient,
}));

function createMockClient() {
  const calls = {
    orderItemsInsert: 0,
    stockMovementsInsert: 0,
    paymentsInsert: 0,
  };

  const orderRecord = {
    id: "order-1",
    order_number: "POS-20260408-120000-1234",
    customer_name: "Counter 1",
    total_amount: 108,
    order_status: "Completed - CASH",
    order_date: new Date().toISOString(),
  };

  const client: MockClient = {
    from(table: string) {
      if (table === "products") {
        return {
          select: () => ({
            in: async () => ({
              data: [
                {
                  id: "prod-1",
                  sku: "SKU-1",
                  product_name: "Sample Product",
                  stock_level: 20,
                  price: 100,
                  status: "In Stock",
                },
              ],
              error: null,
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }

      if (table === "orders") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: orderRecord, error: null }),
            }),
          }),
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: orderRecord, error: null }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }

      if (table === "order_items") {
        return {
          insert: async () => {
            calls.orderItemsInsert += 1;
            return { error: null };
          },
          delete: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }

      if (table === "stock_movements") {
        return {
          insert: async () => {
            calls.stockMovementsInsert += 1;
            return { error: null };
          },
          delete: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }

      if (table === "payments") {
        return {
          insert: async () => {
            calls.paymentsInsert += 1;
            return { error: null };
          },
          delete: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }

      if (table === "promotions") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { times_used: 0 }, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        };
      }

      return {
        insert: async () => ({ error: null }),
        update: () => ({ eq: async () => ({ error: null }) }),
        select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      };
    },
  };

  return { client, calls };
}

describe("POST /api/pos/checkout", () => {
  beforeEach(() => {
    revalidatePath.mockReset();
  });

  it.each<["checkout" | "refund" | "void"]>([["checkout"], ["refund"], ["void"]])("persists audit records for %s", async (action) => {
    const { client, calls } = createMockClient();
    currentClient = client;

    const { POST } = await import("@/app/api/pos/checkout/route");

    const req = new Request("http://localhost/api/pos/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        cashierName: "Counter 1",
        cashierUserId: "user-1",
        paymentMethod: "cash",
        sourceOrderNumber: action === "checkout" ? null : "POS-OLD-1001",
        items: [{ sku: "SKU-1", quantity: 1 }],
      }),
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.orderTable).toBe("orders");
    expect(calls.orderItemsInsert).toBe(1);
    expect(calls.stockMovementsInsert).toBe(1);
    expect(calls.paymentsInsert).toBe(1);
  });
});
