import "server-only";
import type { Inquiry, InquiryInput } from "@/lib/models/inquiry";
import { globalStore } from "./global-store";

const store = globalStore<Inquiry[]>("inquiries", seed);

function seed(): Inquiry[] {
  const day = (offset: number) =>
    new Date(Date.now() - offset * 86400000).toISOString();
  const base: Omit<Inquiry, "createdAt" | "updatedAt">[] = [
    {
      id: "inq-1",
      name: "Ahmed Raza",
      phone: "0300-1234567",
      email: "ahmed.raza@example.com",
      propertyId: "premium-house-johar-town",
      propertyTitle: "Premium Residential House",
      message: "Assalam-o-Alaikum, I am interested in Premium Residential House. Please share complete details.",
      source: "WhatsApp",
      status: "New",
    },
    {
      id: "inq-2",
      name: "Sana Malik",
      phone: "0321-9876543",
      email: "sana.malik@example.com",
      propertyId: "residential-plot-lda-society",
      propertyTitle: "Residential Plot",
      message: "Is this plot still available? Interested in cash purchase.",
      source: "Contact Form",
      status: "Contacted",
    },
    {
      id: "inq-3",
      name: "Bilal Hussain",
      phone: "0333-4567890",
      propertyTitle: "Commercial Property",
      message: "Looking for a commercial space for a retail outlet in Johar Town.",
      source: "Website",
      status: "Follow-up",
    },
  ];
  return base.map((b, i) => ({ ...b, createdAt: day(base.length - i), updatedAt: day(base.length - i) }));
}

export const inquiriesRepository = {
  async list(): Promise<Inquiry[]> {
    return [...store.get()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
  async listRecent(limit = 5): Promise<Inquiry[]> {
    return (await this.list()).slice(0, limit);
  },
  async getById(id: string): Promise<Inquiry | undefined> {
    return store.get().find((i) => i.id === id);
  },
  async create(input: InquiryInput): Promise<Inquiry> {
    const now = new Date().toISOString();
    const inquiry: Inquiry = {
      ...input,
      status: input.status ?? "New",
      id: `inq-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    store.set([inquiry, ...store.get()]);
    return inquiry;
  },
  async updateStatus(id: string, status: Inquiry["status"]): Promise<Inquiry | undefined> {
    let updated: Inquiry | undefined;
    store.set(
      store.get().map((i) => {
        if (i.id !== id) return i;
        updated = { ...i, status, updatedAt: new Date().toISOString() };
        return updated;
      })
    );
    return updated;
  },
  async remove(id: string): Promise<boolean> {
    const before = store.get().length;
    store.set(store.get().filter((i) => i.id !== id));
    return store.get().length < before;
  },
  async stats() {
    const all = store.get();
    return {
      total: all.length,
      new: all.filter((i) => i.status === "New").length,
    };
  },
};
