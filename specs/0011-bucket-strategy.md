# 0011 — Bucket Strategy Returns Calculator

> Source of truth: `docs/3-bucket-strategy.md` policy doc, simplified to the 2-bucket
> model agreed during design. Domain vocabulary in `CONTEXT.md`.

## Problem Statement

The user plans retirement withdrawals from capital split across two buckets — a
Spending bucket that pays monthly withdrawals and a Reserve bucket that stays invested
and refills it. They want to know how long the money lasts (or its value after N years)
under chosen returns, split, and withdrawal step-up — without doing the month-by-month
arithmetic by hand.

## Solution

A third calculator tab, "Bucket Strategy", in the existing web app. It simulates the
2-bucket pipeline month by month: monthly withdrawals draw from the Spending bucket
(Bucket 1); whenever Bucket 1 falls below the monthly withdrawal amount, half of the
Reserve bucket's (Bucket 2) current balance is transferred into Bucket 1; each bucket's
annual return accrues once per year on its year-end balance; the monthly withdrawal
steps up annually. The run ends at 60 years or at capital wipeout, whichever comes
first. Output is a monthly per-bucket series (chart + table + CSV/PDF export, like the
SIP calculator) with totals including the wipeout month when applicable.

## User Stories

1. As a user, I want a Bucket Strategy tab alongside SIP and Income Returns, so that I
   can switch to it without leaving the app.
2. As a user, I want to enter my investment capital, so that the buckets are sized from
   it.
3. As a user, I want to enter the Spending bucket portion as a percentage, so that the
   Reserve bucket portion is derived (100 − it) and the split always sums to 100.
4. As a user, I want to see the derived Reserve bucket portion shown live, so that I
   know the split without computing it.
5. As a user, I want separate annual return inputs for each bucket, so that I can model
   a low-risk Spending bucket and a growth Reserve bucket.
6. As a user, I want to enter the monthly withdrawal amount (SIM), so that it matches
   my planned retirement drawdown.
7. As a user, I want an optional annual withdrawal step-up, so that I can model
   inflation-adjusted withdrawals.
8. As a user, I want the monthly withdrawal drawn from the Spending bucket first, so
   that the Reserve bucket stays invested.
9. As a user, I want the Spending bucket refilled with 50% of the Reserve bucket's
   balance whenever it drops below the monthly withdrawal, so that withdrawals can
   continue without me intervening.
10. As a user, I want withdrawals to cascade to the Reserve bucket when the Spending
    bucket cannot cover a month, so that the model stays realistic when Bucket 1 runs
    dry mid-year.
11. As a user, I want the simulation to stop at the wipeout month when total capital
    cannot cover the withdrawal, and report that month, so that I know how long the
    plan lasts.
12. As a user, I want growth applied once per year (not monthly) per bucket, so that
    the model matches the bucket strategy's yearly-refresh nature.
13. As a user, I want a horizon input (default 60 years), so that I can see the value
    at a target year when the capital survives.
14. As a user, I want a monthly table and chart of both bucket balances plus the total,
    so that I can watch the pipeline drain and refill over time.
15. As a user, I want final results — total value, total withdrawn, gain, multiple,
    and wipeout month when it occurred — so that I can judge the plan's outcome at a
    glance.
16. As a user, I want invalid input (negative values, portions out of range, zero
    capital) to block the result with an inline error, so that I never see a
    misleading number.
17. As a developer, I want the bucket math importable as a pure library function, so
    that a future CLI can reuse it like the SIP math.

## Implementation Decisions

- **2-bucket model only.** Bucket 1 = Spending bucket (withdrawals, refill target =
  SIM), Bucket 2 = Reserve bucket (refill source, no refill of its own). 3-bucket
  deferred.
- **Monthly simulation, yearly accrual.** Each month: withdraw SIM from Bucket 1,
  cascading to Bucket 2 if Bucket 1 is short; after the withdrawal, if Bucket 1 < SIM
  and Bucket 2 > 0, transfer 50% of Bucket 2's current balance to Bucket 1; at year
  end (month 12), apply each bucket's annual return to its balance. SIM for year y =
  base × (1 + stepUp/100)^(y−1), matching the existing SWP step-up pattern.
- **Refill is always affordable.** Refill = 50% of Bucket 2's balance, so it never
  exceeds what Bucket 2 holds — the only "insufficient" case is Bucket 2 empty, which
  transfers 0 and leaves Bucket 1 below threshold.
- **Wipeout ends the series.** If total (Bucket 1 + Bucket 2) < SIM at a withdrawal,
  the series stops at that month; the final point is flagged `depleted`. No rows of
  zeros past wipeout.
- **Horizon = input years or wipeout, whichever first.** Years default 60, max 60.
- **Portion input derived.** One input for Bucket 1 portion; Bucket 2 portion = 100 −
  it, shown as a live hint. Avoids cross-field sum validation, which the per-field
  validator does not support.
- **Library module** (new, pure, no DOM): a `bucketTable(inputs)` function returning
  monthly series points, mirroring `sipTable`'s shape. Registry entry (fields,
  compute, describeSeries) added next to the existing calculators; the UI tab bar,
  chart, monthly table, and CSV/PDF export are registry-driven and require no new
  wiring.
- **SeriesPoint extension**: optional `bucket1`, `bucket2` (per-bucket balances) and
  `depleted` (boolean, wipeout) fields. Optional — existing SIP/Income Returns series
  are unaffected. Series `value` = total portfolio; `invested` = initial capital;
  `withdrawn` = cumulative withdrawals; `interest` = year-end growth of that month
  (0 in months 1–11). Monthly table gains per-bucket columns; chart plots total only.
- **Results** (last point via describeSeries): final value, invested, gain, multiple,
  total withdrawn, and "Depleted in Year X, Month Y" when flagged.

## Testing Decisions

- Good tests verify external behavior: given inputs, `bucketTable` returns the
  expected balances — not implementation details. Same convention as
  `test/sip.test.ts` and `test/incomeReturns.test.ts`: `node --test`, no framework,
  fixtures derived by hand-executing the recurrence (no spreadsheet caches exist for
  this model).
- One new file `test/bucket.test.ts` covering:
  - wipeout month under zero growth (exact arithmetic, no float drift in the target
    cases),
  - refill halves Bucket 2 exactly (0% returns, controlled balances),
  - refill skipped when Bucket 1 ≥ SIM,
  - withdrawal cascade to Bucket 2 when Bucket 1 empties mid-month,
  - year-end growth applied once per year, not monthly,
  - step-up grows the monthly withdrawal annually,
  - series length = horizon when capital survives, = wipeout month when it does not.

## Out of Scope

- 3-bucket strategy (policy doc describes it; deferred — the 2-bucket pipeline is the
  agreed subset).
- Comparison against a single blended-portfolio withdrawal.
- Threshold/minimum-balance refill input (refill fires on SIM crossing only).
- Other steady income (pension, Social Security) offsetting withdrawals.
- Taxes, fees, inflation knobs.
- Per-bucket chart lines (total only in chart; per-bucket in table).
- Partial-period precision beyond monthly steps.

## Further Notes

- The policy doc's "topped up annually" refill is implemented as an on-demand trigger
  (check monthly after withdrawal) with a 50%-of-Reserve refill size, per user
  decision — a deliberate simplification of the 3-bucket annual top-up.
- `docs/3-bucket-strategy.md` remains the reference for the future 3-bucket extension.
