"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, Eye, Pencil, Trash2, Star } from "lucide-react";
import type { Property, PropertyStatus } from "@/lib/models/property";
import { propertyTypes, locationAreas, propertyStatuses, paymentOptions } from "@/lib/models/property";
import { deletePropertyAction, toggleFeaturedAction, changeStatusAction } from "@/lib/actions/properties.actions";
import { ConfirmDialog, useConfirmDelete } from "./ConfirmDialog";
import { useToast } from "./ToastProvider";

const ALL = "All";

export function PropertiesTable({ properties }: { properties: Property[] }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>(ALL);
  const [locationArea, setLocationArea] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [paymentOption, setPaymentOption] = useState<string>(ALL);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const del = useConfirmDelete<Property>(async (id) => {
    await deletePropertyAction(id);
    toast.show("Property deleted.");
    router.refresh();
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return properties.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q) && !p.location.toLowerCase().includes(q)) return false;
      if (type !== ALL && p.type !== type) return false;
      if (locationArea !== ALL && p.locationArea !== locationArea) return false;
      if (status !== ALL && p.status !== status) return false;
      if (paymentOption !== ALL && !p.paymentOption.includes(paymentOption)) return false;
      return true;
    });
  }, [properties, search, type, locationArea, status, paymentOption]);

  function toggleFeatured(id: string) {
    startTransition(async () => {
      await toggleFeaturedAction(id);
      toast.show("Featured status updated.");
      router.refresh();
    });
  }

  function changeStatus(id: string, next: PropertyStatus) {
    startTransition(async () => {
      await changeStatusAction(id, next);
      toast.show("Status updated.");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or location..."
            className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FilterSelect label="Type" value={type} onChange={setType} options={[ALL, ...propertyTypes]} />
          <FilterSelect label="Location" value={locationArea} onChange={setLocationArea} options={[ALL, ...locationAreas]} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={[ALL, ...propertyStatuses]} />
          <FilterSelect label="Payment" value={paymentOption} onChange={setPaymentOption} options={[ALL, ...paymentOptions]} />
        </div>
      </div>

      <p className="mt-4 text-sm font-medium text-muted">
        Showing {filtered.length} of {properties.length} properties
      </p>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Property Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-muted">
                  No properties match those filters.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                <td className="px-4 py-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                    <Image src={p.images[0]} alt={p.title} fill sizes="48px" className="object-cover" unoptimized={p.images[0]?.startsWith("data:")} />
                  </div>
                </td>
                <td className="max-w-[220px] px-4 py-3 font-semibold text-ink">
                  <span className="line-clamp-1">{p.title}</span>
                </td>
                <td className="px-4 py-3 text-muted">{p.type}</td>
                <td className="max-w-[160px] px-4 py-3 text-muted">
                  <span className="line-clamp-1">{p.location}</span>
                </td>
                <td className="px-4 py-3 text-muted">{p.size}</td>
                <td className="px-4 py-3 font-semibold text-primary">{p.price}</td>
                <td className="px-4 py-3">
                  <select
                    value={p.status}
                    disabled={isPending}
                    onChange={(e) => changeStatus(p.id, e.target.value as PropertyStatus)}
                    className="rounded-full border border-border bg-surface px-2 py-1 text-xs font-bold text-ink outline-none focus:border-primary"
                  >
                    {propertyStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => toggleFeatured(p.id)}
                    className={
                      p.featured
                        ? "flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary"
                        : "flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted"
                    }
                  >
                    <Star className={`h-3.5 w-3.5 ${p.featured ? "fill-primary" : ""}`} />
                    {p.featured ? "Featured" : "Not Featured"}
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                  {new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/properties/${p.id}`}
                      target="_blank"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                      aria-label="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/admin/properties/${p.id}/edit`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => del.open(p)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:border-primary hover:text-primary"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!del.target}
        message="Are you sure you want to delete this property? This cannot be undone."
        confirmLabel="Delete Property"
        busy={del.busy}
        onConfirm={del.confirm}
        onClose={del.close}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-semibold text-ink outline-none focus:border-primary"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
