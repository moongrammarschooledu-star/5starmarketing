import "server-only";
import type { Service, ServiceInput } from "@/lib/models/service";
import { globalStore } from "./global-store";

const store = globalStore<Service[]>("services", seed);

function seed(): Service[] {
  const now = new Date("2026-01-15").toISOString();
  const base: Omit<Service, "createdAt" | "updatedAt">[] = [
    {
      id: "property-buying",
      title: "Property Buying",
      description:
        "Guided assistance to help you find and purchase the right house, flat or plot with confidence.",
      icon: "Home",
      enabled: true,
      order: 1,
    },
    {
      id: "property-selling",
      title: "Property Selling",
      description: "Professional support to market and sell your property to serious, qualified buyers.",
      icon: "Wallet",
      enabled: true,
      order: 2,
    },
    {
      id: "property-investment",
      title: "Property Investment",
      description:
        "Practical guidance on property as a long-term investment opportunity in Lahore's growing market.",
      icon: "TrendingUp",
      enabled: true,
      order: 3,
    },
    {
      id: "residential-properties",
      title: "Residential Properties",
      description: "Houses, flats and residential plots across Lahore, including LDA-approved societies.",
      icon: "Building2",
      enabled: true,
      order: 4,
    },
    {
      id: "commercial-properties",
      title: "Commercial Properties",
      description: "Retail, office and commercial spaces suited to your business needs and budget.",
      icon: "Landmark",
      enabled: true,
      order: 5,
    },
    {
      id: "construction-services",
      title: "Construction Services",
      description: "Reliable construction and building solutions, from planning through to completion.",
      icon: "HardHat",
      enabled: true,
      order: 6,
    },
    {
      id: "property-consultancy",
      title: "Property Consultancy",
      description:
        "Honest, transparent advice at every step of your property buying, selling or investment journey.",
      icon: "Users",
      enabled: true,
      order: 7,
    },
    {
      id: "monthly-installment-options",
      title: "Monthly Installment Options",
      description: "Flexible payment structures, including cash and easy monthly installment plans.",
      icon: "ClipboardCheck",
      enabled: true,
      order: 8,
    },
  ];
  return base.map((s) => ({ ...s, createdAt: now, updatedAt: now }));
}

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  let id = base || "service";
  let n = 1;
  while (store.get().some((s) => s.id === id)) id = `${base}-${++n}`;
  return id;
}

export const servicesRepository = {
  async list(): Promise<Service[]> {
    return [...store.get()].sort((a, b) => a.order - b.order);
  },
  async listEnabled(): Promise<Service[]> {
    return (await this.list()).filter((s) => s.enabled);
  },
  async getById(id: string): Promise<Service | undefined> {
    return store.get().find((s) => s.id === id);
  },
  async create(input: ServiceInput): Promise<Service> {
    const now = new Date().toISOString();
    const service: Service = { ...input, id: slugify(input.title), createdAt: now, updatedAt: now };
    store.set([...store.get(), service]);
    return service;
  },
  async update(id: string, input: Partial<ServiceInput>): Promise<Service | undefined> {
    let updated: Service | undefined;
    store.set(
      store.get().map((s) => {
        if (s.id !== id) return s;
        updated = { ...s, ...input, updatedAt: new Date().toISOString() };
        return updated;
      })
    );
    return updated;
  },
  async remove(id: string): Promise<boolean> {
    const before = store.get().length;
    store.set(store.get().filter((s) => s.id !== id));
    return store.get().length < before;
  },
};
