import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient, createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { endRequestLog, logRequestError, logRequestEvent, startRequestLog } from "@/lib/observability/request";

export async function GET() {
  const context = startRequestLog("/api/zones", "zones_list");
  if (!isSupabaseConfigured()) {
    endRequestLog(context, 500);
    return NextResponse.json({ error: "Supabase not configured", data: [], requestId: context.requestId }, { status: 500 });
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("zones")
      .select("id, label, name, capacity, current, temperature, humidity, color")
      .order("id", { ascending: true });

    if (error) {
      console.error("API /api/zones select error", error);
      await logRequestError(context, "zones_list_failed", error);
      endRequestLog(context, 500);
      return NextResponse.json({ error: error.message, data: [], requestId: context.requestId }, { status: 500 });
    }

    logRequestEvent(context, "zones_listed", { count: data?.length ?? 0 } as never);
    endRequestLog(context, 200);
    return NextResponse.json({ data: data ?? [], requestId: context.requestId });
  } catch (err) {
    await logRequestError(context, "zones_list_unexpected", err);
    endRequestLog(context, 500);
    return NextResponse.json({ error: "Unexpected error", data: [], requestId: context.requestId }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const context = startRequestLog("/api/zones", "zones_create");
  try {
    const body = await req.json();

    const id = String(body.id ?? "").trim().toUpperCase();
    const label = String(body.label ?? "").trim() || (id ? `ZONE ${id}` : null);
    const name = String(body.name ?? "").trim();
    const capacityRaw = Number(body.capacity);
    const currentRaw = Number(body.current ?? 0);
    const capacity = Number.isNaN(capacityRaw) || capacityRaw <= 0 ? 1000 : capacityRaw;
    const current = Number.isNaN(currentRaw) || currentRaw < 0 ? 0 : currentRaw;
    const temperature = String(body.temperature ?? "").trim() || null;
    const humidity = String(body.humidity ?? "").trim() || null;
    const color = String(body.color ?? "indigo").trim() || "indigo";

    if (!id || !name) {
      endRequestLog(context, 400);
      return NextResponse.json({ error: "Zone id and name are required", requestId: context.requestId }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      endRequestLog(context, 500);
      return NextResponse.json({ error: "Supabase not configured", requestId: context.requestId }, { status: 500 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("zones")
      .insert({
        id,
        label,
        name,
        capacity,
        current,
        temperature,
        humidity,
        color,
      })
      .select()
      .single();

    if (error) {
      console.error("API /api/zones insert error", error);

      const isRlsError =
        error.code === "42501" ||
        (typeof error.message === "string" && error.message.toLowerCase().includes("row-level security"));

      if (isRlsError) {
        endRequestLog(context, 403);
        return NextResponse.json(
          {
            error:
              "Insert blocked by Supabase RLS. Add SUPABASE_SERVICE_ROLE_KEY to .env.local or create an INSERT policy for your authenticated role.",
            requestId: context.requestId,
          },
          { status: 403 },
        );
      }

      await logRequestError(context, "zones_create_failed", error, { id, label, capacity } as never);
      endRequestLog(context, 500);
      return NextResponse.json({ error: error.message, requestId: context.requestId }, { status: 500 });
    }

    try {
      revalidatePath("/inventory");
    } catch (e) {
      console.error("revalidatePath error for /inventory:", e);
    }

    logRequestEvent(context, "zone_created", { id, capacity, current } as never);
    endRequestLog(context, 200);
    return NextResponse.json({ data, requestId: context.requestId });
  } catch (err) {
    console.error("Unexpected error in POST /api/zones", err);

    if (err instanceof Error && err.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is not configured. Add it to .env.local so server API routes can write zones.",
          requestId: context.requestId,
        },
        { status: 500 },
      );
    }

    await logRequestError(context, "zones_create_unexpected", err);
    endRequestLog(context, 500);
    return NextResponse.json({ error: "Unexpected error", requestId: context.requestId }, { status: 500 });
  }
}
