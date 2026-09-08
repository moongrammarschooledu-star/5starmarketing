import "server-only";
import type { Project, ProjectInput } from "@/lib/models/project";
import { globalStore } from "./global-store";

const store = globalStore<Project[]>("projects", seed);

function seed(): Project[] {
  const now = new Date("2026-01-15").toISOString();
  const base: Omit<Project, "createdAt" | "updatedAt">[] = [
    {
      id: "johar-town-residency",
      name: "Johar Town Residency",
      location: "Johar Town, Lahore",
      type: "Residential",
      status: "Completed",
      description: "A completed residential development in Johar Town, Lahore.",
      images: [
        "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1200&auto=format&fit=crop",
      ],
    },
    {
      id: "5starm-heights",
      name: "5STAR.M Heights",
      location: "Lahore",
      type: "Apartments",
      status: "Ongoing",
      description: "An ongoing apartment development in Lahore.",
      images: [
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1200&auto=format&fit=crop",
      ],
    },
    {
      id: "green-view-society",
      name: "Green View Society Block",
      location: "LDA-Approved Society, Lahore",
      type: "Residential Plots",
      status: "Ongoing",
      description: "A residential plots block within an LDA-approved society.",
      images: [
        "https://images.unsplash.com/photo-1628744448840-55bdb2497bd4?q=80&w=1200&auto=format&fit=crop",
      ],
    },
    {
      id: "5starm-business-square",
      name: "5STAR.M Business Square",
      location: "Lahore",
      type: "Commercial",
      status: "Upcoming",
      description: "An upcoming commercial development in Lahore.",
      images: [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop",
      ],
    },
  ];
  return base.map((p) => ({ ...p, createdAt: now, updatedAt: now }));
}

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  let id = base || "project";
  let n = 1;
  while (store.get().some((p) => p.id === id)) id = `${base}-${++n}`;
  return id;
}

export const projectsRepository = {
  async list(): Promise<Project[]> {
    return [...store.get()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
  async getById(id: string): Promise<Project | undefined> {
    return store.get().find((p) => p.id === id);
  },
  async create(input: ProjectInput): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = { ...input, id: slugify(input.name), createdAt: now, updatedAt: now };
    store.set([project, ...store.get()]);
    return project;
  },
  async update(id: string, input: Partial<ProjectInput>): Promise<Project | undefined> {
    let updated: Project | undefined;
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
};
