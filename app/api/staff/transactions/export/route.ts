import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { getCurrentSessionUser } from "@/lib/auth/session";
import { buildStaffTransactionsCsv, loadStaffTransactions } from "@/lib/staff/transactions";

export async function GET(req: Request) {
  const session = await getCurrentSessionUser();
  if (!session || session.role !== "staff") {
    return apiError("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const data = await loadStaffTransactions({
    q: url.searchParams.get("q") ?? "",
    status: url.searchParams.get("status") ?? "",
    cashier: url.searchParams.get("cashier") ?? "",
  });

  const csv = buildStaffTransactionsCsv(data);
  const dateLabel = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=staff-transactions-${dateLabel}.csv`,
      "Cache-Control": "no-store",
    },
  });
}
