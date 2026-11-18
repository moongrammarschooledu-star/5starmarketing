"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Download, FileStack, Loader2, Printer, Save, Trash2 } from "lucide-react";
import { agreementProblems, type AgreementLanguage, type AgreementParty, type PropertyPurpose, type RentAgreementData } from "@/lib/rentAgreement/types";
import { numberToWordsEn, groupLakh } from "@/lib/rentAgreement/words";
import { deleteRentAgreementAction, prefillAgreementFromPropertyAction, saveAgreementToDocumentsAction, saveRentAgreementAction } from "@/lib/actions/rentAgreements.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { Field, Pair, PartyFields, Section, inputClass as input, inputUrClass as inputUr } from "@/components/admin/rentals/agreementFormParts";
import { RecordPicker } from "@/components/admin/documents/RecordPicker";
import type { DocumentTarget } from "@/lib/models/document";

const OPTION_LABELS: { key: keyof RentAgreementData["options"]; label: string }[] = [
  { key: "securityNotAdjustable", label: "Security is not adjusted against rent, and the tenant cannot demand more than he paid" },
  { key: "noSubLet", label: "No sub-letting / no other person as tenant" },
  { key: "repairsByTenant", label: "Tenant repairs any damage at his own cost; no structural changes" },
  { key: "lawfulUse", label: "No illegal / immoral use; use only for the agreed purpose; return in the same condition" },
  { key: "noEarlyVacate", label: "Owner cannot ask to vacate before the term ends (only by mutual consent with notice)" },
  { key: "stayWaiver", label: "Tenant will not take a stay order / go to court against a vacate notice" },
  { key: "actCompliance", label: "Tenant follows the Punjab Rented Premises Act" },
];

