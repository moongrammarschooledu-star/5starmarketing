// DEMO project/portfolio data — replace with real projects.
export interface Project {
  id: string;
  name: string;
  location: string;
  type: string;
  status: "Completed" | "Ongoing" | "Upcoming";
  image: string;
}

export const projects: Project[] = [
  {
    id: "johar-town-residency",
    name: "Johar Town Residency",
    location: "Johar Town, Lahore",
    type: "Residential",
    status: "Completed",
    image:
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "5starm-heights",
    name: "5STAR.M Heights",
    location: "Lahore",
    type: "Apartments",
    status: "Ongoing",
    image:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "green-view-society",
    name: "Green View Society Block",
    location: "LDA-Approved Society, Lahore",
    type: "Residential Plots",
    status: "Ongoing",
    image:
      "https://images.unsplash.com/photo-1628744448840-55bdb2497bd4?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "5starm-business-square",
    name: "5STAR.M Business Square",
    location: "Lahore",
    type: "Commercial",
    status: "Upcoming",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop",
  },
];
