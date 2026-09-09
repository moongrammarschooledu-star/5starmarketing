"use server";

import { propertyService } from "@/services/propertyService";
import type { Property } from "@/lib/models/property";

/** Public — comparison is available to anonymous visitors too. Ids come
 *  from the visitor's own localStorage list, so this just resolves them
 *  to real property data (silently skipping any that no longer exist). */
export async function getComparePropertiesAction(ids: string[]): Promise<Property[]> {
  const properties = await Promise.all(ids.map((id) => propertyService.getById(id)));
  return properties.filter((p): p is Property => !!p);
}
