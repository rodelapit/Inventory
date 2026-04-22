import { NextResponse } from "next/server";

export type ApiEnvelope<T> = {
  data: T | null;
  error: string | null;
  requestId: string | null;
  code?: string | null;
};

export function apiSuccess<T>(data: T, requestId?: string | null, status = 200) {
  const payload: ApiEnvelope<T> = {
    data,
    error: null,
    requestId: requestId ?? null,
  };

  return NextResponse.json(payload, { status });
}

export function apiError(
  message: string,
  options?: {
    status?: number;
    requestId?: string | null;
    code?: string | null;
  },
) {
  const payload: ApiEnvelope<null> = {
    data: null,
    error: message,
    requestId: options?.requestId ?? null,
    ...(options?.code ? { code: options.code } : {}),
  };

  return NextResponse.json(payload, {
    status: options?.status ?? 500,
  });
}