export function RentAgreementForm({
  id,
  agreementNo,
  initial,
  links,
  properties,
  documentId,
}: {
  id?: string;
  agreementNo?: string;
  initial: RentAgreementData;
  links: { leaseId?: string; propertyId?: string };
  properties: { id: string; title: string }[];
  documentId?: string;
}) {
  const [d, setD] = useState<RentAgreementData>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [savedDocId, setSavedDocId] = useState<string | undefined>(documentId);
  const [propertyId, setPropertyId] = useState(links.propertyId ?? "");
  const router = useRouter();
  const toast = useToast();

  const set = (patch: Partial<RentAgreementData>) => setD((x) => ({ ...x, ...patch }));
  const setOwner = (patch: Partial<AgreementParty>) => setD((x) => ({ ...x, owner: { ...x.owner, ...patch } }));
  const setTenant = (patch: Partial<AgreementParty>) => setD((x) => ({ ...x, tenant: { ...x.tenant, ...patch } }));
  const setProp = (patch: Partial<RentAgreementData["property"]>) => setD((x) => ({ ...x, property: { ...x.property, ...patch } }));
  const setWitness = (i: number, patch: Partial<RentAgreementData["witnesses"][number]>) =>
    setD((x) => ({ ...x, witnesses: x.witnesses.map((w, k) => (k === i ? { ...w, ...patch } : w)) }));

  function fromContact(who: "owner" | "tenant", t: DocumentTarget | null) {
    if (!t) return;
    const patch = { name: t.label, phone: t.sub ?? "" };
    if (who === "owner") setOwner(patch);
    else setTenant(patch);
  }

  function fillFromProperty(pid: string) {
    setPropertyId(pid);
    if (!pid) return;
    startTransition(async () => {
      try {
        const p = await prefillAgreementFromPropertyAction(pid);
        if (!p) return;
        setD((x) => ({
          ...x,
          owner: p.owner ? { ...x.owner, ...Object.fromEntries(Object.entries(p.owner).filter(([, v]) => v)) } : x.owner,
          property: p.property ? { ...x.property, ...p.property } : x.property,
          monthlyRent: p.monthlyRent && !x.monthlyRent ? p.monthlyRent : x.monthlyRent,
        }));
        toast.show("Property and owner details filled in.");
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Could not load that property.");
      }
    });
  }

  function save(then: "print" | "download" | "none") {
    setError(null);
    const problems = agreementProblems(d);
    if (problems.length) return setError(problems[0]);
    // The print tab is opened right now (a browser allows that only straight after a click) and filled in once the agreement is saved.
    const printTab = then === "print" ? window.open("", "_blank") : null;
    startTransition(async () => {
      try {
        const saved = await saveRentAgreementAction(id ?? null, d, { ...links, propertyId: propertyId || links.propertyId });
        toast.show("Agreement saved.");
        if (printTab) printTab.location.href = `/admin/rentals/agreements/${saved.id}/print`;
        if (then === "download") {
          const a = document.createElement("a");
          a.href = `/admin/rentals/agreements/${saved.id}/pdf`;
          a.download = `rent-agreement-${saved.agreementNo}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        if (!id) router.push(`/admin/rentals/agreements/${saved.id}`);
        else router.refresh();
      } catch (e) {
        printTab?.close();
        setError(e instanceof Error ? e.message : "Could not save this agreement.");
      }
    });
  }

  function keepInDocuments() {
    if (!id) return;
    startTransition(async () => {
      try {
        const r = await saveAgreementToDocumentsAction(id);
        setSavedDocId(r.documentId);
        toast.show("A copy was saved in Documents.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save the copy.");
      }
    });
  }

  function remove() {
    if (!id || !window.confirm("Delete this rent agreement? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteRentAgreementAction(id);
        router.push("/admin/rentals/agreements");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete.");
      }
    });
  }

  const rentWords = d.monthlyRent > 0 ? `${numberToWordsEn(d.monthlyRent)} Rupees Only (Rs. ${groupLakh(d.monthlyRent)}/-)` : "";

  return (
    <div className="space-y-5">
      <Section title="Language and paper" hint="The whole agreement is written in the language you choose. You can change this later and print again.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Language">
            <select value={d.language} onChange={(e) => set({ language: e.target.value as AgreementLanguage })} className={input}>
              <option value="ur">Urdu (اردو) - the whole agreement in Urdu</option>
              <option value="en">English - the whole agreement in English</option>
            </select>
          </Field>
          <Field label="Paper" hint={d.paper === "stamp" ? "The top of the first page is left empty for the stamp. Company details go in the footer." : "Prints with the company logo and details at the top."}>
            <select value={d.paper} onChange={(e) => set({ paper: e.target.value as RentAgreementData["paper"] })} className={input}>
              <option value="plain">Plain paper (with company letterhead)</option>
              <option value="stamp">Stamp paper (leave space for the stamp)</option>
            </select>
          </Field>
          <Field label="Page size" hint="Legal (8.5 x 14 in) is the usual size for agreements; the text is fitted into 2 pages.">
            <select value={d.pageSize} onChange={(e) => set({ pageSize: e.target.value as RentAgreementData["pageSize"] })} className={input}>
              <option value="legal">Legal (8.5 x 14 in)</option>
              <option value="a4">A4</option>
            </select>
          </Field>
          <Field label="Agreement date">
            <input type="date" value={d.agreementDate} onChange={(e) => set({ agreementDate: e.target.value })} className={input} />
          </Field>
          <Pair label="Place" en={d.place} ur={d.placeUr} onEn={(v) => set({ place: v })} onUr={(v) => set({ placeUr: v })} />
        </div>
      </Section>

      <PartyFields
        title="Owner (landlord)"
        party={d.owner}
        onChange={setOwner}
        picker={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <RecordPicker kind="contact" label="Or pick from Customer Contacts" value={null} onChange={(t) => fromContact("owner", t)} />
          </div>
        }
      />

      <PartyFields
        title="Tenant (kirayedar)"
        party={d.tenant}
        onChange={setTenant}
        picker={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <RecordPicker kind="contact" label="Pick from Customer Contacts" value={null} onChange={(t) => fromContact("tenant", t)} />
            <Field label="Tenant is">
              <select value={d.tenantGender} onChange={(e) => set({ tenantGender: e.target.value as "male" | "female" })} className={input}>
                <option value="male">Male (مرد)</option>
                <option value="female">Female (عورت)</option>
              </select>
            </Field>
          </div>
        }
      />

      <Section title="Property">
        <Pair label="House / shop number and street" en={d.property.description} ur={d.property.descriptionUr} onEn={(v) => setProp({ description: v })} onUr={(v) => setProp({ descriptionUr: v })} textarea />
        <Pair label="Area / society" en={d.property.area} ur={d.property.areaUr} onEn={(v) => setProp({ area: v })} onUr={(v) => setProp({ areaUr: v })} />
        <Pair label="City" en={d.property.city} ur={d.property.cityUr} onEn={(v) => setProp({ city: v })} onUr={(v) => setProp({ cityUr: v })} />
        <Pair label="Size (e.g. 1 Kanal, 10 Marla)" en={d.property.size} ur={d.property.sizeUr} onEn={(v) => setProp({ size: v })} onUr={(v) => setProp({ sizeUr: v })} />
        <Pair label="Includes (e.g. gas, electricity, parking)" en={d.property.facilities} ur={d.property.facilitiesUr} onEn={(v) => setProp({ facilities: v })} onUr={(v) => setProp({ facilitiesUr: v })} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Used for">
            <select value={d.property.purpose} onChange={(e) => setProp({ purpose: e.target.value as PropertyPurpose })} className={input}>
              <option value="Residential">Residential (رہائشی)</option>
              <option value="Commercial">Commercial (کمرشل)</option>
              <option value="Office">Office (دفتر)</option>
              <option value="School">School (سکول)</option>
              <option value="Shop">Shop (دکان)</option>
              <option value="Other">Other</option>
            </select>
          </Field>
          {d.property.purpose === "Other" && (
            <Field label="Purpose (write it)">
              <input value={d.property.purposeNote} onChange={(e) => setProp({ purposeNote: e.target.value })} className={input} />
            </Field>
          )}
        </div>
      </Section>

      <Section title="Rent and period">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Monthly rent (Rs.)" hint={rentWords}>
            <input type="number" min={0} value={d.monthlyRent || ""} onChange={(e) => set({ monthlyRent: Number(e.target.value) })} className={input} />
          </Field>
          <Field label="Security deposit (Rs.)" hint="0 = no security">
            <input type="number" min={0} value={d.securityDeposit || ""} onChange={(e) => set({ securityDeposit: Number(e.target.value) })} className={input} />
          </Field>
          <Field label="Rent due by day of month">
            <input type="number" min={1} max={28} value={d.payByDay} onChange={(e) => set({ payByDay: Number(e.target.value) })} className={input} />
          </Field>
          <Field label="Tenancy starts">
            <input type="date" value={d.startDate} onChange={(e) => set({ startDate: e.target.value })} className={input} />
          </Field>
          <Field label="Duration (months)" hint="11 = eleven months, 12 = one year, 60 = five years">
            <input type="number" min={1} value={d.termMonths} onChange={(e) => set({ termMonths: Number(e.target.value) })} className={input} />
          </Field>
          <Field label="Yearly rent increase (%)" hint="0 = no increase">
            <input type="number" min={0} max={100} value={d.yearlyIncreasePercent} onChange={(e) => set({ yearlyIncreasePercent: Number(e.target.value) })} className={input} />
          </Field>
          <Field label="Notice period (months)">
            <input type="number" min={1} max={12} value={d.noticeMonths} onChange={(e) => set({ noticeMonths: Number(e.target.value) })} className={input} />
          </Field>
          <Field label="Utility bills paid by">
            <select value={d.utilitiesBy} onChange={(e) => set({ utilitiesBy: e.target.value as "tenant" | "owner" })} className={input}>
              <option value="tenant">Tenant</option>
              <option value="owner">Owner</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Terms to include" hint="Tick the standard terms you want in this agreement.">
        <div className="space-y-2">
          {OPTION_LABELS.map((o) => (
            <label key={o.key} className="flex items-start gap-2.5 text-sm text-ink">
              <input type="checkbox" checked={d.options[o.key]} onChange={(e) => set({ options: { ...d.options, [o.key]: e.target.checked } })} className="mt-1 h-4 w-4 accent-primary" />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
        <Field label="Extra terms (one per line)" hint="Printed exactly as you type them (in Urdu or English) after the standard terms.">
          <textarea value={d.extraTerms} onChange={(e) => set({ extraTerms: e.target.value })} rows={4} className={input} />
        </Field>
      </Section>

      <Section title="Witnesses" hint="Optional. Leave empty to write the names by hand after printing.">
        {[0, 1].map((i) => (
          <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label={`Witness ${i + 1} name`}>
              <input value={d.witnesses[i].name} onChange={(e) => setWitness(i, { name: e.target.value })} className={input} />
            </Field>
            <Field label="نام (اردو)">
              <input dir="rtl" value={d.witnesses[i].nameUr} onChange={(e) => setWitness(i, { nameUr: e.target.value })} className={inputUr} />
            </Field>
            <Field label="CNIC">
              <input value={d.witnesses[i].cnic} onChange={(e) => setWitness(i, { cnic: e.target.value })} className={input} />
            </Field>
          </div>
        ))}
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
        {d.language === "en" && (
          <button type="button" onClick={() => save("download")} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-60">
            <Download className="h-4 w-4" /> Save &amp; download PDF file
          </button>
        )}
        <button type="button" onClick={() => save("none")} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-60">
          <Save className="h-4 w-4" /> Save only
        </button>
        {id && (
          <>
            {d.language === "en" && (
            <button type="button" onClick={keepInDocuments} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-60">
              <FileStack className="h-4 w-4" /> {savedDocId ? "Save a new copy in Documents" : "Save a copy in Documents"}
            </button>
            )}
            {savedDocId && (
              <a href={`/admin/documents/${savedDocId}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-success hover:underline">
                <CheckCircle2 className="h-4 w-4" /> Open the copy in Documents (send it on WhatsApp from there)
              </a>
            )}
            <button type="button" onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold text-muted hover:bg-primary/10 hover:text-primary disabled:opacity-60">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </>
        )}
        {agreementNo && <span className="text-xs font-semibold text-muted">{agreementNo}</span>}
      </div>
    </div>
  );
}
