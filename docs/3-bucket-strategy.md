# 3-Bucket Retirement Strategy

Source: https://insightfinancialstrategists.com/investment-bucket-strategy-for-retirement/

Reference policy doc for building the bucket-strategy returns calculator.

## Buckets

### 1. Immediate Bucket (Years 1-5)
- **Purpose:** cover current living/lifestyle expenses.
- **Allocation:** low-risk instruments, incl. cash.
- **Why:** lets other buckets stay invested during downturns — no forced selling at a loss.
- **Refill:** topped up annually from the Intermediate bucket.

### 2. Intermediate Bucket (Years 6-10)
- **Purpose:** balance risk/return; refill source for Immediate bucket.
- **Allocation:** mix of stocks and bonds.
- **Why:** more growth than Immediate, less volatility than Long-Term. Recovers faster than Long-Term after a downturn.

### 3. Long-Term Bucket (Year 10+)
- **Purpose:** portfolio growth for distant spending needs, inflation hedge.
- **Allocation:** growth-oriented, primarily stocks.
- **Why:** volatility acceptable — Immediate bucket covers near-term needs, so Long-Term funds aren't touched for 10+ years.

## Rebalancing / money flow (positive market years)

1. Refill Immediate bucket from Intermediate bucket.
2. Refill Intermediate bucket from Long-Term bucket.
3. Harvest excess gains in strong-market years.

## Withdrawal rule

All spending draws from Immediate bucket only. Intermediate and Long-Term stay invested and compound.

## Sizing

No fixed % split. Size each bucket to actual spending need (years of expenses), net of steady income (e.g. Social Security, pension).

## Pros / Cons

**Pros:** clear visual spending roadmap, guards against panic-selling in downturns, tax-optimization opportunities, legacy-planning friendly.

**Cons:** needs ongoing plan updates/rebalancing, requires active maintenance and understanding.

## Calculator implications

- Model 3 sub-portfolios with distinct return/volatility assumptions (Immediate: cash-like, Intermediate: balanced, Long-Term: equity-heavy).
- Annual step: withdraw year's spending from Immediate; refill Immediate from Intermediate; refill Intermediate from Long-Term; apply each bucket's growth.
- Inputs needed: initial bucket sizes (or years-of-expense per bucket), annual expense, other income (Social Security etc.), expected return/volatility per bucket, refill rule/order, time horizon.
- Output: bucket balances over time, depletion risk, comparison vs. single blended-portfolio withdrawal.
