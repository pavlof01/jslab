"use client";

import { useCallback, useMemo } from "react";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  CUSTOM_SAMPLES_STORAGE_KEY,
  type CustomSample,
  parseCustomSamples,
} from "@/lib/customSamples";

export function useCustomSamples() {
  const [stored, setStored] = useLocalStorage<unknown>(CUSTOM_SAMPLES_STORAGE_KEY, []);

  const samples = useMemo(() => parseCustomSamples(JSON.stringify(stored)), [stored]);

  const update = useCallback(
    (change: (previous: CustomSample[]) => CustomSample[]) => {
      setStored((previous: unknown) => change(parseCustomSamples(JSON.stringify(previous))));
    },
    [setStored],
  );

  const add = useCallback(
    (sample: Omit<CustomSample, "id" | "createdAt">, id: string, now: number): CustomSample => {
      const created: CustomSample = { ...sample, id, createdAt: now };
      update((previous) => [...previous, created]);
      return created;
    },
    [update],
  );

  const rename = useCallback(
    (id: string, name: string, description: string) => {
      update((previous) => previous.map((s) => (s.id === id ? { ...s, name, description } : s)));
    },
    [update],
  );

  const remove = useCallback(
    (id: string) => {
      update((previous) => previous.filter((s) => s.id !== id));
    },
    [update],
  );

  return { samples, add, rename, remove };
}
