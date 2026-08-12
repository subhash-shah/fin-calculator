export interface IncomeInputs {
  /** Current lump-sum capital. */
  initial: number;
  /** Current monthly income. */
  monthlyIncome: number;
  /** Yearly income growth in percent. */
  growth: number;
  /** Whole years (income is computed per-year). */
  years: number;
  /** Expense ratio in percent deducted from each year's income. */
  expense: number;
  /** Capital appreciation multiple over the period (2 = doubles). */
  multiplier: number;
  /** Tax rate in percent on capital gains. */
  taxRate: number;
}

export interface IncomeResult {
  totalIncome: number;
  capitalValue: number;
  capitalGain: number;
  tax: number;
  totalReturn: number;
  /** CAGR as a decimal fraction (0.12 = 12%). */
  cagr: number;
}

/** Total returns from growing income plus assumed capital appreciation. */
export function incomeReturns(i: IncomeInputs): IncomeResult {
  let totalIncome = 0;
  for (let y = 1; y <= i.years; y++) {
    const yearlyIncome = i.monthlyIncome * 12 * Math.pow(1 + i.growth / 100, y - 1);
    totalIncome += yearlyIncome * (1 - i.expense / 100);
  }
  const capitalValue = i.initial * i.multiplier;
  const capitalGain = capitalValue - i.initial;
  const tax = capitalGain * (i.taxRate / 100);
  const totalReturn = totalIncome + capitalValue - tax;
  const cagr = i.initial > 0 ? Math.pow(totalReturn / i.initial, 1 / i.years) - 1 : 0;
  return { totalIncome, capitalValue, capitalGain, tax, totalReturn, cagr };
}
