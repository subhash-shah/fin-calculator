# Spec: Financial Calculator Web App

> Source of ground truth for the calculations: `docs/sip-swp-calculator.xlsx` (formulas
> decoded from the workbook; cached values used as test fixtures).
> Not published to an issue tracker — none is configured in this environment.

## Problem Statement

The user maintains a spreadsheet of personal-finance calculators (SIP/SWP, SIP with
annual step-up, income returns) and wants them as a small web application. Today they
exist only as Excel formulas — not shareable, not interactive, one fixed layout per
calc. They want a collection of small calculator utilities behind a web UI, reusable as
a library (a CLI may come later), with sensible defaults and no accidental complexity.

## Solution

A static TypeScript web app, no framework and no server: one page with tabs generated
from a calculator registry. The math lives in a pure library module shared with the UI
(and importable later by a future Node CLI). Two calculators:

1. **SIP** (Systematic Investment Plan) — one calculator covering plain SIP and the
   annual step-up variant (step-up defaults to 0, which makes it plain SIP), plus
   optional monthly withdrawals (SWP) and an initial lump sum.
2. **Income Returns** — total returns from a monthly income stream that grows yearly,
   plus assumed capital appreciation, minus expense drag and tax; reports total and CAGR.

Both compute complete in-memory monthly tables; a horizon slider lets the user scrub to
any year/month and read the value there. Rounding happens only at display. Input
validation with inline errors blocks computation on invalid input.

## User Stories

1. As a user, I want to open the app in a browser without installing or building anything
   at deploy time, so that I can use the calculators anywhere.
2. As a user, I want to see all calculators as tabs on one page, so that I can switch
   between them without navigating away.
3. As a user, I want the SIP calculator to take an initial investment, annual rate,
   monthly SIP, monthly SWP and period, so that it matches my spreadsheet's SIP/SWP model.
4. As a user, I want compounding to be monthly at rate/12 with contributions and
   withdrawals applied at end of month, so that results match my spreadsheet exactly.
5. As a user, I want an optional annual step-up percentage on the SIP amount, so that I
   can model increasing my monthly investment over time.
6. As a user, I want step-up defaulting to 0 (no step-up), so that one calculator covers
   both the plain and stepped SIP.
7. As a user, I want to enter the period as years and/or months, so that I can model
   arbitrary horizons.
8. As a user, I want to scrub a slider over the whole computed period, so that I can see
   the value at any intermediate year or month without re-entering inputs.
9. As a user, I want the SIP result to show the value at the selected horizon, plus total
   invested, gain, and multiple, so that I can judge the investment's outcome.
10. As a user, I want the Income Returns calculator to take initial capital, monthly
    income, yearly income growth, years, and expense ratio, so that it matches my
    spreadsheet's income-returns model.
11. As a user, I want the capital-appreciation multiplier (default 2.0×) and tax rate
    (default 12.5%) to be adjustable inputs, so that I can change assumptions without
    editing code.
12. As a user, I want the Income Returns result to show total income earned, capital
    value, tax paid, total return, and CAGR, so that I can see the whole picture.
13. As a user, I want to leave any input blank and get its default (0 for additive terms,
    1 for multiplicative terms), so that I can start with minimal typing.
14. As a user, I want invalid input (negative values, non-numbers, zero/negative periods)
    to show an inline error and block the result, so that I never see a misleading
    number.
15. As a user, I want results rounded only at display time, so that the numbers match my
    spreadsheet's precision behavior.
16. As a user, I want results to update immediately when I change an input or move the
    slider, so that I can explore scenarios quickly.
17. As a developer, I want the calculation functions importable as a library outside the
    UI, so that a future CLI or other tool can reuse the same math.
18. As a developer, I want to add a new calculator by appending one registry entry, so
    that the collection can grow cheaply.
19. As a developer, I want reproducibly correct math verified against the spreadsheet's
    known outputs, so that formula transcription mistakes are caught at the source.

## Implementation Decisions

- **Stack**: TypeScript, one static page, no framework, no server. Bundle with esbuild
  (single build script, no config file). Output is plain static files that can be served
  or opened without tooling.
- **Library/UI split**: a pure math library (calculator functions + types) is kept
  separate from the UI layer; the UI imports it. The library carries no DOM/browser
  dependencies so a future Node CLI can import it directly.
