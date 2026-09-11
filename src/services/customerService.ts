import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Customer, CustomerProfileInput, CustomerConsentInput, CustomerSummary } from "@/lib/models/customer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Customer {
  return {
    id: row.id,
    fullName: row.full_name ?? "Customer",
    email: row.email ?? "",
    phone: row.phone ?? "",
    whatsapp: row.whatsapp ?? undefined,
    profileImage: row.profile_image ?? undefined,
    disabled: !!row.disabled,
    emailOptIn: row.email_opt_in ?? true,
    whatsappOptIn: row.whatsapp_opt_in ?? true,
    smsOptIn: row.sms_opt_in ?? true,
    marketingOptIn: row.marketing_opt_in ?? true,
    doNotContact: !!row.do_not_contact,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const customerService = {
  /** Null when nobody is logged in, or the logged-in user is an admin
   *  (no customer_profiles row) rather than a customer. */
  async getCurrentCustomer(): Promise<Customer | null> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.from("customer_profiles").select("*").eq("id", user.id).maybeSingle();
    if (error) {
      console.error("customerService.getCurrentCustomer failed:", error);
      return null;
    }
    return data ? mapRow(data) : null;
  },

  async updateProfile(input: CustomerProfileInput): Promise<void> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in.");

    const { error } = await supabase
      .from("customer_profiles")
      .update({
        full_name: input.fullName,
        phone: input.phone,
        whatsapp: input.whatsapp || null,
        profile_image: input.profileImage || null,
      })
      .eq("id", user.id);

    if (error) {
      console.error("customerService.updateProfile failed:", error);
      throw new Error("Could not update your profile.");
    }
  },

  /** Communication preferences (section 32) — a customer opting out here
   *  only affects marketing sends; transactional notifications (deal/
   *  payment/document updates) follow their own separate rules. */
  async updateConsent(input: CustomerConsentInput): Promise<void> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in.");

    const { error } = await supabase
      .from("customer_profiles")
      .update({ email_opt_in: input.emailOptIn, whatsapp_opt_in: input.whatsappOptIn, sms_opt_in: input.smsOptIn, marketing_opt_in: input.marketingOptIn })
      .eq("id", user.id);
    if (error) throw new Error("Could not update your communication preferences.");
  },

  async updateEmail(newEmail: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      console.error("customerService.updateEmail failed:", error);
      throw new Error(error.message || "Could not update your email.");
    }
  },

  async updatePassword(newPassword: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      console.error("customerService.updatePassword failed:", error);
      throw new Error(error.message || "Could not update your password.");
    }
  },

  // ---- Admin-facing (/admin/customers) ----

  async listAll(): Promise<CustomerSummary[]> {
    const supabase = await createClient();
    const [{ data: customers, error: cErr }, { data: favorites }, { data: leads }] = await Promise.all([
      supabase.from("customer_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("favorites").select("user_id"),
      supabase.from("leads").select("customer_id").not("customer_id", "is", null),
    ]);
    if (cErr) {
      console.error("customerService.listAll failed:", cErr);
      throw new Error("Could not load customers.");
    }
    const favCounts = new Map<string, number>();
    for (const f of favorites ?? []) favCounts.set(f.user_id, (favCounts.get(f.user_id) ?? 0) + 1);
    const inquiryCounts = new Map<string, number>();
    for (const l of leads ?? []) {
      if (l.customer_id) inquiryCounts.set(l.customer_id, (inquiryCounts.get(l.customer_id) ?? 0) + 1);
    }
    return (customers ?? []).map((row) => ({
      ...mapRow(row),
      savedPropertiesCount: favCounts.get(row.id) ?? 0,
      inquiryCount: inquiryCounts.get(row.id) ?? 0,
    }));
  },

  async getByIdForAdmin(id: string): Promise<CustomerSummary | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("customer_profiles").select("*").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    const [{ data: favorites }, { data: leads }] = await Promise.all([
      supabase.from("favorites").select("id").eq("user_id", id),
      supabase.from("leads").select("id").eq("customer_id", id),
    ]);
    return {
      ...mapRow(data),
      savedPropertiesCount: favorites?.length ?? 0,
      inquiryCount: leads?.length ?? 0,
    };
  },

  async setDisabled(id: string, disabled: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("customer_profiles").update({ disabled }).eq("id", id);
    if (error) {
      console.error("customerService.setDisabled failed:", error);
      throw new Error("Could not update this customer's account.");
    }
  },

  /** Admin-side Do-Not-Contact toggle (section 61) — blocks non-
   *  essential outbound communication entirely; transactional deal/
   *  payment/document messages are unaffected. */
  async setDoNotContact(id: string, doNotContact: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("customer_profiles").update({ do_not_contact: doNotContact }).eq("id", id);
    if (error) throw new Error("Could not update this customer's Do-Not-Contact status.");
  },
};
