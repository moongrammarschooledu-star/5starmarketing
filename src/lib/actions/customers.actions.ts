"use server";

import { revalidatePath } from "next/cache";
import { customerService } from "@/services/customerService";
import { activityService } from "@/services/activityService";

export async function setCustomerDisabledAction(id: string, disabled: boolean) {
  try {
    await customerService.setDisabled(id, disabled);
    await activityService.log(disabled ? "Disabled Customer Account" : "Enabled Customer Account", id, "customer", id);
    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${id}`);
  } catch (e) {
    console.error("setCustomerDisabledAction failed:", e);
    throw e;
  }
}
