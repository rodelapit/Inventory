type Primitive = string | number | boolean | null | undefined;

export type LogDetails = Record<string, Primitive | Primitive[] | Record<string, Primitive>>;

export type RequestLogContext = {
  requestId: string;
  route: string;
  action: string;
  userId?: string | null;
  startedAt: number;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (error && typeof error === "object") {
    const maybeError = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };

    const message =
      typeof maybeError.message === "string" && maybeError.message.trim().length > 0
        ? maybeError.message
        : null;
    const code = typeof maybeError.code === "string" ? maybeError.code : null;
    const details = typeof maybeError.details === "string" ? maybeError.details : null;
    const hint = typeof maybeError.hint === "string" ? maybeError.hint : null;

    const parts = [message, code ? `code=${code}` : null, details, hint].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(" | ");
    }

    try {
      return JSON.stringify(error);
    } catch {
      // fall through to String conversion
    }
  }

  return String(error ?? "Unknown error");
}

function nowIso(): string {
  return new Date().toISOString();
}

function writeLog(level: "info" | "error", payload: Record<string, unknown>) {
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
}

export function startRequestLog(route: string, action: string, userId?: string | null): RequestLogContext {
  return {
    requestId: crypto.randomUUID(),
    route,
    action,
    userId: userId ?? null,
    startedAt: Date.now(),
  };
}

export function logRequestEvent(context: RequestLogContext, event: string, details?: LogDetails) {
  writeLog("info", {
    ts: nowIso(),
    level: "info",
    requestId: context.requestId,
    route: context.route,
    action: context.action,
    userId: context.userId ?? null,
    event,
    details: details ?? {},
  });
}

export async function logRequestError(
  context: RequestLogContext,
  event: string,
  error: unknown,
  details?: LogDetails,
) {
  const payload = {
    ts: nowIso(),
    level: "error",
    requestId: context.requestId,
    route: context.route,
    action: context.action,
    userId: context.userId ?? null,
    event,
    error: toErrorMessage(error),
    details: details ?? {},
  };

  writeLog("error", payload);
  await sendErrorAlert(payload);
}

export function endRequestLog(context: RequestLogContext, status: number, details?: LogDetails) {
  logRequestEvent(context, "request_completed", {
    durationMs: Date.now() - context.startedAt,
    status,
    ...(details ?? {}),
  });
}

async function sendErrorAlert(payload: Record<string, unknown>) {
  const webhook = process.env.OBS_ALERT_WEBHOOK_URL;
  if (!webhook) return;

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    writeLog("error", {
      ts: nowIso(),
      level: "error",
      event: "alert_dispatch_failed",
      error: toErrorMessage(error),
    });
  }
}
