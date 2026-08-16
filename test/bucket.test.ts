import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bucketTable } from '../src/lib/bucket.ts';

// Fixtures derived by hand-executing the agreed recurrence:
// each month withdraw SIM from Bucket 1 (cascade to Bucket 2 if short);
// if Bucket 1 < SIM afterwards, refill with 50% of Bucket 2's balance;
// at year end, accrue each bucket's annual return.

test('Bucket: wipeout month and partial final row under zero growth', () => {
  // capital 1,000,000; 50/50 split; SIM 100,000/mo; no returns; no step-up.
  // Bucket 1 = 500,000. Months 1-4: withdraw 100,000 -> 400/300/200/100k; at
  // month 4 Bucket 1 = 100,000 = SIM -> no refill (only below triggers).
  // Month 5: 100,000 -> 0; 0 < SIM -> refill 50% of 500,000 = 250,000.
  // Then each month Bucket 1 falls below SIM again and refills halve Bucket 2:
  // M6: b1 150k; M7: refill 125k; M8: refill 62.5k; M9: refill 31.25k;
  // M10: 68.75k - 100k -> cascade 31.25k from Bucket 2 (now 0), no refill;
  // M11: total 0 < 100k -> wipeout.
  const rows = bucketTable({ capital: 1000000, portion: 50, return1: 0, return2: 0, withdrawal: 100000, stepUp: 0, years: 10 });
  const last = rows.at(-1)!;
  assert.equal(rows.length, 11, 'series stops at wipeout month');
  assert.equal(last.month, 11, 'wipeout at month 11');
  assert.equal(last.depleted, true);
  assert.equal(last.value, 0);
  assert.equal(last.withdrawn, 1000000, 'all capital withdrawn');
  assert.ok(Math.abs(last.bucket1! - 0) < 1e-9);
  assert.ok(Math.abs(last.bucket2! - 0) < 1e-9);
});

test('Bucket: refill transfers exactly half of Bucket 2', () => {
  // capital 1,000,000; 10/90; SIM 50,000; 0% returns; 1 year.
  // Month 1: withdraw 50,000 from Bucket 1 (100,000 -> 50,000); 50,000 < 50,000?
  // no (equal, not below) -> no refill. Month 2: Bucket 1 -> 0; 0 < 50,000 ->
  // refill = 50% of 900,000 = 450,000. Bucket 1 = 450,000, Bucket 2 = 450,000.
  const rows = bucketTable({ capital: 1000000, portion: 10, return1: 0, return2: 0, withdrawal: 50000, stepUp: 0, years: 1 });
  const m2 = rows[1];
  assert.ok(Math.abs(m2.bucket1! - 450000) < 1e-9, 'bucket 1 after refill');
  assert.ok(Math.abs(m2.bucket2! - 450000) < 1e-9, 'bucket 2 halved');
  assert.equal(m2.value, 900000);
});

test('Bucket: no refill when Bucket 1 is at or above SIM', () => {
  // capital 1,000,000; 90/10; SIM 10,000; 0% returns. Bucket 1 stays well above
  // SIM all year -> Bucket 2 untouched until year-end (which is 0% anyway).
  const rows = bucketTable({ capital: 1000000, portion: 90, return1: 0, return2: 0, withdrawal: 10000, stepUp: 0, years: 1 });
  const last = rows.at(-1)!;
  assert.ok(Math.abs(last.bucket1! - (900000 - 120000)) < 1e-9, 'bucket 1 only drained');
  assert.equal(last.bucket2, 100000, 'bucket 2 untouched');
});

test('Bucket: returns accrue once per year, not monthly', () => {
  // capital 1,000,000; 50/50; SIM 0; returns 12% both; 1 year.
  // Interest only in month 12: 500,000 * 12% * 2 buckets = 120,000.
  const rows = bucketTable({ capital: 1000000, portion: 50, return1: 12, return2: 12, withdrawal: 0, stepUp: 0, years: 1 });
  assert.equal(rows[0].interest, 0, 'no interest in month 1');
  assert.equal(rows[10].interest, 0, 'no interest in month 11');
  assert.ok(Math.abs(rows[11].interest - 120000) < 1e-9, 'year-end accrual');
  assert.ok(Math.abs(rows[11].value - 1120000) < 1e-9);
});

test('Bucket: step-up grows the monthly withdrawal each year', () => {
  // capital 10,000,000; 50/50; SIM 100,000, 10% step-up; 0% returns; 3 years.
  // Year 1 SIM = 100,000; year 2 = 110,000; year 3 = 121,000.
  const rows = bucketTable({ capital: 10000000, portion: 50, return1: 0, return2: 0, withdrawal: 100000, stepUp: 10, years: 3 });
  const month13 = rows[12];
  const month25 = rows[24];
  const w1 = rows[0].withdrawn;
  const w2 = month13.withdrawn - rows[11].withdrawn;
  const w3 = month25.withdrawn - rows[23].withdrawn;
  assert.equal(w1, 100000);
  assert.ok(Math.abs(w2 - 110000) < 1e-9, 'year 2 withdrawal stepped');
  assert.ok(Math.abs(w3 - 121000) < 1e-9, 'year 3 withdrawal stepped');
});

test('Bucket: survives the full horizon when capital covers withdrawals', () => {
  // capital 100,000,000; 20/80; SIM 100,000; 3%/8% returns; 60 years -> no wipeout.
  const rows = bucketTable({ capital: 100000000, portion: 20, return1: 3, return2: 8, withdrawal: 100000, stepUp: 0, years: 60 });
  assert.equal(rows.length, 720, 'full 60-year series');
  assert.equal(rows.at(-1)!.depleted, false);
  assert.ok(rows.at(-1)!.value > 0);
});
