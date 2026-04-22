type ApiErrorLike = {
  error?: unknown;
  requestId?: unknown;
};

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

export function parseApiError(
  response: Response,
  payload: ApiErrorLike | null | undefined,
  fallbackMessage: string,
): string {
  const message = toText(payload?.error).trim();
  const requestId = toText(payload?.requestId).trim();
  const base = message.length > 0 ? message : `${fallbackMessage} (${response.status})`;
  return requestId ? `${base} (Ref: ${requestId})` : base;
}
