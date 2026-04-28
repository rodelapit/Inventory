import { requireStaffSession } from "@/lib/auth/session";
import { StaffProfileView } from "../../../../components/dashboard/staff/StaffWorkspace";

export const dynamic = "force-dynamic";

export default async function StaffProfilePage() {
  const session = await requireStaffSession();
  return <StaffProfileView userId={session.userId} email={session.email} role={session.role} />;
}
