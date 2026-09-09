import { serviceService } from "@/services/serviceService";
import { ServicesManager } from "@/components/admin/ServicesManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  await requireSection("services");
  const services = await serviceService.list();
  return <ServicesManager services={services} />;
}
