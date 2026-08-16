# Domain Glossary

Terms used in the finance calculator app. Implementation-free.

## Bucket strategy (2-bucket model)

- **Bucket 1 — Spending bucket** — the active bucket; all monthly withdrawals draw from here first.
  Refill condition: when Bucket 1 < SIM (the monthly withdrawal amount).
- **Bucket 2 — Reserve bucket** — the rest of the capital; grows untouched; is the refill source for Bucket 1.
- **Refill size** — 50% of Bucket 2's *current balance* at the time of refill. (The other 50% stays.)
- **Withdrawal step-up** — annual percent growth of the monthly withdrawal amount, applied once per year.
- **Portion** — percent of the initial capital allocated to a bucket. All portions sum to 100.
- **Return** — a bucket's annual growth rate; accrued once per year on the year-end balance.
- **SIM** — the monthly withdrawal amount. Bucket 1's refill threshold.
- **Depletion** — the first month in which total monthly withdrawal cannot be fully covered.
- **Horizon** — the calculation's length: input years (default 60) or run-until-depletion, whichever comes first.