- **Calculator registry**: a single array of registrations — each entry carries an id, a
  title, an input schema (name, label, type, default, validation), a compute function,
  and result definitions. The tab bar and the result display are generated from this
  registry; adding a calculator is a new entry, not new UI wiring.
- **Unified SIP calculator**: step-up is a field defaulting to 0. When 0, behavior is
  identical to plain SIP. Monthly SIP grows by (step-up %) once per year. SWP and initial
  investment default to 0.
- **Compounding model (from spreadsheet, Sheet1)**: monthly compounding at annual rate /
  12. Per month: interest credited on the previous balance, then SWP subtracted and SIP
  added (end-of-month cash flow). Exactly reproduces the spreadsheet's recurrence.
- **Horizon navigation**: compute the full monthly table in memory on every input change
  (bounded by the entered period; cheapest operation in the app — no persistence).
  A slider selects any month 0..period; the displayed results are the table row at that
  month. **No browser storage** (localStorage/IndexedDB) — a stored table would go stale
  on input change and persistence buys nothing for a microsecond recompute.
- **Defaulting rule**: every input has a default; additive terms (initial, SIP, SWP,
  expense) default 0, multiplicative terms (step-up, multiplier) default 1-equivalent
  (step-up 0%, multiplier 2.0 per spreadsheet), rate defaults to 0 (valid: no growth).
  The period and rate are effectively required (validation demands positive period;
  rate ≥ 0).
- **Income Returns model (from spreadsheet, Sheet5)**: yearly income = monthly income ×
  12, growing by yearly-growth % each year, each year's income reduced by expense ratio;
  summed over the period. Capital after period = initial × multiplier. Tax =
  (capital − initial) × tax rate. Total return = income + capital − tax. CAGR =
  (total return / initial)^(1/years) − 1.
- **Validation**: per-input rules with inline messages; computation is blocked until the
  form is valid. No silent clamping — a silent fix lies about what was typed.
- **Formatting**: numbers are rounded only for display; the library returns full
  precision and the UI formats (currency, percent, ratio).
- **Module shape** (no file paths committed to here — see code):
  - `registry`: calculator definitions (schema + compute + results)
  - `sip`: SIP table (monthly rows: balance, invested, gain, multiple) for a given
    period with optional step-up and SWP; final/at-horizon results derived from the row
  - `incomeReturns`: income schedule + totals + CAGR
  - `validate`: per-input validation used by the registry schema
  - UI: renders tabs from the registry, renders each schema as a form, wires
    validate → compute → format → display, renders the horizon slider

## Testing Decisions

- Good tests verify **external behavior** (given inputs, the compute function returns the
  expected value) — not implementation details (no internals, no mock assertions).
- The one test seam is **the library's compute functions** — the highest and only seam;
  the UI is a thin rendering layer over them.
- Tests are run with `node --test`, no framework, against the **spreadsheet's ground
  truth**: cached values from Sheet1 reproduce for the default inputs (0 initial, 10%
  rate, SIP 23,205/mo): 10y → 4,753,427.74 / invested 2,784,600 / multiple 1.707041, and
  20y/30y/40y rows likewise. Step-up and Income Returns fixtures are derived by executing
  the same spreadsheet formulas (no cached values exist in the workbook for them).
- Rounding: tests compare against spreadsheet precision (2 decimal places), reflecting
  round-only-at-display.
- Focus: one small per-calculator fixture file; no test framework, no coverage tooling.

## Out of Scope

- CLI tool (future; the library design keeps it importable).
- No persistence of preferences or tables across sessions.
- No fees/tax/inflation knobs in the SIP calculator (spreadsheet has none).
- No charts/graphs, no print/export.
- No multi-user/auth/backend of any kind.
- Not the "flat returns on a lump sum" calculator — the Income Returns calculator from
  the spreadsheet supersedes it.
- The 10/20/30/40-year fixed grid from Sheet1 (replaced by arbitrary period + slider).

## Further Notes

- The workbook also contains scratch sheets (Sheet2/Sheet3/Sheet5/Sheet6 contents that
  are helper formulas and experiments) — they are not products and are ignored. Sheet6
  uses start-of-month annuity-due on one scratch formula, which contradicts Sheet1's
  end-of-month recurrence; Sheet1's model is authoritative for the SIP calculator.
- Spreadsheet preserved at `docs/sip-swp-calculator.xlsx`; the spec source formulas can
  be re-extracted with markitdown if the workbook changes.