import type { PropertyDocument } from "./property";

export type ProjectStatus = "Upcoming" | "Ongoing" | "Completed";

export interface Project {
  id: string;
  slug: string;
  name: string;
  location: string;
  type: string;
  status: ProjectStatus;
  shortDescription: string;
  description: string;
  highlights: string[];
  propertyTypes: string[];
  paymentOptions: string[];
  mapsUrl?: string;
  coverImage?: string;
  whatsappNumber?: string;
  documents: PropertyDocument[];
  images: string[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProjectInput = Omit<Project, "id" | "slug" | "createdAt" | "updatedAt">;

export const projectStatuses: ProjectStatus[] = ["Upcoming", "Ongoing", "Completed"];
