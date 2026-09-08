import { serviceService } from "@/services/serviceService";
import { ServicesManager } from "@/components/admin/ServicesManager";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const services = await serviceService.list();
  return <ServicesManager services={services} />;
}
