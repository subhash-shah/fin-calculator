import type { Calculator, Result, SeriesPoint } from './types.ts';
import { sipTable, lastMonthlySip, lastMonthlySwp } from './sip.ts';
import { incomeReturns } from './incomeReturns.ts';

const cur = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const sipCalculator: Calculator = {
  id: 'sip',
  title: 'SIP',
  fields: [
    { key: 'initial', label: 'Initial investment', default: 0, min: 0, max: 9999999999, step: 1000, required: false },
    { key: 'rate', label: 'Annual rate %', default: 0, min: 0, max: 50, step: 0.25, required: true },
    { key: 'sip', label: 'Monthly SIP', default: 5000, min: 0, max: 500000, step: 500, required: false },
    {
      key: 'stepUp',
      label: 'Step-up % / year',
      default: 0,
      min: 0,
      max: 50,
      step: 0.5,
      required: false,
      hint: (v) => `Last SIP: ${cur.format(lastMonthlySip(v as never))}`,
    },
    { key: 'years', label: 'Years', default: 10, min: 0, max: 50, step: 1, required: true },
    { key: 'months', label: 'Months', default: 0, min: 0, max: 11, step: 1, required: false },
    { key: 'swp', label: 'Monthly SWP', default: 0, min: 0, max: 500000, step: 500, required: false, group: 'swp' },
    {
      key: 'swpStepUp',
      label: 'SWP step-up % / year',
      default: 0,
      min: 0,
      max: 50,
      step: 0.5,
      required: false,
      group: 'swp',
      hint: (v) => `Last SWP: ${cur.format(lastMonthlySwp(v as never))}`,
    },
  ],
  groups: [{ id: 'swp', label: 'Systematic Withdrawal Plan (SWP)' }],
  compute: (v) => ({ kind: 'series', points: sipTable(v as never) }),
  describeSeries: (p: SeriesPoint): Result[] => [
    { label: 'Value', value: p.value, format: 'currency' },
    { label: 'Invested', value: p.invested, format: 'currency' },
    { label: 'Gain', value: p.gain, format: 'currency' },
    { label: 'Multiple', value: p.multiple, format: 'ratio' },
    ...(p.withdrawn > 0 ? [{ label: 'Total SWP', value: p.withdrawn, format: 'currency' as const }] : []),
  ],
};

export const incomeCalculator: Calculator = {
  id: 'income',
  title: 'Income Returns',
  fields: [
    { key: 'initial', label: 'Initial capital', default: 2500000, min: 0, max: 10000000, step: 1000, required: true },
    { key: 'monthlyIncome', label: 'Monthly income', default: 10000, min: 0, max: 1000000, step: 500, required: false },
    { key: 'growth', label: 'Income growth % / year', default: 10, min: 0, max: 50, step: 0.5, required: false },
    { key: 'years', label: 'Years', default: 20, min: 1, max: 50, step: 1, required: true },
    { key: 'expense', label: 'Expense ratio %', default: 5, min: 0, max: 50, step: 0.5, required: false },
    { key: 'multiplier', label: 'Capital multiplier', default: 2, min: 0, max: 10, step: 0.1, required: false },
    { key: 'taxRate', label: 'Tax on gains %', default: 12.5, min: 0, max: 60, step: 0.5, required: false },
  ],
  compute: (v) => {
    const r = incomeReturns(v as never);
    return {
      kind: 'static',
      results: [
        { label: 'Total income', value: r.totalIncome, format: 'currency' },
        { label: 'Capital value', value: r.capitalValue, format: 'currency' },
        { label: 'Capital gain', value: r.capitalGain, format: 'currency' },
        { label: 'Tax', value: r.tax, format: 'currency' },
        { label: 'Total return', value: r.totalReturn, format: 'currency' },
        { label: 'CAGR', value: r.cagr, format: 'percent' },
      ],
    };
  },
  describeSeries: (p: SeriesPoint): Result[] => [
    { label: 'Value', value: p.value, format: 'currency' },
  ],
};

export const calculators: Calculator[] = [sipCalculator, incomeCalculator];
