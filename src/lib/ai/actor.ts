import "server-only";
import { profileService } from "@/services/profileService";
import { customerService } from "@/services/customerService";
import { canAccess, assistantSectionFor } from "@/lib/permissions";
import type { AiActor, AssistantType } from "@/lib/models/ai";

export class AiAuthError extends Error {}

/** Resolves who is actually making this request, straight from the
 *  server-side Supabase session — NEVER trust a client-supplied actor
 *  id/role. Also checks that this admin's role is even allowed to use
 *  the given assistant type's underlying module. */
export async function resolveAdminActor(assistantType: AssistantType): Promise<AiActor> {
  const admin = await profileService.getCurrentAdmin();
  if (!admin) throw new AiAuthError("Not authenticated.");
  const section = assistantSectionFor(assistantType);
  if (!canAccess(admin.role, section)) {
    throw new AiAuthError("Your role is not authorized to use this assistant.");
  }
  return { kind: "admin", id: admin.id, name: admin.name, role: admin.role };
}

export async function resolveCustomerActor(): Promise<AiActor> {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) throw new AiAuthError("Not authenticated.");
  return { kind: "customer", id: customer.id, name: customer.fullName };
}
