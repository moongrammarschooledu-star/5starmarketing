import { servicesRepository } from "@/lib/repositories/services.repository";
import { ServicesManager } from "@/components/admin/ServicesManager";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const services = await servicesRepository.list();
  return <ServicesManager services={services} />;
}
