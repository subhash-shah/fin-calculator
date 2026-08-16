import type { SeriesPoint } from './types.ts';

export interface BucketInputs {
  /** Total initial capital. */
  capital: number;
  /** Bucket 1 (Spending) portion in percent; Bucket 2 = 100 - portion. */
  portion: number;
  /** Bucket 1 annual return in percent (accrued once per year). */
  return1: number;
  /** Bucket 2 annual return in percent (accrued once per year). */
  return2: number;
  /** Monthly withdrawal amount (SIM). */
  withdrawal: number;
  /** Annual step-up of the monthly withdrawal in percent (0 = none). */
  stepUp: number;
  /** Horizon in whole years. */
  years: number;
}

/**
 * Full monthly bucket-strategy series. Each month: withdraw SIM from Bucket 1
 * (cascading to Bucket 2 if short); if Bucket 1 < SIM afterwards, refill with
 * 50% of Bucket 2's balance; at year end, accrue each bucket's annual return.
 * Ends at the horizon or at the wipeout month (total < SIM), whichever first.
 */
export function bucketTable(i: BucketInputs): SeriesPoint[] {
  const n = i.years * 12;
  let b1 = (i.capital * i.portion) / 100;
  let b2 = i.capital - b1;
  let withdrawn = 0;
  const points: SeriesPoint[] = [];

  for (let m = 1; m <= n; m++) {
    const sim = i.withdrawal * Math.pow(1 + i.stepUp / 100, Math.floor((m - 1) / 12));

    // Withdraw SIM: Bucket 1 first, cascade to Bucket 2.
    let take = sim;
    const fromB1 = Math.min(b1, take);
    b1 -= fromB1;
    take -= fromB1;
    const fromB2 = Math.min(b2, take);
    b2 -= fromB2;
    take -= fromB2;
    withdrawn += fromB1 + fromB2;

    if (take > 0) {
      // Wipeout: cannot cover the full withdrawal this month.
      const total = b1 + b2;
      points.push({
        month: m,
        value: total,
        invested: i.capital,
        gain: total - i.capital,
        multiple: i.capital > 0 ? total / i.capital : 0,
        withdrawn,
        interest: 0,
        bucket1: b1,
        bucket2: b2,
        depleted: true,
      });
      break;
    }

    // On-demand refill: half of Bucket 2 whenever Bucket 1 < SIM.
    let refill = 0;
    if (b1 < sim && b2 > 0) {
      refill = 0.5 * b2;
      b1 += refill;
      b2 -= refill;
    }

    // Year-end accrual of each bucket's annual return.
    let interest = 0;
    if (m % 12 === 0) {
      interest = (b1 * i.return1) / 100 + (b2 * i.return2) / 100;
      b1 += (b1 * i.return1) / 100;
      b2 += (b2 * i.return2) / 100;
    }

    const total = b1 + b2;
    points.push({
      month: m,
      value: total,
      invested: i.capital,
      gain: total - i.capital,
      multiple: i.capital > 0 ? total / i.capital : 0,
      withdrawn,
      interest,
      bucket1: b1,
      bucket2: b2,
      depleted: false,
      refill,
    });
  }
  return points;
}
