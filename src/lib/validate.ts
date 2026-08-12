import type { FieldDef } from './types.ts';

/**
 * Parse + validate a single numeric field from its raw string input.
 * Returns an error message, or null if the value is valid.
 */
export function validateField(def: FieldDef, raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return def.required ? `${def.label} is required` : null; // blank uses default
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return `${def.label} must be a number`;
  if (value < def.min) return `${def.label} must be at least ${def.min}`;
  if (value > def.max) return `${def.label} must be at most ${def.max}`;
  return null;
}

/** Parse a raw string to a number, falling back to the field default. */
export function parseField(def: FieldDef, raw: string): number {
  const trimmed = raw.trim();
  return trimmed === '' ? def.default : Number(trimmed);
}
