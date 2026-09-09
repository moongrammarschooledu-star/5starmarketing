export type AppointmentStatus = "Pending" | "Confirmed" | "Rescheduled" | "Completed" | "Cancelled" | "No Show";

export const appointmentStatuses: AppointmentStatus[] = [
  "Pending",
  "Confirmed",
  "Rescheduled",
  "Completed",
  "Cancelled",
  "No Show",
];

export interface Appointment {
  id: string;
  customerId?: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  propertyImage?: string;
  propertySlug: string;
  leadId?: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:MM
  numberOfVisitors: number;
  message: string;
  status: AppointmentStatus;
  assignedAgent?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentInput = Pick<
  Appointment,
  "propertyId" | "name" | "phone" | "whatsapp" | "email" | "appointmentDate" | "appointmentTime" | "numberOfVisitors" | "message"
> & { customerId?: string };

export interface AppointmentHistoryEntry {
  id: string;
  appointmentId: string;
  changedBy?: string;
  oldStatus?: string;
  newStatus?: string;
  oldDate?: string;
  newDate?: string;
  oldTime?: string;
  newTime?: string;
  note?: string;
  createdAt: string;
}

export interface AppointmentSettings {
  workingDays: string[];
  openingTime: string;
  closingTime: string;
  slotDurationMinutes: number;
  breakStart?: string;
  breakEnd?: string;
  maxVisitors: number;
  bookingNoticeHours: number;
}

export const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export interface TimeSlot {
  time: string; // HH:MM
  available: boolean;
}

export interface AppointmentStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  byProperty: { label: string; count: number }[];
  byDate: { date: string; count: number }[];
  byStatus: { label: string; count: number }[];
}
