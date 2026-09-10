"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Power } from "lucide-react";
import type { DocumentChecklist, DocumentChecklistItem, DocumentType } from "@/lib/models/document";
import { dealTypes } from "@/lib/models/deal";
import { propertyTypes } from "@/lib/models/property";
import {
  createChecklistAction,
  updateChecklistAction,
  removeChecklistAction,
  addChecklistItemAction,
  updateChecklistItemAction,
  removeChecklistItemAction,
} from "@/lib/actions/documents.actions";
import { useToast } from "@/components/admin/ToastProvider";
import { Modal } from "@/components/admin/Modal";

export function DocumentChecklistManager({ checklists, itemsByChecklist, types }: { checklists: DocumentChecklist[]; itemsByChecklist: Record<string, DocumentChecklistItem[]>; types: DocumentType[] }) {
  const [activeId, setActiveId] = useState<string | null>(checklists[0]?.id ?? null);
  const [showNewChecklist, setShowNewChecklist] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [showNewItem, setShowNewItem] = useState(false);
  const [itemType, setItemType] = useState(types[0]?.code ?? "OTHER");
  const [itemRequired, setItemRequired] = useState(true);
  const [itemPropertyType, setItemPropertyType] = useState("");
  const [itemDealType, setItemDealType] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const active = checklists.find((c) => c.id === activeId) ?? null;
  const items = active ? itemsByChecklist[active.id] ?? [] : [];

  function createChecklist() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const c = await createChecklistAction({ name: newName.trim(), description: newDescription.trim() || undefined });
      toast.show("Checklist created.");
      setShowNewChecklist(false);
      setNewName("");
      setNewDescription("");
      setActiveId(c.id);
      router.refresh();
    });
  }

  function toggleChecklistActive(c: DocumentChecklist) {
    startTransition(async () => {
      await updateChecklistAction(c.id, { active: !c.active });
      toast.show(c.active ? "Deactivated." : "Activated.");
      router.refresh();
    });
  }

  function deleteChecklist(c: DocumentChecklist) {
    if (!confirm(`Delete "${c.name}" and all its items?`)) return;
    startTransition(async () => {
      await removeChecklistAction(c.id);
      toast.show("Checklist deleted.");
      if (activeId === c.id) setActiveId(null);
      router.refresh();
    });
  }

  function addItem() {
    if (!active) return;
    startTransition(async () => {
      await addChecklistItemAction({
        checklistId: active.id,
        documentType: itemType,
        required: itemRequired,
        sortOrder: items.length + 1,
        applicablePropertyType: itemPropertyType || undefined,
        applicableDealType: itemDealType || undefined,
        active: true,
      });
      toast.show("Item added.");
      setShowNewItem(false);
      setItemPropertyType("");
      setItemDealType("");
      router.refresh();
    });
  }

  function toggleItemRequired(item: DocumentChecklistItem) {
    startTransition(async () => {
      await updateChecklistItemAction(item.id, { required: !item.required });
      router.refresh();
    });
  }

  function removeItem(item: DocumentChecklistItem) {
    startTransition(async () => {
      await removeChecklistItemAction(item.id);
      toast.show("Item removed.");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <button type="button" onClick={() => setShowNewChecklist(true)} className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> New Checklist
        </button>
        <div className="mt-3 space-y-2">
          {checklists.length === 0 && <p className="text-sm text-muted">No checklists yet.</p>}
          {checklists.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              className={`block w-full rounded-xl border p-3 text-left text-sm ${activeId === c.id ? "border-primary bg-primary/5" : "border-border bg-surface"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">{c.name}</span>
                {!c.active && <span className="rounded-full bg-muted/20 px-2 py-0.5 text-[10px] font-bold text-muted">Inactive</span>}
              </div>
              {c.description && <div className="mt-0.5 text-xs text-muted">{c.description}</div>}
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {!active ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">Select or create a checklist.</div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading text-base font-bold text-ink">{active.name}</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => toggleChecklistActive(active)} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary disabled:opacity-50">
                  <Power className="h-3.5 w-3.5" /> {active.active ? "Deactivate" : "Activate"}
                </button>
                <button type="button" onClick={() => deleteChecklist(active)} disabled={isPending} className="flex items-center gap-1.5 rounded-full border-2 border-primary/30 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>

            <button type="button" onClick={() => setShowNewItem(true)} className="flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
              <Plus className="h-4 w-4" /> Add Item
            </button>

            <div className="space-y-2">
              {items.length === 0 && <p className="text-sm text-muted">No items yet.</p>}
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted p-3 text-sm">
                  <div>
                    <div className="font-semibold text-ink">{item.documentTypeLabel ?? item.documentType}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {item.applicableDealType ?? "Any deal type"} · {item.applicablePropertyType ?? "Any property type"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleItemRequired(item)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.required ? "bg-primary/10 text-primary" : "bg-muted/20 text-muted"}`}
                    >
                      {item.required ? "Required" : "Optional"}
                    </button>
                    <button type="button" onClick={() => removeItem(item)} className="flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-primary/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal open={showNewChecklist} onClose={() => setShowNewChecklist(false)} title="New Checklist">
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Name</span>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Residential Property Sale Checklist" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Description</span>
            <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setShowNewChecklist(false)} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink">
            Cancel
          </button>
          <button type="button" onClick={createChecklist} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Create
          </button>
        </div>
      </Modal>

      <Modal open={showNewItem} onClose={() => setShowNewItem(false)} title="Add Checklist Item">
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Document Type</span>
            <select value={itemType} onChange={(e) => setItemType(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
              {types.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Deal Type</span>
              <select value={itemDealType} onChange={(e) => setItemDealType(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
                <option value="">Any</option>
                {dealTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Property Type</span>
              <select value={itemPropertyType} onChange={(e) => setItemPropertyType(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary">
                <option value="">Any</option>
                {propertyTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={itemRequired} onChange={(e) => setItemRequired(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            <span className="font-semibold text-ink">Required</span>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setShowNewItem(false)} className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink">
            Cancel
          </button>
          <button type="button" onClick={addItem} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Add
          </button>
        </div>
      </Modal>
    </div>
  );
}
