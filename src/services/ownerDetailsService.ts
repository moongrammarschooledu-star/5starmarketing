import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasAnyOwnerDetail, type OwnerDetails } from "@/lib/models/ownerDetails";

// The ONLY place that touches owner_private_details. Nothing public (site
// pages, brochures, social posts, JSON-LD, the public AI assistant) may
// import this - it exists for the admin edit forms and their save actions.
// The table itself is staff-only at the database level (RLS), so even a
// direct API call with the public key returns nothing.

type Target = { column: "property_id" | "project_id"; id: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): OwnerDetails {
  return {
    name: row.owner_name ?? "",
    phone: row.owner_phone ?? "",
    altPhone: row.owner_alt_phone ?? "",
    address: row.owner_address ?? "",
    notes: row.notes ?? "",
  };
}

async function get(target: Target): Promise<OwnerDetails | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("owner_private_details").select("*").eq(target.column, target.id).maybeSingle();
  if (error) {
    console.error("ownerDetailsService.get failed:", error);
    throw new Error("Could not load the owner details.");
  }
  return data ? mapRow(data) : undefined;
}

async function save(target: Target, input: OwnerDetails): Promise<void> {
  const supabase = await createClient();

  // Clearing every field removes the row rather than keeping an empty one.
  if (!hasAnyOwnerDetail(input)) {
    const { error } = await supabase.from("owner_private_details").delete().eq(target.column, target.id);
    if (error) {
      console.error("ownerDetailsService.save (clear) failed:", error);
      throw new Error("Could not save the owner details.");
    }
    return;
  }

  const orNull = (v: string) => v.trim() || null;
  const { error } = await supabase.from("owner_private_details").upsert(
    {
      [target.column]: target.id,
      owner_name: orNull(input.name),
      owner_phone: orNull(input.phone),
      owner_alt_phone: orNull(input.altPhone),
      owner_address: orNull(input.address),
      notes: orNull(input.notes),
    },
    { onConflict: target.column }
  );
  if (error) {
    console.error("ownerDetailsService.save failed:", error);
    throw new Error("Could not save the owner details.");
  }
}

export const ownerDetailsService = {
  getForProperty: (propertyId: string) => get({ column: "property_id", id: propertyId }),
  getForProject: (projectId: string) => get({ column: "project_id", id: projectId }),
  saveForProperty: (propertyId: string, input: OwnerDetails) => save({ column: "property_id", id: propertyId }, input),
  saveForProject: (projectId: string, input: OwnerDetails) => save({ column: "project_id", id: projectId }, input),
};
