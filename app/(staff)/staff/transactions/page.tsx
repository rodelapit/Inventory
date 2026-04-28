import { requireStaffSession } from "@/lib/auth/session";
import { StaffTransactionsView } from "../../../../components/dashboard/staff/StaffTransactionsView";
import { loadStaffTransactions } from "@/lib/staff/transactions";

export const dynamic = "force-dynamic";

type StaffTransactionsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    cashier?: string;
    receipt?: string;
  }>;
};

export default async function StaffTransactionsPage({ searchParams }: StaffTransactionsPageProps) {
  await requireStaffSession();

  const params = await searchParams;
  const data = await loadStaffTransactions({
    q: params?.q ?? "",
    status: params?.status ?? "all",
    cashier: params?.cashier ?? "",
  });

  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.status) query.set("status", params.status);
  if (params?.cashier) query.set("cashier", params.cashier);
  const exportHref = `/api/staff/transactions/export${query.toString().length > 0 ? `?${query.toString()}` : ""}`;

  return (
    <StaffTransactionsView
      data={data}
      exportHref={exportHref}
      receiptHrefBase="/staff/transactions"
      selectedReceipt={params?.receipt ?? null}
    />
  );
}
