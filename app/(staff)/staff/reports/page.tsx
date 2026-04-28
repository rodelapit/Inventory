import { requireStaffSession } from "@/lib/auth/session";
import { getAdminPerformanceData } from "@/lib/dashboard/get-admin-performance-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { StaffReportsView } from "../../../../components/dashboard/staff/StaffWorkspace";

export const dynamic = "force-dynamic";

export default async function StaffReportsPage() {
  await requireStaffSession();

  const performanceData = await getAdminPerformanceData();
  const liveDataUnavailable = !isSupabaseConfigured();
  return <StaffReportsView performanceData={performanceData} liveDataUnavailable={liveDataUnavailable} />;
}
