import { supportDepartmentService } from "@/services/supportDepartmentService";
import { teamService } from "@/services/teamService";
import { requireSection } from "@/lib/guard";
import { DepartmentManager } from "@/components/support/DepartmentManager";
import type { SupportDepartmentStaffMember } from "@/lib/models/support";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  await requireSection("support");
  const [departments, team] = await Promise.all([supportDepartmentService.list(), teamService.list()]);
  const staffByDept: Record<string, SupportDepartmentStaffMember[]> = {};
  await Promise.all(
    departments.map(async (d) => {
      staffByDept[d.id] = await supportDepartmentService.listStaff(d.id);
    })
  );

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Departments</h1>
      <p className="mt-1 text-sm text-muted">A department is led by any existing team member — no separate role required.</p>
      <div className="mt-6">
        <DepartmentManager departments={departments} staffByDept={staffByDept} admins={team.map((t) => ({ id: t.id, name: t.name }))} />
      </div>
    </div>
  );
}
