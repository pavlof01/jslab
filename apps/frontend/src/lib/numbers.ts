export function finiteOr(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toPositiveInt(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.ceil(parsed) : undefined;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function withinOr(value: unknown, { min, max, fallback }: { min: number; max: number; fallback: number }): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > min && parsed < max ? parsed : fallback;
}
