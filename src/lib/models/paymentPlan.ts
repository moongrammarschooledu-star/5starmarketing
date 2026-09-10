export type PlanPaymentOption = "Cash" | "Installments" | "Both";
export type CalculationType = "Automatic" | "Custom";
export type InstallmentFrequency = "Monthly" | "Quarterly" | "Yearly";

export const installmentFrequencies: InstallmentFrequency[] = ["Monthly", "Quarterly", "Yearly"];
export const planPaymentOptions: PlanPaymentOption[] = ["Cash", "Installments", "Both"];

export interface PaymentPlan {
  id: string;
  propertyId: string;
  paymentOption: PlanPaymentOption;
  calculationType: CalculationType;
  propertyPrice: number;
  downPayment: number;
  bookingFee?: number;
  confirmationFee?: number;
  processingFee?: number;
  additionalCharges?: number;
  additionalChargesDescription?: string;
  installmentFrequency: InstallmentFrequency;
  duration: number;
  installmentAmount?: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PaymentPlanInput = Omit<PaymentPlan, "id" | "propertyId" | "createdAt" | "updatedAt">;

export interface PaymentScheduleItem {
  id: string;
  paymentPlanId: string;
  installmentNumber: number;
  dueDate?: string;
  amount: number;
  description: string;
  createdAt: string;
}

export type PaymentScheduleItemInput = Omit<PaymentScheduleItem, "id" | "paymentPlanId" | "createdAt">;
