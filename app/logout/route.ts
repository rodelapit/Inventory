import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth/session";

function toLogin(req: Request) {
  return NextResponse.redirect(new URL("/login", req.url));
}

export async function POST(req: Request) {
  await clearSessionCookies();
  return toLogin(req);
}

export async function GET(req: Request) {
  await clearSessionCookies();
  return toLogin(req);
}
