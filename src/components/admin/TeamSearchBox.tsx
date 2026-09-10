"use client";

import { useState, type FormEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";

export function TeamSearchBox({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();
  const pathname = usePathname();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5">
      <Search className="h-4 w-4 text-muted" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by name, email, role or status…"
        className="flex-1 bg-transparent text-sm text-ink outline-none"
      />
    </form>
  );
}
