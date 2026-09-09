"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function TrendChart({ title, data, empty }: { title: string; data: { date: string; count: number }[]; empty?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-heading text-sm font-bold text-ink">{title}</h3>
      {data.length === 0 ? (
        <p className="mt-8 pb-8 text-center text-sm text-muted">{empty ?? "No data available yet."}</p>
      ) : (
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#C81E2C" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
