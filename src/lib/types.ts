// Shared library types. Pure — no DOM/browser dependencies so a future Node
// CLI can import these directly.

/** A single numeric input field in a calculator's schema. */
export interface FieldDef {
  key: string;
  label: string;
  /** Value used when the field is left blank. */
  default: number;
  /** Inclusive lower bound. */
  min: number;
  /** Inclusive upper bound. */
  max: number;
  /** Slider/number increment. */
  step: number;
  /** Must be present and valid for the calculator to compute. */
  required: boolean;
  /** Fields sharing a group id render together in a checkbox-gated section, treated as 0 when unchecked. */
  group?: string;
  /** Small live-updating caption shown below the input, derived from current field values. */
  hint?: (values: Record<string, number>) => string;
}

/** Display label for a field group, shown next to its enable checkbox. */
export interface FieldGroup {
  id: string;
  label: string;
}

/** A displayable result row. */
export interface Result {
  label: string;
  value: number;
  format: 'currency' | 'percent' | 'ratio';
}

/** One row of a SIP-style monthly series. */
export interface SeriesPoint {
  /** 1-based month index. */
  month: number;
  /** Balance at end of month. */
  value: number;
  /** Cumulative principal contributed (initial + all SIPs). */
  invested: number;
  /** value - invested. */
  gain: number;
  /** value / invested. */
  multiple: number;
  /** Cumulative amount withdrawn via SWP (0 if unused). */
  withdrawn: number;
  /** Interest/growth earned this month (on balance before this month's SIP/SWP). */
  interest: number;
}

/**
 * The output a calculator produces. Either a scrubable monthly series (SIP) or
 * a fixed set of summary numbers (Income Returns).
 */
export type View =
  | { kind: 'series'; points: SeriesPoint[] }
  | { kind: 'static'; results: Result[] };

/** A calculator registration. The UI (tabs, forms, results) is driven by this. */
export interface Calculator {
  id: string;
  title: string;
  fields: FieldDef[];
  groups?: FieldGroup[];
  compute: (values: Record<string, number>) => View;
  /** Maps a series point to display results (only used for series views). */
  describeSeries: (p: SeriesPoint) => Result[];
}
