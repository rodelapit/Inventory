import { getDashboardData } from "../../../lib/dashboard/get-dashboard-data";
import { requireStaffSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { StaffDashboardView } from "../../../components/dashboard/staff/StaffWorkspace";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  await requireStaffSession();

  const dashboardData = await getDashboardData();
  const liveDataUnavailable = !isSupabaseConfigured();

  return <StaffDashboardView dashboardData={dashboardData} liveDataUnavailable={liveDataUnavailable} />;
}
