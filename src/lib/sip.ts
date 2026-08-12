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
  years: number;
  months: number;
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
  const points: SeriesPoint[] = [];

  for (let m = 1; m <= n; m++) {
    // SIP steps up once per year, on the first month of each new year.
    const sipM = i.sip * Math.pow(1 + i.stepUp / 100, Math.floor((m - 1) / 12));
    balance += balance * monthlyRate - i.swp + sipM;
    invested += sipM;
    points.push({
      month: m,
      value: balance,
      invested,
      gain: balance - invested,
      multiple: balance / invested,
    });
  }
  return points;
}
