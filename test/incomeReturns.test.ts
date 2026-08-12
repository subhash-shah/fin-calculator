import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incomeReturns } from '../src/lib/incomeReturns.ts';

// Fixture derived from the spreadsheet's Income Returns formulas:
// initial 2,500,000, income 10,000/mo, 10% growth, 20y, 5% expense,
// 2x multiplier, 12.5% tax.
const base = () =>
  incomeReturns({
    initial: 2500000,
    monthlyIncome: 10000,
    growth: 10,
    years: 20,
    expense: 5,
    multiplier: 2,
    taxRate: 12.5,
  });

test('Income Returns: reproduces spreadsheet formula outputs', () => {
  const r = base();
  assert.ok(Math.abs(r.totalIncome - 6529349.942) < 0.01, 'total income');
  assert.equal(r.capitalValue, 5000000);
  assert.equal(r.capitalGain, 2500000);
  assert.equal(r.tax, 312500);
  assert.ok(Math.abs(r.totalReturn - 11216849.942) < 0.01, 'total return');
  assert.ok(Math.abs(r.cagr - 0.07794486) < 1e-7, 'cagr');
});

test('Income Returns: each year income grows by growth% and is cut by expense', () => {
  // Single year, no growth/expense -> monthly*12.
  const one = incomeReturns({ initial: 0, monthlyIncome: 1000, growth: 0, years: 1, expense: 0, multiplier: 1, taxRate: 0 });
  assert.equal(one.totalIncome, 12000);
  // Expense 50% halves the single-year income.
  const half = incomeReturns({ initial: 0, monthlyIncome: 9000, growth: 0, years: 1, expense: 50, multiplier: 1, taxRate: 0 });
  assert.equal(half.totalIncome, 54000);
  // Growth 10%: two years = 12000 + 13200 in income (gross), no expense.
  const grow = incomeReturns({ initial: 0, monthlyIncome: 1000, growth: 10, years: 2, expense: 0, multiplier: 1, taxRate: 0 });
  assert.equal(grow.totalIncome, 25200);
});

test('Income Returns: capital, gain and tax follow the multiplier and tax rate', () => {
  const r = incomeReturns({ initial: 100000, monthlyIncome: 0, growth: 0, years: 5, expense: 0, multiplier: 3, taxRate: 10 });
  assert.equal(r.capitalValue, 300000);
  assert.equal(r.capitalGain, 200000);
  assert.equal(r.tax, 20000);
  assert.equal(r.totalReturn, 300000 - 20000);
});
