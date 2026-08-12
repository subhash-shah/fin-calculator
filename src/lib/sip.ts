import type { SeriesPoint } from './types.ts';

export interface SipInputs {
  initial: number;
  /** Annual rate in percent (10 = 10%). */
  rate: number;
  /** Monthly contribution. */
  sip: number;
  /** Monthly withdrawal. */
  swp: number;
  /** Annual step-up of the SIP in percent (0 = no step-up). */
  stepUp: number;
  /** Annual step-up of the SWP in percent (0 = no step-up). */
  swpStepUp?: number;
  years: number;
  months: number;
}

/** Monthly SIP amount in the final month, after annual step-up compounding. */
export function lastMonthlySip(i: Pick<SipInputs, 'sip' | 'stepUp' | 'years' | 'months'>): number {
  const n = i.years * 12 + i.months;
  if (n <= 0) return i.sip;
  return i.sip * Math.pow(1 + i.stepUp / 100, Math.floor((n - 1) / 12));
}

/** Monthly SWP amount in the final month, after annual step-up compounding. */
export function lastMonthlySwp(i: Pick<SipInputs, 'swp' | 'swpStepUp' | 'years' | 'months'>): number {
  const n = i.years * 12 + i.months;
  if (n <= 0) return i.swp;
  return i.swp * Math.pow(1 + (i.swpStepUp ?? 0) / 100, Math.floor((n - 1) / 12));
}

/**
 * Full monthly SIP series. Monthly compounding at rate/12, contributions and
 * withdrawals applied at end of month. Matches spreadsheet Sheet1 exactly.
 */
export function sipTable(i: SipInputs): SeriesPoint[] {
  const n = i.years * 12 + i.months;
  const monthlyRate = i.rate / 100 / 12;
  let balance = i.initial;
  let invested = i.initial;
  let withdrawn = 0;
  const points: SeriesPoint[] = [];

  for (let m = 1; m <= n; m++) {
    // SIP steps up once per year, on the first month of each new year.
    const sipM = i.sip * Math.pow(1 + i.stepUp / 100, Math.floor((m - 1) / 12));
    const swpM = i.swp * Math.pow(1 + (i.swpStepUp ?? 0) / 100, Math.floor((m - 1) / 12));
    const interest = balance * monthlyRate;
    balance += interest - swpM + sipM;
    invested += sipM;
    withdrawn += swpM;
    points.push({
      month: m,
      value: balance,
      invested,
      gain: balance - invested,
      multiple: balance / invested,
      withdrawn,
      interest,
    });
  }
  return points;
}
