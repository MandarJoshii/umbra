"use client";

import { useQuery } from "@tanstack/react-query";

export interface Service {
  id: number;
  name: string;
  createdAt: string;
}

async function fetchServices(): Promise<Service[]> {
  const res = await fetch("http://localhost:3001/services");

  if (!res.ok) {
    throw new Error(`Failed to fetch services: ${res.status}`);
  }

  return res.json();
}

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: fetchServices,
  });
}