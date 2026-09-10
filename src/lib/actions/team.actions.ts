"use server";

import { revalidatePath } from "next/cache";
import { teamService } from "@/services/teamService";
import type { TeamMemberInput, TeamMemberUpdateInput, AdminAvailability, AdminRole, AdminAccountStatus } from "@/lib/models/user";

function revalidateAll(id?: string) {
  revalidatePath("/admin/team");
  if (id) revalidatePath(`/admin/team/${id}`);
}

export async function createTeamMemberAction(input: TeamMemberInput) {
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
  await teamService.update(id, input);
  revalidateAll(id);
}

export async function setTeamMemberStatusAction(id: string, status: "Active" | "Inactive") {
  await teamService.setStatus(id, status);
  revalidateAll(id);
}

export async function setTeamMemberAvailabilityAction(id: string, availability: AdminAvailability) {
  await teamService.setAvailability(id, availability);
  revalidateAll(id);
  revalidatePath("/agent/dashboard");
}
