"use server";

import { revalidatePath } from "next/cache";
import { teamService } from "@/services/teamService";
import { profileService } from "@/services/profileService";
import { assignableRoles, canManageRole } from "@/lib/permissions";
import type { TeamMemberInput, TeamMemberUpdateInput, AdminAvailability, AdminRole, AdminAccountStatus } from "@/lib/models/user";

function revalidateAll(id?: string) {
  revalidatePath("/admin/team");
  if (id) revalidatePath(`/admin/team/${id}`);
}

/** The signed-in staff member, or an error message when they may not manage this account.
 *  `targetId` is the account being changed; `newRole` the role it would get. */
async function authorize(targetId?: string, newRole?: AdminRole): Promise<{ ok: true; actorId: string } | { ok: false; error: string }> {
  const actor = await profileService.getCurrentAdmin();
  if (!actor) return { ok: false, error: "Please sign in again." };
  if (newRole && !assignableRoles(actor.role).includes(newRole)) {
    return { ok: false, error: "You are not allowed to give this role." };
  }
  if (targetId && targetId !== actor.id) {
    const target = await teamService.getById(targetId);
    if (!target) return { ok: false, error: "This team member was not found." };
    if (!canManageRole(actor.role, target.role)) {
      return { ok: false, error: "You are not allowed to change this account. Only a Super Admin can." };
    }
  }
  if (!targetId && assignableRoles(actor.role).length === 0) {
    return { ok: false, error: "You are not allowed to add team members." };
  }
  return { ok: true, actorId: actor.id };
}

export async function createTeamMemberAction(input: TeamMemberInput) {
  const allowed = await authorize(undefined, input.role);
  if (!allowed.ok) throw new Error(allowed.error);
  const result = await teamService.create(input);
  revalidateAll();
  return result;
}

export interface CreateTeamMemberFormState {
  error?: string;
  tempPassword?: string;
  memberName?: string;
}

/** Form-friendly wrapper around teamService.create() for the
 *  /admin/team/create page's useActionState form. */
export async function createTeamMemberFormAction(
  _prevState: CreateTeamMemberFormState,
  formData: FormData
): Promise<CreateTeamMemberFormState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "sales_agent") as AdminRole;
  const status = String(formData.get("status") ?? "Active") as AdminAccountStatus;
  const phone = String(formData.get("phone") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const profileImage = String(formData.get("profileImage") ?? "").trim();
  const specialization = String(formData.get("specialization") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (!fullName || !email) return { error: "Full name and email are required." };
  const allowed = await authorize(undefined, role);
  if (!allowed.ok) return { error: allowed.error };

  try {
    const { user, tempPassword } = await teamService.create({
      fullName,
      email,
      role,
      status,
      phone: phone || undefined,
      whatsapp: whatsapp || undefined,
      profileImage: profileImage || undefined,
      specialization: specialization || undefined,
      bio: bio || undefined,
    });
    revalidateAll();
    return { tempPassword, memberName: user.name };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create this team member." };
  }
}

export async function updateTeamMemberAction(id: string, input: TeamMemberUpdateInput) {
  const allowed = await authorize(id, input.role);
  if (!allowed.ok) throw new Error(allowed.error);
  await teamService.update(id, input);
  revalidateAll(id);
}

export async function setTeamMemberStatusAction(id: string, status: "Active" | "Inactive"): Promise<{ ok: boolean; error?: string }> {
  const allowed = await authorize(id);
  if (!allowed.ok) return { ok: false, error: allowed.error };
  if (id === allowed.actorId && status === "Inactive") return { ok: false, error: "You cannot switch off your own account." };
  try {
    await teamService.setStatus(id, status);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update this team member." };
  }
  revalidateAll(id);
  return { ok: true };
}

export async function setTeamMemberAvailabilityAction(id: string, availability: AdminAvailability) {
  const allowed = await authorize(id);
  if (!allowed.ok) throw new Error(allowed.error);
  await teamService.setAvailability(id, availability);
  revalidateAll(id);
  revalidatePath("/agent/dashboard");
}
