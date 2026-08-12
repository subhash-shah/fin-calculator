import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sipTable } from '../src/lib/sip.ts';

// Fixtures are the spreadsheet's cached values (Sheet1) — reproduced with
// initial=0, rate=10, SIP=23,205, SWP=0, no step-up.
const plain = () =>
  sipTable({ initial: 0, rate: 10, sip: 23205, swp: 0, stepUp: 0, years: 40, months: 0 });

test('SIP: reproduces spreadsheet 10/20/30/40-year values', () => {
  const rows = plain();
  const expect = [
    { y: 10, value: 4753427.74, invested: 2784600, multiple: 1.707041 },
    { y: 20, value: 17621153.84, invested: 5569200, multiple: 3.164037 },
    { y: 30, value: 52454622.29, invested: 8353800, multiple: 6.279133 },
    { y: 40, value: 146750266.68, invested: 11138400, multiple: 13.175166 },
  ];
  for (const e of expect) {
    const p = rows[e.y * 12 - 1];
    assert.ok(Math.abs(p.value - e.value) < 0.01, `value ${e.y}y`);
    assert.equal(p.invested, e.invested);
    assert.ok(Math.abs(p.multiple - e.multiple) < 1e-5, `multiple ${e.y}y`);
  }
});

test('SIP: step-up of 0 behaves identically to plain SIP', () => {
  const plainRows = sipTable({ initial: 5000, rate: 8, sip: 2000, swp: 100, stepUp: 0, years: 5, months: 3 });
  const steppedZero = sipTable({ initial: 5000, rate: 8, sip: 2000, swp: 100, stepUp: 0, years: 5, months: 3 });
  assert.deepEqual(plainRows, steppedZero);
});

test('SIP: step-up grows the monthly contribution each year', () => {
  // initial 0, rate 12, SIP 5,000/mo, 5% step-up, 20y -> formula-derived fixture.
  const last = sipTable({ initial: 0, rate: 12, sip: 5000, swp: 0, stepUp: 5, years: 20, months: 0 }).at(-1)!;
  assert.ok(Math.abs(last.value - 6800803.61) < 0.01, 'final value');
  assert.ok(Math.abs(last.multiple - 3.427898) < 1e-5, 'multiple');
  // With 0% rate, balance grows only by contributions: month 13's balance is
  // the previous month plus the stepped-up 1000*1.05 contribution.
  const raw = sipTable({ initial: 0, rate: 0, sip: 1000, swp: 0, stepUp: 5, years: 2, months: 1 });
  assert.ok(Math.abs(raw[12].value - (raw[11].value + 1000 * 1.05)) < 1e-9, 'year-2 contribution stepped up');
});

test('SIP: contributions land at end of month (interest before SIP)', () => {
  // initial 0, rate 12, SIP 1000: month 1 has interest 0 -> balance 1000.
  const rows = sipTable({ initial: 0, rate: 12, sip: 1000, swp: 0, stepUp: 0, years: 1, months: 1 });
  assert.equal(rows[0].value, 1000);
  // Month 2: interest on 1000 (=10) + 1000 contribution.
  assert.ok(Math.abs(rows[1].value - (1000 + 10 + 1000)) < 1e-9);
});

test('SIP: invested accumulates initial plus monthly contributions', () => {
  const rows = sipTable({ initial: 5000, rate: 0, sip: 1000, swp: 0, stepUp: 0, years: 1, months: 3 });
  assert.equal(rows[2].invested, 5000 + 1000 * 3);
});
