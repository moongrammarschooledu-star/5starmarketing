// DEMO property data — replace with real listings.
// Add a new property by copying an object below and editing its fields.
// This shape is intentionally flat and serializable so it can later be
// swapped for data fetched from an admin-managed database with no changes
// to the components that consume it.

export type PropertyType = "House" | "Flat" | "Residential Plot" | "Commercial Property";
export type Purpose = "For Sale" | "For Rent" | "Investment";
export type PropertyStatus = "Available" | "Reserved" | "Sold" | "Rented";
export type PaymentOption = "Cash" | "Installments" | "Cash / Installments";
export type SizeCategory = "3 Marla" | "5 Marla" | "10 Marla" | "1 Kanal" | "Custom";
export type LocationArea = "Lahore" | "Johar Town" | "Other Locations";

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  purpose: Purpose;
  location: string;
  locationArea: LocationArea;
  size: string;
  sizeCategory: SizeCategory;
  price: string;
  /** Numeric PKR value used only for the price-range filter. Omit for
   *  listings (e.g. rentals) that shouldn't be matched by sale-price buckets. */
  priceValue?: number;
  paymentOption: PaymentOption;
  status: PropertyStatus;
  featured?: boolean;
  images: string[];
  description: string;
  features: string[];
  amenities: string[];
}

export const properties: Property[] = [
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
      "A spacious, well-designed residential house in a prime Johar Town location, ideal for families looking for comfort and long-term value. Thoughtfully laid out across a 10 Marla plot with a functional floor plan and quality finishes throughout.",
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
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop",
    ],
    description:
      "A modern, practical family home with quality construction and easy access to main city routes. Compact footprint with an efficient, livable layout suited to a small or growing family.",
    features: [
      "3 Bedrooms with attached baths",
      "Open-plan lounge and dining",
      "Fitted kitchen with storage",
      "Rooftop / terrace access",
    ],
    amenities: [
      "Gated street",
      "Close to schools",
      "Close to main market",
    ],
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
      "A residential plot in an LDA-approved society, well-suited for building your own home or as a long-term property investment. Clear title, ready for construction.",
    features: [
      "Clear, developed plot",
      "Ready for construction",
      "Corner-option availability (subject to inventory)",
    ],
    amenities: [
      "LDA-approved society",
      "Underground electricity",
      "Wide carpeted streets",
    ],
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
      "A well-appointed apartment offering a comfortable, low-maintenance lifestyle in a convenient Lahore location. Bright, ventilated rooms with a functional layout.",
    features: [
      "3 Bedrooms",
      "Modern kitchen",
      "Elevator access",
      "Reserved parking",
    ],
    amenities: [
      "Backup generator",
      "On-site security guard",
      "Close to main boulevard",
    ],
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
      "A commercial space suited for retail or office use, positioned in a busy, high-visibility area of Lahore. Suitable for a range of businesses.",
    features: [
      "Ground + 1 construction",
      "Wide frontage",
      "Dedicated parking space",
    ],
    amenities: [
      "High foot traffic area",
      "Main-road visibility",
      "Close to public transport",
    ],
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
    features: [
      "Corner location",
      "Two-side road access",
      "Clear title",
    ],
    amenities: [
      "Developed society",
      "Close to main highway",
    ],
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
    features: [
      "2 Bedrooms",
      "Furnished kitchen",
      "Balcony",
    ],
    amenities: [
      "Close to schools",
      "Close to main market",
      "Backup generator",
    ],
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
    features: [
      "2 Bedrooms",
      "Kitchen and lounge",
      "Rooftop space",
    ],
    amenities: [
      "Quiet residential street",
      "Close to public transport",
    ],
  },
];

export const propertyTypes: PropertyType[] = [
  "House",
  "Flat",
  "Residential Plot",
  "Commercial Property",
];

export const purposes: Purpose[] = ["For Sale", "For Rent", "Investment"];

export const locationAreas: LocationArea[] = ["Lahore", "Johar Town", "Other Locations"];

export const sizeCategories: SizeCategory[] = [
  "3 Marla",
  "5 Marla",
  "10 Marla",
  "1 Kanal",
  "Custom",
];

export const paymentOptions: PaymentOption[] = ["Cash", "Installments"];

export const priceRanges: { label: string; min: number; max: number }[] = [
  { label: "Any Budget", min: 0, max: Infinity },
  { label: "Under 50 Lac", min: 0, max: 5000000 },
  { label: "50 Lac - 1 Crore", min: 5000000, max: 10000000 },
  { label: "1 Crore - 2 Crore", min: 10000000, max: 20000000 },
  { label: "2 Crore+", min: 20000000, max: Infinity },
];

export function getPropertyById(id: string): Property | undefined {
  return properties.find((p) => p.id === id);
}
