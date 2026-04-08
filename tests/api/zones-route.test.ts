import { describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));

vi.mock("@/lib/observability/request", () => ({
  startRequestLog: () => ({ requestId: "req-test", route: "/api/zones", action: "zones_create", startedAt: Date.now() }),
  logRequestEvent: vi.fn(),
  logRequestError: vi.fn(async () => undefined),
  endRequestLog: vi.fn(),
}));

const insertSpy = vi.fn(() => ({
  select: () => ({
    single: async () => ({
      data: { id: "A", label: "ZONE A", name: "Ambient", capacity: 1000, current: 100 },
      error: null,
    }),
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => ({
    from: () => ({
      insert: insertSpy,
    }),
  }),
  createSupabaseServerClient: vi.fn(),
}));

describe("POST /api/zones", () => {
  it("creates a zone with normalized id", async () => {
    const { POST } = await import("@/app/api/zones/route");

    const req = new Request("http://localhost/api/zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "a", name: "Ambient", capacity: 1000, current: 100 }),
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(insertSpy).toHaveBeenCalled();
    expect(json.data.id).toBe("A");
  });
});
