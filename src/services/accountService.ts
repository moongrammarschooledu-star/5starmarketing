import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Account, AccountInput, AccountType } from "@/lib/models/accounting";

const SELECT = "*, parent:parent_id(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Account {
  return {
    id: row.id,
    accountCode: row.account_code,
    name: row.name,
    accountType: row.account_type,
    parentId: row.parent_id ?? undefined,
    parentName: row.parent?.name ?? undefined,
    description: row.description ?? undefined,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const accountService = {
  async list(type?: AccountType, activeOnly = false): Promise<Account[]> {
    const supabase = await createClient();
    let query = supabase.from("accounts").select(SELECT).order("account_code", { ascending: true });
    if (type) query = query.eq("account_type", type);
    if (activeOnly) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) {
      console.error("accountService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<Account | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("accounts").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: AccountInput): Promise<Account> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("accounts")
      .insert({
        account_code: input.accountCode,
        name: input.name,
        account_type: input.accountType,
        parent_id: input.parentId || null,
        description: input.description || null,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("accountService.create failed:", error);
      throw new Error(error.code === "23505" ? "An account with this code already exists." : "Could not create this account.");
    }
    return mapRow(data);
  },

  async update(id: string, input: Partial<AccountInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.accountCode !== undefined) row.account_code = input.accountCode;
    if (input.name !== undefined) row.name = input.name;
    if (input.accountType !== undefined) row.account_type = input.accountType;
    if (input.parentId !== undefined) row.parent_id = input.parentId || null;
    if (input.description !== undefined) row.description = input.description || null;
    const { error } = await supabase.from("accounts").update(row).eq("id", id);
    if (error) throw new Error("Could not update this account.");
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("accounts").update({ is_active: isActive }).eq("id", id);
    if (error) throw new Error("Could not update this account's status.");
  },
};
