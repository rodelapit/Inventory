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
