"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Sync-only (sections 45/46) — subscribes to property_inventory
 *  changes scoped to ONE project (never the whole table, to avoid
 *  subscribing every viewer to every unit — section 61) and just
 *  triggers a server re-fetch. The database's own conditional-update
 *  guards inside inventoryService remain the only source of truth for
 *  whether a reservation/booking actually succeeded — this component
 *  never assumes otherwise, it only keeps the screen from going stale. */
export function InventoryRealtimeRefresher({ projectId }: { projectId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`inventory-project-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "property_inventory", filter: `project_id=eq.${projectId}` }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, router]);

  return null;
}
