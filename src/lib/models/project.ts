export type ProjectStatus = "Upcoming" | "Ongoing" | "Completed";

export interface Project {
  id: string;
  name: string;
  location: string;
  type: string;
  status: ProjectStatus;
  description: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export type ProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt">;

export const projectStatuses: ProjectStatus[] = ["Upcoming", "Ongoing", "Completed"];
