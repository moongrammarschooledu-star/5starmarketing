"use client";

import { useCompare } from "./CompareProvider";
import { StatCard } from "@/components/admin/StatCard";
import { Scale } from "lucide-react";

/** "Compared Properties" is deliberately client-only (localStorage, not a
 *  database record — see the STEP 10 report), so this stat tile renders
 *  after mount rather than as part of the server-rendered dashboard. */
export function ComparedCountBadge() {
  const { ids } = useCompare();
  return <StatCard label="Compared Properties" value={ids.length} icon={Scale} tone="primary" />;
}
