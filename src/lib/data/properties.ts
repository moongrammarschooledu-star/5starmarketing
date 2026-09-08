// DEMO property data — replace with real listings.
// Add a new property by copying an object below and editing its fields.
export type PropertyType = "House" | "Flat" | "Plot" | "Commercial";
export type Purpose = "Buy" | "Sell" | "Invest";

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  purpose: Purpose;
  location: string;
  size: string;
  price: string;
  paymentOption: string;
  description: string;
  image: string;
  featured?: boolean;
}

export const properties: Property[] = [
  {
    id: "premium-residential-house",
    title: "Premium Residential House",
    type: "House",
    purpose: "Buy",
    location: "Johar Town, Lahore",
    size: "10 Marla",
    price: "Price on Request",
    paymentOption: "Cash / Easy Installments",
    description:
      "A spacious, well-designed residential house in a prime Johar Town location, ideal for families looking for comfort and long-term value.",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop",
    featured: true,
  },
  {
    id: "modern-family-home",
    title: "Modern Family Home",
    type: "House",
    purpose: "Buy",
    location: "Lahore",
    size: "5 Marla",
    price: "Price on Request",
    paymentOption: "Cash / Easy Installments",
    description:
      "A modern, practical family home with quality construction and easy access to main city routes.",
    image:
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=1200&auto=format&fit=crop",
    featured: true,
  },
  {
    id: "residential-plot",
    title: "Residential Plot",
    type: "Plot",
    purpose: "Invest",
    location: "LDA-Approved Society, Lahore",
    size: "5 Marla",
    price: "Price on Request",
    paymentOption: "Cash / Easy Monthly Installments",
    description:
      "A residential plot in an LDA-approved society, well-suited for building your own home or as a long-term property investment.",
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1200&auto=format&fit=crop",
    featured: true,
  },
  {
    id: "luxury-apartment",
    title: "Luxury Apartment",
    type: "Flat",
    purpose: "Buy",
    location: "Lahore",
    size: "3 Bed",
    price: "Price on Request",
    paymentOption: "Cash / Easy Installments",
    description:
      "A well-appointed apartment offering a comfortable, low-maintenance lifestyle in a convenient Lahore location.",
    image:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop",
    featured: true,
  },
  {
    id: "commercial-property",
    title: "Commercial Property",
    type: "Commercial",
    purpose: "Invest",
    location: "Johar Town, Lahore",
    size: "4 Marla",
    price: "Price on Request",
    paymentOption: "Cash / Easy Installments",
    description:
      "A commercial space suited for retail or office use, positioned in a busy, high-visibility area of Lahore.",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop",
    featured: true,
  },
];

export const propertyTypes: PropertyType[] = ["House", "Flat", "Plot", "Commercial"];
export const purposes: Purpose[] = ["Buy", "Sell", "Invest"];
export const locations = ["Lahore", "Johar Town", "Other Locations"];
export const budgetRanges = [
  "Any Budget",
  "Under 50 Lac",
  "50 Lac - 1 Crore",
  "1 Crore - 2 Crore",
  "2 Crore+",
];
