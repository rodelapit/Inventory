import { requireStaffSession } from "@/lib/auth/session";
import { getAdminPerformanceData } from "@/lib/dashboard/get-admin-performance-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { StaffAlertsView } from "../../../../components/dashboard/staff/StaffWorkspace";

export const dynamic = "force-dynamic";

export default async function StaffAlertsPage() {
  await requireStaffSession();

  const performanceData = await getAdminPerformanceData();
  const liveDataUnavailable = !isSupabaseConfigured();
  return <StaffAlertsView performanceData={performanceData} liveDataUnavailable={liveDataUnavailable} />;
}
