/** The property/project OWNER's private details - for the team's own
 *  reference only. Deliberately NOT part of the Property/Project models:
 *  those are read by public pages, brochures, social posts, structured
 *  data and the public AI assistant, so a field added there could leak.
 *  These live in their own staff-only table (see owner_private_details). */
export interface OwnerDetails {
  name: string;
  phone: string;
  altPhone: string;
  address: string;
  notes: string;
}

export const emptyOwnerDetails: OwnerDetails = { name: "", phone: "", altPhone: "", address: "", notes: "" };

export function hasAnyOwnerDetail(o: OwnerDetails) {
  return Object.values(o).some((v) => v.trim() !== "");
}

/** Reads the owner fields from the admin property/project form. */
export function readOwnerDetails(formData: FormData): OwnerDetails {
  const get = (name: string) => String(formData.get(name) ?? "").trim();
  return {
    name: get("ownerName"),
    phone: get("ownerPhone"),
    altPhone: get("ownerAltPhone"),
    address: get("ownerAddress"),
    notes: get("ownerNotes"),
  };
}
