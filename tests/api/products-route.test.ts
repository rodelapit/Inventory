import { describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));

vi.mock("@/lib/auth/session", () => ({
  getCurrentSessionUser: vi.fn(async () => ({
    userId: "user-1",
    email: "admin@example.com",
    role: "admin",
    accessToken: "token",
  })),
}));

vi.mock("@/lib/observability/request", () => ({
  startRequestLog: () => ({ requestId: "req-test", route: "/api/products", action: "products_adjust_stock", startedAt: Date.now() }),
  logRequestEvent: vi.fn(),
  logRequestError: vi.fn(async () => undefined),
  endRequestLog: vi.fn(),
}));

const updateSpy = vi.fn(() => ({
  eq: () => ({
    select: () => ({
      single: async () => ({ data: { sku: "SKU-1", stock_level: 12, status: "In Stock" }, error: null }),
    }),
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => ({
    from: () => ({
      update: updateSpy,
    }),
  }),
  createSupabaseServerClient: vi.fn(),
}));

describe("PATCH /api/products", () => {
  it("updates stock level and normalized status", async () => {
    const { PATCH } = await import("@/app/api/products/route");

    const req = new Request("http://localhost/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku: "SKU-1", stockLevel: 12 }),
    });

    const response = await PATCH(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith({ stock_level: 12, status: "In Stock" });
    expect(json.data.stock_level).toBe(12);
  });
});
