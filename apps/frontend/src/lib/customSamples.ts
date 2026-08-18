import { sampleCatalog } from "@/lib/samples";

export interface CustomSample {
  id: string;
  name: string;
  code: string;
  createdAt: number;
  description?: string;
}

export const CUSTOM_SAMPLES_STORAGE_KEY = "js-bytecode-web.custom-samples";

function isCustomSample(value: unknown): value is CustomSample {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.name === "string" &&
    typeof entry.code === "string" &&
    (entry.description === undefined || typeof entry.description === "string")
  );
}

export function parseCustomSamples(raw: string | null): CustomSample[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCustomSample).map((entry) => ({ ...entry, createdAt: entry.createdAt ?? 0 }));
  } catch {
    return [];
  }
}

export function loadCustomSamples(storage: Storage = window.localStorage): CustomSample[] {
  try {
    return parseCustomSamples(storage.getItem(CUSTOM_SAMPLES_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveCustomSamples(samples: CustomSample[], storage: Storage = window.localStorage): void {
  try {
    storage.setItem(CUSTOM_SAMPLES_STORAGE_KEY, JSON.stringify(samples));
  } catch {
  }
}

export function isNameTaken(name: string, samples: readonly CustomSample[], exceptId?: string): boolean {
  const normalized = name.trim().toLowerCase();
  return (
    samples.some((sample) => sample.id !== exceptId && sample.name.toLowerCase() === normalized) ||
    sampleCatalog.some((sample) => sample.label.toLowerCase() === normalized)
  );
}

export type NameError = "empty" | "taken";

export function validateName(
  name: string,
  samples: readonly CustomSample[],
  exceptId?: string,
): NameError | undefined {
  if (!name.trim()) return "empty";
  if (isNameTaken(name, samples, exceptId)) return "taken";
  return undefined;
}

export const NAME_ERROR_TEXT: Record<NameError, string> = {
  empty: "Please provide a name for the sample.",
  taken: "A sample with this name already exists.",
};
