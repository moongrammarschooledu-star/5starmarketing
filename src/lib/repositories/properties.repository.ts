import "server-only";
import type { Property, PropertyInput } from "@/lib/models/property";
import { globalStore } from "./global-store";

// In-memory store, seeded on first import. This is a real, working data
// layer — every admin CRUD action here actually mutates this array and the
// public site reads from the same store — but it lives in server process
// memory, so it resets on redeploys and isn't shared across serverless
// instances. Swap the function bodies below for Supabase calls in STEP 4;
// every function already has the async, ID-based shape a real DB needs, so
// nothing that imports this repository has to change.

const store = globalStore<Property[]>("properties", seed);

function seed(): Property[] {
  const now = new Date("2026-01-15").toISOString();
  const base: Omit<Property, "createdAt" | "updatedAt">[] = [
    {
      id: "premium-house-johar-town",
      title: "Premium Residential House",
      type: "House",
      purpose: "For Sale",
      location: "Johar Town, Lahore",
      locationArea: "Johar Town",
      size: "10 Marla",
      sizeCategory: "10 Marla",
      price: "PKR 2.5 Crore",
      priceValue: 25000000,
      paymentOption: "Cash / Installments",
      status: "Available",
      featured: true,
      images: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop",
      ],
      description:
        "A spacious, well-designed residential house in a prime Johar Town location, ideal for families looking for comfort and long-term value.",
      features: [
        "5 Bedrooms with attached baths",
        "Modern fitted kitchen",
        "Separate servant quarter",
        "Covered car porch (2 cars)",
        "Lawn / front garden",
      ],
      amenities: [
        "24/7 security in the block",
        "Mosque nearby",
        "Park within walking distance",
        "Easy main-road access",
      ],
    },
    {
      id: "modern-family-home-lahore",
      title: "Modern Family Home",
      type: "House",
      purpose: "For Sale",
      location: "Lahore",
      locationArea: "Lahore",
      size: "5 Marla",
      sizeCategory: "5 Marla",
      price: "PKR 1.4 Crore",
      priceValue: 14000000,
      paymentOption: "Cash",
      status: "Available",
      featured: true,
      images: [
        "https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1600607687644-c7171b42498f?q=80&w=1200&auto=format&fit=crop",
      ],
      description:
        "A modern, practical family home with quality construction and easy access to main city routes.",
      features: [
        "3 Bedrooms with attached baths",
        "Open-plan lounge and dining",
        "Fitted kitchen with storage",
        "Rooftop / terrace access",
      ],
      amenities: ["Gated street", "Close to schools", "Close to main market"],
    },
    {
      id: "residential-plot-lda-society",
      title: "Residential Plot",
      type: "Residential Plot",
      purpose: "Investment",
      location: "LDA-Approved Society, Lahore",
      locationArea: "Lahore",
      size: "5 Marla",
      sizeCategory: "5 Marla",
      price: "PKR 65 Lac",
      priceValue: 6500000,
      paymentOption: "Installments",
      status: "Available",
      featured: true,
      images: [
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1628744448840-55bdb2497bd4?q=80&w=1200&auto=format&fit=crop",
      ],
      description:
        "A residential plot in an LDA-approved society, well-suited for building your own home or as a long-term property investment.",
      features: ["Clear, developed plot", "Ready for construction", "Corner-option availability"],
      amenities: ["LDA-approved society", "Underground electricity", "Wide carpeted streets"],
    },
    {
      id: "luxury-apartment-lahore",
      title: "Luxury Apartment",
      type: "Flat",
      purpose: "For Sale",
      location: "Lahore",
      locationArea: "Lahore",
      size: "3 Bed",
      sizeCategory: "Custom",
      price: "PKR 95 Lac",
      priceValue: 9500000,
      paymentOption: "Cash / Installments",
      status: "Available",
      featured: false,
      images: [
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1200&auto=format&fit=crop",
      ],
      description:
        "A well-appointed apartment offering a comfortable, low-maintenance lifestyle in a convenient Lahore location.",
      features: ["3 Bedrooms", "Modern kitchen", "Elevator access", "Reserved parking"],
      amenities: ["Backup generator", "On-site security guard", "Close to main boulevard"],
    },
    {
      id: "commercial-space-johar-town",
      title: "Commercial Property",
      type: "Commercial Property",
      purpose: "Investment",
      location: "Johar Town, Lahore",
      locationArea: "Johar Town",
      size: "4 Marla",
      sizeCategory: "Custom",
      price: "PKR 3.2 Crore",
      priceValue: 32000000,
      paymentOption: "Cash",
      status: "Available",
      featured: true,
      images: [
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop",
      ],
      description:
        "A commercial space suited for retail or office use, positioned in a busy, high-visibility area of Lahore.",
      features: ["Ground + 1 construction", "Wide frontage", "Dedicated parking space"],
      amenities: ["High foot traffic area", "Main-road visibility", "Close to public transport"],
    },
    {
      id: "corner-plot-1-kanal",
      title: "Corner Residential Plot",
      type: "Residential Plot",
      purpose: "For Sale",
      location: "Other Locations",
      locationArea: "Other Locations",
      size: "1 Kanal",
      sizeCategory: "1 Kanal",
      price: "PKR 1.1 Crore",
      priceValue: 11000000,
      paymentOption: "Installments",
      status: "Available",
      featured: false,
      images: [
        "https://images.unsplash.com/photo-1628744448840-55bdb2497bd4?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1200&auto=format&fit=crop",
      ],
      description:
        "A generous 1 Kanal corner plot, well-suited for a large family home or a long-term land investment.",
      features: ["Corner location", "Two-side road access", "Clear title"],
      amenities: ["Developed society", "Close to main highway"],
    },
    {
      id: "family-flat-for-rent",
      title: "Family Flat for Rent",
      type: "Flat",
      purpose: "For Rent",
      location: "Johar Town, Lahore",
      locationArea: "Johar Town",
      size: "3 Marla",
      sizeCategory: "3 Marla",
      price: "PKR 65,000 / month",
      paymentOption: "Cash",
      status: "Available",
      featured: false,
      images: [
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop",
      ],
      description:
        "A comfortable family flat available for rent in a convenient Johar Town location, close to markets and schools.",
      features: ["2 Bedrooms", "Furnished kitchen", "Balcony"],
      amenities: ["Close to schools", "Close to main market", "Backup generator"],
    },
    {
      id: "compact-house-3-marla",
      title: "Compact House",
      type: "House",
      purpose: "For Sale",
      location: "Other Locations",
      locationArea: "Other Locations",
      size: "3 Marla",
      sizeCategory: "3 Marla",
      price: "PKR 78 Lac",
      priceValue: 7800000,
      paymentOption: "Cash / Installments",
      status: "Reserved",
      featured: false,
      images: [
        "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1600607687644-c7171b42498f?q=80&w=1200&auto=format&fit=crop",
      ],
      description:
        "A compact, efficiently designed house, a practical option for a small family or as a starter home.",
      features: ["2 Bedrooms", "Kitchen and lounge", "Rooftop space"],
      amenities: ["Quiet residential street", "Close to public transport"],
    },
  ];

  return base.map((p) => ({ ...p, createdAt: now, updatedAt: now }));
}

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  let id = base || "property";
  let n = 1;
  while (store.get().some((p) => p.id === id)) {
    id = `${base}-${++n}`;
  }
  return id;
}

