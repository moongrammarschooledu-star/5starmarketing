"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FilePlus2, Loader2, MessageCircle, Printer, Save, Trash2 } from "lucide-react";
import { paymentModes, tokenProblems, type PaymentMode, type TokenReceiptData } from "@/lib/tokenReceipt/types";
import { tokenWhatsAppText } from "@/lib/tokenReceipt/content";
import { groupLakh, numberToWordsEn } from "@/lib/rentAgreement/words";
import type { AgreementParty } from "@/lib/rentAgreement/types";
import { deleteTokenReceiptAction, prefillTokenFromPropertyAction, saveTokenReceiptAction } from "@/lib/actions/tokenReceipts.actions";
import { openAdminWhatsApp } from "@/lib/adminWhatsApp";
import { whatsappUrlFor } from "@/lib/site";
import { useToast } from "@/components/admin/ToastProvider";
import { RecordPicker } from "@/components/admin/documents/RecordPicker";
import { Field, Pair, PartyFields, Section, inputClass as input } from "@/components/admin/rentals/agreementFormParts";
import type { DocumentTarget } from "@/lib/models/document";

export function TokenReceiptForm({
  id,
  receiptNo,
  initial,
  propertyId: initialPropertyId,
  properties,
  defaultReceivedBy,
}: {
  id?: string;
  receiptNo?: string;
  initial: TokenReceiptData;
  propertyId?: string;
  properties: { id: string; title: string }[];
  defaultReceivedBy: string;
}) {
  const [d, setD] = useState<TokenReceiptData>({ ...initial, receivedBy: initial.receivedBy || defaultReceivedBy });
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [propertyId, setPropertyId] = useState(initialPropertyId ?? "");
  const router = useRouter();
  const toast = useToast();

  const set = (patch: Partial<TokenReceiptData>) => setD((x) => ({ ...x, ...patch }));
  const setPayer = (patch: Partial<AgreementParty>) => setD((x) => ({ ...x, payer: { ...x.payer, ...patch } }));
  const setProp = (patch: Partial<TokenReceiptData["property"]>) => setD((x) => ({ ...x, property: { ...x.property, ...patch } }));
  const setTerm = (k: keyof TokenReceiptData["terms"], v: boolean) => setD((x) => ({ ...x, terms: { ...x.terms, [k]: v } }));

  function fromContact(t: DocumentTarget | null) {
    if (t) setPayer({ name: t.label, phone: t.sub ?? "" });
  }

  function fillFromProperty(pid: string) {
    setPropertyId(pid);
    if (!pid) return;
    startTransition(async () => {
      try {
        const p = await prefillTokenFromPropertyAction(pid);
        if (!p) return;
        setD((x) => ({
          ...x,
          ownerName: p.ownerName || x.ownerName,
          property: { ...x.property, ...Object.fromEntries(Object.entries(p.property).filter(([, v]) => v)) },
          agreedAmount: x.agreedAmount || p.agreedAmount,
        }));
        toast.show("Property and owner details filled in.");
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not load that property.");
      }
    });
  }

  function save(then: "print" | "none") {
    setError(null);
    const problems = tokenProblems(d);
    if (problems.length) return setError(problems[0]);
    // The print tab is opened right now (a browser allows that only straight after a click) and filled in once the receipt is saved.
    const printTab = then === "print" ? window.open("", "_blank") : null;
    startTransition(async () => {
      try {
        const saved = await saveTokenReceiptAction(id ?? null, d, propertyId || undefined);
        toast.show("Token receipt saved.");
        if (printTab) printTab.location.href = `/admin/rentals/tokens/${saved.id}/print`;
        if (!id) router.push(`/admin/rentals/tokens/${saved.id}`);
        else router.refresh();
      } catch (e) {
        printTab?.close();
        setError(e instanceof Error ? e.message : "Could not save this token receipt.");
      }
    });
  }

  function sendWhatsApp() {
    if (!id || !receiptNo) return;
    if (!/^[0-9+()\-\s]{7,20}$/.test(d.payer.phone.trim())) return setError("Write the client's WhatsApp number first (in the client details), then Save.");
    openAdminWhatsApp(whatsappUrlFor(d.payer.phone.trim(), tokenWhatsAppText(d, receiptNo)));
  }

  function remove() {
    if (!id || !window.confirm("Delete this token receipt? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteTokenReceiptAction(id);
        router.push("/admin/rentals/tokens");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete.");
      }
    });
  }

  const rent = d.purpose === "rent";
  const words = d.amount > 0 ? `${numberToWordsEn(d.amount)} Rupees Only (Rs. ${groupLakh(d.amount)}/-)` : "";

  return (
    <div className="space-y-5">
      <Section title="Receipt" hint="The whole receipt is written in the language you choose.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Language">
            <select value={d.language} onChange={(e) => set({ language: e.target.value as TokenReceiptData["language"] })} className={input}>
              <option value="ur">Urdu (اردو)</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="Receipt is for">
            <select value={d.purpose} onChange={(e) => set({ purpose: e.target.value as TokenReceiptData["purpose"] })} className={input}>
              <option value="rent">Token for renting a property</option>
              <option value="sale">Bayana for buying a property</option>
            </select>
          </Field>
          <Field label="Copies" hint={d.language === "ur" ? "Urdu is larger; two copies may need two pages." : "Two copies = client copy + office copy on one page."}>
            <select value={d.copies} onChange={(e) => set({ copies: Number(e.target.value) === 2 ? 2 : 1 })} className={input}>
              <option value={1}>One copy</option>
              <option value={2}>Two copies (client + office)</option>
            </select>
          </Field>
          <Field label="Date received">
            <input type="date" value={d.receiptDate} onChange={(e) => set({ receiptDate: e.target.value })} className={input} />
          </Field>
        </div>
      </Section>

      <PartyFields
        title="Client (who paid the token)"
        party={d.payer}
        onChange={setPayer}
        picker={<RecordPicker kind="contact" label="Pick from Customer Contacts" value={null} onChange={fromContact} />}
      />

      <Section title="Property">
        <Field label="Fill from one of our properties">
          <select value={propertyId} onChange={(e) => fillFromProperty(e.target.value)} className={input}>
            <option value="">-</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </Field>
        <Pair label="House / shop number and street" en={d.property.description} ur={d.property.descriptionUr} onEn={(v) => setProp({ description: v })} onUr={(v) => setProp({ descriptionUr: v })} textarea />
        <Pair label="Area / society" en={d.property.area} ur={d.property.areaUr} onEn={(v) => setProp({ area: v })} onUr={(v) => setProp({ areaUr: v })} />
        <Pair label="City" en={d.property.city} ur={d.property.cityUr} onEn={(v) => setProp({ city: v })} onUr={(v) => setProp({ cityUr: v })} />
        <Pair label="Size (e.g. 10 Marla)" en={d.property.size} ur={d.property.sizeUr} onEn={(v) => setProp({ size: v })} onUr={(v) => setProp({ sizeUr: v })} />
        <Pair label="Owner name (optional)" en={d.ownerName} ur={d.ownerNameUr} onEn={(v) => set({ ownerName: v })} onUr={(v) => set({ ownerNameUr: v })} />
      </Section>

      <Section title="Token money">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={rent ? "Token amount received (Rs.)" : "Bayana (advance) received (Rs.)"} hint={words}>
            <input type="number" min={0} value={d.amount || ""} onChange={(e) => set({ amount: Number(e.target.value) })} className={input} />
          </Field>
          <Field label="Paid by">
            <select value={d.paymentMode} onChange={(e) => set({ paymentMode: e.target.value as PaymentMode })} className={input}>
              {paymentModes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Transaction / cheque number (optional)">
            <input value={d.reference} onChange={(e) => set({ reference: e.target.value })} className={input} />
          </Field>
          <Field label={rent ? "Agreed monthly rent (Rs.)" : "Agreed price (Rs.)"} hint="Optional - printed on the receipt if filled.">
            <input type="number" min={0} value={d.agreedAmount || ""} onChange={(e) => set({ agreedAmount: Number(e.target.value) })} className={input} />
          </Field>
          {rent && (
            <Field label="Agreed security deposit (Rs.)" hint="Optional.">
              <input type="number" min={0} value={d.securityDeposit || ""} onChange={(e) => set({ securityDeposit: Number(e.target.value) })} className={input} />
            </Field>
          )}
          <Field label="Property held for the client until">
            <input type="date" value={d.validUntil} onChange={(e) => set({ validUntil: e.target.value })} className={input} />
          </Field>
        </div>
        <Pair label="Received by (staff name)" en={d.receivedBy} ur={d.receivedByUr} onEn={(v) => set({ receivedBy: v })} onUr={(v) => set({ receivedByUr: v })} />
      </Section>

      <Section title="Terms on the receipt" hint="Tick what applies.">
        <div className="space-y-2">
          {(
            [
              ["adjusted", rent ? "The token is adjusted against the first month's rent / security" : "The token is adjusted against the sale price"],
              ["forfeitIfClientCancels", "If the client cancels, the token is not refunded"],
              ["refundIfOwnerCancels", "If the owner cancels or cannot hand over, the token is returned in full"],
              ["notAgreement", "This receipt is only a proof of the token - not an agreement, no possession"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex items-start gap-2.5 text-sm text-ink">
              <input type="checkbox" checked={d.terms[k]} onChange={(e) => setTerm(k, e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <Field label="Extra terms (one per line)">
          <textarea value={d.extraTerms} onChange={(e) => set({ extraTerms: e.target.value })} rows={3} className={input} />
        </Field>
      </Section>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
        </div>
      )}

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur">
        <button type="button" onClick={() => save("print")} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} Save &amp; Print / Save as PDF
        </button>
        <button type="button" onClick={() => save("none")} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-60">
          <Save className="h-4 w-4" /> Save only
        </button>
        {id && (
          <>
            <button type="button" onClick={sendWhatsApp} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-success px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
              <MessageCircle className="h-4 w-4" /> Send to client on WhatsApp
            </button>
            <a href={rent ? `/admin/rentals/agreements/new?token=${id}` : `/admin/deals/sale-agreements/new?token=${id}`} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
              <FilePlus2 className="h-4 w-4" /> {rent ? "Make the rent agreement" : "Make the sale agreement"}
            </a>
            <button type="button" onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold text-muted hover:bg-primary/10 hover:text-primary disabled:opacity-60">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </>
        )}
        {receiptNo && <span className="text-xs font-semibold text-muted">{receiptNo}</span>}
      </div>
    </div>
  );
}
