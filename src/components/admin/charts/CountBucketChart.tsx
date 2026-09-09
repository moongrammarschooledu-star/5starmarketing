"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { CountBucket } from "@/lib/models/analytics";

const BAR_COLOR = "#C81E2C";

export function CountBucketChart({ title, data, empty }: { title: string; data: CountBucket[]; empty?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-heading text-sm font-bold text-ink">{title}</h3>
      {data.length === 0 ? (
        <p className="mt-8 pb-8 text-center text-sm text-muted">{empty ?? "No data available yet."}</p>
      ) : (
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
