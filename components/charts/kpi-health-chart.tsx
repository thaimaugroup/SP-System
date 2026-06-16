"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { BusinessRecord } from "@/types/database";

export function KpiHealthChart({ readings }: { readings: BusinessRecord[] }) {
  const data = readings.map((record, index) => ({
    name: record.title ?? `Reading ${index + 1}`,
    // Support both field naming conventions: actual_value (legacy) and actual (current schema)
    actual: Number(record.data?.actual ?? record.data?.actual_value ?? 0),
    target: Number(record.data?.target ?? record.data?.target_value ?? 0)
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#D9E2EC" strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey="actual" stroke="#145C9E" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="target" stroke="#2E7D32" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

