import type { LucideIcon } from "lucide-react";
import {
  Home,
  Building2,
  TrendingUp,
  Landmark,
  HardHat,
  Users,
  Wallet,
  ClipboardCheck,
} from "lucide-react";

export interface Service {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const services: Service[] = [
  {
    icon: Home,
    title: "Property Buying",
    description:
      "Guided assistance to help you find and purchase the right house, flat or plot with confidence.",
  },
  {
    icon: Wallet,
    title: "Property Selling",
    description:
      "Professional support to market and sell your property to serious, qualified buyers.",
  },
  {
    icon: TrendingUp,
    title: "Property Investment",
    description:
      "Practical guidance on property as a long-term investment opportunity in Lahore's growing market.",
  },
  {
    icon: Building2,
    title: "Residential Properties",
    description:
      "Houses, flats and residential plots across Lahore, including LDA-approved societies.",
  },
  {
    icon: Landmark,
    title: "Commercial Properties",
    description:
      "Retail, office and commercial spaces suited to your business needs and budget.",
  },
  {
    icon: HardHat,
    title: "Construction Services",
    description:
      "Reliable construction and building solutions, from planning through to completion.",
  },
  {
    icon: Users,
    title: "Property Consultancy",
    description:
      "Honest, transparent advice at every step of your property buying, selling or investment journey.",
  },
  {
    icon: ClipboardCheck,
    title: "Monthly Installment Options",
    description:
      "Flexible payment structures, including cash and easy monthly installment plans.",
  },
];
