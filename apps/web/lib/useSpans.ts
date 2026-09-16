"use client";

import { useQuery } from "@tanstack/react-query";

export interface Span {
  id: number;
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  serviceId: number;
  name: string;
  startTime: string;
  durationMs: number;
  statusCode: number | null;
  attributes: Record<string, unknown> | null;
  createdAt: string;
}

async function fetchSpans(): Promise<Span[]> {
  const res = await fetch("http://localhost:3001/spans");

  if (!res.ok) {
    throw new Error(`Failed to fetch spans: ${res.status}`);
  }

  return res.json();
}

export function useSpans() {
  return useQuery({
    queryKey: ["spans"],
    queryFn: fetchSpans,
  });
}