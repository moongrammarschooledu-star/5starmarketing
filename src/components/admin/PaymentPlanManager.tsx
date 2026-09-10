"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Plus, Trash2, Eye } from "lucide-react";
import type { PaymentPlan, PaymentScheduleItem } from "@/lib/models/paymentPlan";
import { installmentFrequencies, planPaymentOptions } from "@/lib/models/paymentPlan";
import { calculatePaymentPlan, validatePaymentInput, formatPKR } from "@/lib/calculator";
import {
  savePaymentPlanAction,
  toggleplanEnabledAction,
  deletePaymentPlanAction,
  saveScheduleItemsAction,
  type PaymentPlanFormState,
} from "@/lib/actions/paymentPlan.actions";
import { useToast } from "./ToastProvider";
import { ConfirmDialog } from "./ConfirmDialog";

type DraftItem = { installmentNumber: number; dueDate: string; amount: string; description: string };

export function PaymentPlanManager({
  propertyId,
  propertySlug,
  plan,
  scheduleItems,
}: {
  propertyId: string;
  propertySlug: string;
  plan?: PaymentPlan;
  scheduleItems: PaymentScheduleItem[];
}) {
  const boundAction = savePaymentPlanAction.bind(null, propertyId, propertySlug, plan?.id);
  const [state, formAction, pending] = useActionState<PaymentPlanFormState, FormData>(boundAction, {});

  const [calculationType, setCalculationType] = useState(plan?.calculationType ?? "Automatic");
  const [price, setPrice] = useState(plan?.propertyPrice ?? 0);
  const [downPayment, setDownPayment] = useState(plan?.downPayment ?? 0);
  const [frequency, setFrequency] = useState(plan?.installmentFrequency ?? "Monthly");
  const [duration, setDuration] = useState(plan?.duration ?? 12);

  const [items, setItems] = useState<DraftItem[]>(
    scheduleItems.length > 0
      ? scheduleItems.map((i) => ({
          installmentNumber: i.installmentNumber,
          dueDate: i.dueDate ?? "",
          amount: String(i.amount),
          description: i.description,
        }))
      : [{ installmentNumber: 1, dueDate: "", amount: "", description: "Booking" }]
  );
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toast = useToast();

  const previewInput = useMemo(
    () => ({ propertyPrice: price, downPayment, duration, frequency }),
    [price, downPayment, duration, frequency]
  );
  const previewError = useMemo(() => validatePaymentInput(previewInput), [previewInput]);
  const preview = useMemo(() => (previewError ? null : calculatePaymentPlan(previewInput)), [previewInput, previewError]);

  function addItem() {
    setItems((list) => [...list, { installmentNumber: list.length + 1, dueDate: "", amount: "", description: "" }]);
  }
  function removeItem(index: number) {
    setItems((list) => list.filter((_, i) => i !== index).map((it, i) => ({ ...it, installmentNumber: i + 1 })));
  }
  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((list) => list.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function saveSchedule() {
    if (!plan) {
      toast.show("Save the payment plan first, then add a custom schedule.", "error");
      return;
    }
    startTransition(async () => {
      await saveScheduleItemsAction(
        plan.id,
        propertyId,
        propertySlug,
        items
          .filter((i) => i.amount.trim())
          .map((i) => ({
            installmentNumber: i.installmentNumber,
            dueDate: i.dueDate || undefined,
            amount: Number(i.amount) || 0,
            description: i.description,
          }))
      );
      toast.show("Payment schedule saved.");
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-bold text-ink">Payment Plan</h2>
        {plan && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await toggleplanEnabledAction(plan.id, !plan.enabled, propertyId, propertySlug);
                  toast.show(plan.enabled ? "Payment plan disabled." : "Payment plan enabled.");
                })
              }
              className="rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-60"
            >
              {plan.enabled ? "Disable" : "Enable"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
              aria-label="Delete payment plan"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">
        Optional — only appears on the property page and calculator once saved and enabled here.
      </p>

      <form action={formAction} className="mt-4 space-y-4">
        {state?.error && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {state.error}
          </div>
        )}
        {state?.success && (
          <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> Payment plan saved.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Payment Option</span>
            <select
              name="paymentOption"
              defaultValue={plan?.paymentOption ?? "Installments"}
              className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            >
              {planPaymentOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>

          <fieldset className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Calculation Type</span>
            <div className="flex gap-4 pt-1.5">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="calculationType"
                  value="Automatic"
                  checked={calculationType === "Automatic"}
                  onChange={() => setCalculationType("Automatic")}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                Automatic
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="calculationType"
                  value="Custom"
                  checked={calculationType === "Custom"}
                  onChange={() => setCalculationType("Custom")}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                Custom Schedule
              </label>
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Property Price (Rs.)</span>
            <input
              type="number"
              name="propertyPrice"
              required
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
              className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Down Payment (Rs.)</span>
            <input
              type="number"
              name="downPayment"
              min={0}
              value={downPayment}
              onChange={(e) => setDownPayment(Number(e.target.value) || 0)}
              className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Installment Frequency</span>
            <select
              name="installmentFrequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as typeof frequency)}
              className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            >
              {installmentFrequencies.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Installment Duration</span>
            <input
              type="number"
              name="duration"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 0)}
              className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Installment Amount (optional override)</span>
            <input
              type="number"
              name="installmentAmount"
              min={0}
              defaultValue={plan?.installmentAmount}
              placeholder={preview ? String(preview.installmentAmount) : ""}
              className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
        </div>

        {calculationType === "Automatic" && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
              <Eye className="h-3.5 w-3.5" /> Preview
            </div>
            {previewError ? (
              <p className="mt-1.5 text-sm text-primary">{previewError}</p>
            ) : preview ? (
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><div className="text-xs text-muted-foreground">Remaining</div><div className="font-bold text-ink">{formatPKR(preview.remainingAmount)}</div></div>
                <div><div className="text-xs text-muted-foreground">Installment</div><div className="font-bold text-ink">{formatPKR(preview.installmentAmount)}</div></div>
                <div><div className="text-xs text-muted-foreground">Payments</div><div className="font-bold text-ink">{preview.totalPayments}</div></div>
                <div><div className="text-xs text-muted-foreground">Total</div><div className="font-bold text-ink">{formatPKR(preview.totalPayment)}</div></div>
              </div>
            ) : null}
          </div>
        )}

        <details className="rounded-xl border border-border p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Optional Fees (only shown if entered)</summary>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Booking Fee (Rs.)" name="bookingFee" defaultValue={plan?.bookingFee} />
            <Field label="Confirmation Fee (Rs.)" name="confirmationFee" defaultValue={plan?.confirmationFee} />
            <Field label="Processing Fee (Rs.)" name="processingFee" defaultValue={plan?.processingFee} />
            <Field label="Additional Charges (Rs.)" name="additionalCharges" defaultValue={plan?.additionalCharges} />
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-semibold text-ink">Additional Charges Description</span>
              <input
                type="text"
                name="additionalChargesDescription"
                defaultValue={plan?.additionalChargesDescription}
                placeholder="e.g. Society transfer fee"
                className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
              />
            </label>
          </div>
        </details>

        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" name="enabled" defaultChecked={plan?.enabled ?? true} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
          Show this payment plan publicly
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Saving..." : plan ? "Save Payment Plan" : "Create Payment Plan"}
        </button>
      </form>

      {calculationType === "Custom" && (
        <div className="mt-6 border-t border-border pt-5">
          <h3 className="text-sm font-bold text-ink">Custom Payment Schedule</h3>
          <p className="mt-1 text-xs text-muted">Save the payment plan above first, then build the schedule here.</p>
          <div className="mt-3 space-y-2">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-[3rem_1fr_1fr_2fr_2.5rem]">
                <div className="flex items-center justify-center text-sm font-bold text-ink">{item.installmentNumber}</div>
                <input
                  type="date"
                  value={item.dueDate}
                  onChange={(e) => updateItem(i, { dueDate: e.target.value })}
                  className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary"
                />
                <input
                  type="number"
                  placeholder="Amount (Rs.)"
                  value={item.amount}
                  onChange={(e) => updateItem(i, { amount: e.target.value })}
                  className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="Description (e.g. Booking)"
                  value={item.description}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                  className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="flex h-9 w-9 items-center justify-center justify-self-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                  aria-label="Remove row"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Add Row
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={saveSchedule}
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              Save Schedule
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        message="Delete this payment plan? This will remove it from the property page and calculator."
        confirmLabel="Delete Payment Plan"
        busy={isPending}
        onConfirm={() =>
          startTransition(async () => {
            if (plan) {
              await deletePaymentPlanAction(plan.id, propertyId, propertySlug);
              toast.show("Payment plan deleted.");
            }
            setConfirmDelete(false);
          })
        }
        onClose={() => setConfirmDelete(false)}
      />
    </section>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue?: number }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink">{label}</span>
      <input
        type="number"
        name={name}
        min={0}
        defaultValue={defaultValue}
        className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
      />
    </label>
  );
}
