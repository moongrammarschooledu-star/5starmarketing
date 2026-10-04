import { Lock } from "lucide-react";
import type { OwnerDetails } from "@/lib/models/ownerDetails";

/** `owner`: undefined = a new record (empty fields), an object = loaded
 *  details, null = the details could not be loaded - the section then
 *  says so and leaves whatever is stored untouched on save. */
export function OwnerDetailsSection({ owner }: { owner?: OwnerDetails | null }) {
  const loadFailed = owner === null;
  const o = owner ?? undefined;

  return (
    <section className="rounded-2xl border-2 border-primary/25 bg-primary/[0.03] p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
        <Lock className="h-4 w-4 text-primary" /> Owner Details (private)
      </h2>
      <p className="mt-1 text-xs font-semibold text-primary">
        For the team only. Never shown on the public website, brochures, Facebook posts, search engines or the public AI chat.
      </p>

      {loadFailed ? (
        <p className="mt-4 rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-muted">
          The saved owner details could not be loaded right now, so this section is disabled and the stored details will not be
          changed. Refresh the page to try again.
        </p>
      ) : (
        <>
          <input type="hidden" name="ownerSection" value="1" />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <OwnerField label="Owner Name" name="ownerName" defaultValue={o?.name} />
            <OwnerField label="Owner Phone" name="ownerPhone" type="tel" defaultValue={o?.phone} placeholder="e.g. 0300-1234567" />
            <OwnerField label="Alternate Phone / WhatsApp" name="ownerAltPhone" type="tel" defaultValue={o?.altPhone} />
            <OwnerField label="Owner Address" name="ownerAddress" defaultValue={o?.address} className="sm:col-span-2" />
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-semibold text-ink">Private Notes</span>
              <textarea
                name="ownerNotes"
                defaultValue={o?.notes}
                rows={3}
                placeholder="Anything else the team should know: agreed terms, best time to call, documents received..."
                className="w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary"
              />
            </label>
          </div>
        </>
      )}
    </section>
  );
}

function OwnerField({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className ?? ""}`}>
      <span className="font-semibold text-ink">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}