export const propertiesRepository = {
  async list(): Promise<Property[]> {
    return [...store.get()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async listFeatured(limit = 3): Promise<Property[]> {
    return (await this.list()).filter((p) => p.featured && p.status !== "Inactive").slice(0, limit);
  },

  async getById(id: string): Promise<Property | undefined> {
    return store.get().find((p) => p.id === id);
  },

  async create(input: PropertyInput): Promise<Property> {
    const now = new Date().toISOString();
    const property: Property = {
      ...input,
      id: slugify(input.title),
      createdAt: now,
      updatedAt: now,
    };
    store.set([property, ...store.get()]);
    return property;
  },

  async update(id: string, input: Partial<PropertyInput>): Promise<Property | undefined> {
    let updated: Property | undefined;
    store.set(
      store.get().map((p) => {
        if (p.id !== id) return p;
        updated = { ...p, ...input, updatedAt: new Date().toISOString() };
        return updated;
      })
    );
    return updated;
  },

  async remove(id: string): Promise<boolean> {
    const before = store.get().length;
    store.set(store.get().filter((p) => p.id !== id));
    return store.get().length < before;
  },

  async stats() {
    const all = store.get();
    return {
      total: all.length,
      available: all.filter((p) => p.status === "Available").length,
      sold: all.filter((p) => p.status === "Sold").length,
      featured: all.filter((p) => p.featured).length,
    };
  },
};
