// Lucide icon name kept as a string (not a component reference) so this
// model stays plain data — safe to serialize and later store in a database.
export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type ServiceInput = Omit<Service, "id" | "createdAt" | "updatedAt">;

export const serviceIconOptions = [
  "Home",
  "Wallet",
  "TrendingUp",
  "Building2",
  "Landmark",
  "HardHat",
  "Users",
  "ClipboardCheck",
] as const;
