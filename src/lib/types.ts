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
  compute: (values: Record<string, number>) => View;
  /** Maps a series point to display results (only used for series views). */
  describeSeries: (p: SeriesPoint) => Result[];
}
