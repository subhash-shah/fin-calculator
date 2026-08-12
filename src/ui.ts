import { calculators } from './lib/registry.ts';
import type { Calculator, FieldDef, Result, SeriesPoint } from './lib/types.ts';
import { validateField, parseField } from './lib/validate.ts';

// ---- Theme: light/dark, auto-detected, remembered. ----
const THEME_KEY = 'calc-theme';
function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
  const btn = document.querySelector<HTMLButtonElement>('#theme-toggle');
  if (btn) btn.textContent = theme === 'light' ? 'Dark' : 'Light';
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefers = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(saved === 'dark' || saved === 'light' ? saved : prefers);
  document.querySelector('#theme-toggle')?.addEventListener('click', () => {
    const next: 'light' | 'dark' =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

const cur = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const curCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

function format(r: Result): string {
  switch (r.format) {
    case 'currency':
      return cur.format(r.value);
    case 'percent':
      return (r.value * 100).toFixed(2) + '%';
    case 'ratio':
      return r.value.toFixed(2) + '\u00d7'; // ×
  }
}

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

const tabsEl = $('#tabs');
const formEl = $('#form');
const errorsEl = $('#errors');
const resultsEl = $('#results');

let current: Calculator = calculators[0];
let inputs = new Map<string, HTMLInputElement>();
let groupEnabled = new Map<string, boolean>();
let hintEls = new Map<string, HTMLElement>();
let resultsView: 'chart' | 'table' = 'chart';

function renderTabs() {
  tabsEl.innerHTML = '';
  for (const c of calculators) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = c.title;
    btn.className = 'tab' + (c.id === current.id ? ' active' : '');
    btn.addEventListener('click', () => {
      current = c;
      renderTabs();
      renderForm();
      update();
    });
    tabsEl.appendChild(btn);
  }
}

function renderField(f: FieldDef): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const label = document.createElement('label');
  label.textContent = f.label;
  label.htmlFor = `f-${f.key}`;
  const line = document.createElement('div');
  line.className = 'input-line';
  const range = document.createElement('input');
  range.type = 'range';
  range.min = String(f.min);
  range.max = String(f.max);
  range.step = String(f.step);
  range.value = String(f.default);
  const number = document.createElement('input');
  number.type = 'number';
  number.id = `f-${f.key}`;
  number.min = String(f.min);
  number.max = String(f.max);
  number.step = 'any';
  number.value = String(f.default);
  // Either control updates the other; both recompute.
  const sync = (src: HTMLInputElement) => {
    if (range.value !== src.value) range.value = src.value;
    if (number.value !== src.value) number.value = src.value;
    update();
  };
  range.addEventListener('input', () => sync(range));
  number.addEventListener('input', () => sync(number));
  inputs.set(f.key, number); // parse/validate reads the number box
  line.append(range, number);
  wrap.append(label, line);
  if (f.hint) {
    const hint = document.createElement('small');
    hint.className = 'field-hint';
    hintEls.set(f.key, hint);
    wrap.append(hint);
  }
  return wrap;
}

function renderForm() {
  formEl.innerHTML = '';
  formEl.className = 'card';
  inputs = new Map();
  groupEnabled = new Map();
  hintEls = new Map();
  for (const f of current.fields) {
    if (f.group) continue;
    formEl.appendChild(renderField(f));
  }
  for (const g of current.groups ?? []) {
    groupEnabled.set(g.id, false);
    const groupFields = current.fields.filter((f) => f.group === g.id);
    const section = document.createElement('div');
    section.className = 'field-group';
    const header = document.createElement('label');
    header.className = 'field-group-toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    header.append(checkbox, document.createTextNode(g.label));
    const body = document.createElement('div');
    body.className = 'field-group-body';
    body.hidden = true;
    for (const f of groupFields) body.appendChild(renderField(f));
    checkbox.addEventListener('change', () => {
      groupEnabled.set(g.id, checkbox.checked);
      body.hidden = !checkbox.checked;
      update();
    });
    section.append(header, body);
    formEl.appendChild(section);
  }
  const actions = document.createElement('div');
  actions.className = 'actions';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'btn btn-secondary';
  reset.textContent = 'Reset';
  reset.addEventListener('click', () => {
    for (const f of current.fields) inputs.get(f.key)!.value = String(f.default);
    for (const g of current.groups ?? []) groupEnabled.set(g.id, false);
    formEl.querySelectorAll<HTMLInputElement>('.field-group-toggle input').forEach((c) => (c.checked = false));
    formEl.querySelectorAll<HTMLElement>('.field-group-body').forEach((b) => (b.hidden = true));
    update();
  });
  actions.appendChild(reset);
  formEl.appendChild(actions);
}

function fieldDisabled(f: FieldDef): boolean {
  return f.group !== undefined && !groupEnabled.get(f.group);
}

function readValues(): Record<string, number> {
  const values: Record<string, number> = {};
  for (const f of current.fields) {
    values[f.key] = fieldDisabled(f) ? 0 : parseField(f, inputs.get(f.key)!.value);
  }
  return values;
}

function validate(): string[] {
  const errors: string[] = [];
  for (const f of current.fields) {
    if (fieldDisabled(f)) continue;
    const err = validateField(f, inputs.get(f.key)!.value);
    if (err) errors.push(err);
  }
  return errors;
}

function updateHints() {
  if (hintEls.size === 0) return;
  const values = readValues();
  for (const f of current.fields) {
    if (f.hint) hintEls.get(f.key)!.textContent = f.hint(values);
  }
}

/** Recompute and re-render based on current inputs. */
function update() {
  updateHints();
  const errors = validate();
  errorsEl.hidden = errors.length === 0;
  errorsEl.innerHTML = '';
  for (const e of errors) {
    const li = document.createElement('li');
    li.textContent = e;
    errorsEl.appendChild(li);
  }
  if (errors.length > 0) {
    resultsEl.innerHTML = '';
    return;
  }
  const view = current.compute(readValues());
  resultsEl.innerHTML = '';
  if (view.kind === 'static') {
    resultsEl.appendChild(buildResultsGrid(view.results));
  } else {
    resultsEl.appendChild(buildResultsGrid(current.describeSeries(view.points[view.points.length - 1])));
    resultsEl.appendChild(buildViewToggle());
    if (resultsView === 'chart') {
      resultsEl.appendChild(buildChart(view.points));
    } else {
      resultsEl.appendChild(buildExportBar(view.points));
      resultsEl.appendChild(buildMonthlyTable(view.points));
    }
  }
}

function buildViewToggle(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'view-toggle';
  for (const v of ['chart', 'table'] as const) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary' + (resultsView === v ? ' active' : '');
    btn.textContent = v === 'chart' ? 'Chart' : 'Table';
    btn.addEventListener('click', () => {
      resultsView = v;
      update();
    });
    wrap.appendChild(btn);
  }
  return wrap;
}

function monthlyRows(points: SeriesPoint[]): { headers: string[]; rows: (string | number)[][] } {
  const hasWithdrawn = points.some((p) => p.withdrawn > 0);
  const headers = ['Month', 'Value', 'Invested', 'Gain', 'Multiple', ...(hasWithdrawn ? ['Withdrawn'] : [])];
  const rows = points.map((p) => {
    const year = Math.floor((p.month - 1) / 12) + 1;
    const monthInYear = ((p.month - 1) % 12) + 1;
    return [
      `Y${year} M${monthInYear}`,
      p.value.toFixed(2),
      p.invested.toFixed(2),
      p.gain.toFixed(2),
      p.multiple.toFixed(2),
      ...(hasWithdrawn ? [p.withdrawn.toFixed(2)] : []),
    ];
  });
  return { headers, rows };
}

function downloadCsv(points: SeriesPoint[]) {
  const { headers, rows } = monthlyRows(points);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${current.id}-monthly.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Opens the browser print dialog scoped to just the monthly table, so "Save as PDF" gives a clean export. */
function printMonthlyTable() {
  const printCss = document.createElement('style');
  printCss.id = 'print-only-table';
  printCss.textContent = `
    @media print {
      body > *:not(#results) { display: none !important; }
      #results > *:not(.table-card) { display: none !important; }
      .table-card, .table-card * {
        background: #fff !important;
        color: #000 !important;
        box-shadow: none !important;
      }
      .monthly-table td.pos { color: #067d33 !important; }
      .monthly-table td.neg { color: #c0212a !important; }
    }`;
  document.head.appendChild(printCss);
  window.addEventListener('afterprint', () => printCss.remove(), { once: true });
  window.print();
}

function buildExportBar(points: SeriesPoint[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'view-toggle';
  const csvBtn = document.createElement('button');
  csvBtn.type = 'button';
  csvBtn.className = 'btn btn-secondary';
  csvBtn.textContent = 'Export CSV';
  csvBtn.addEventListener('click', () => downloadCsv(points));
  const pdfBtn = document.createElement('button');
  pdfBtn.type = 'button';
  pdfBtn.className = 'btn btn-secondary';
  pdfBtn.textContent = 'Export PDF';
  pdfBtn.addEventListener('click', printMonthlyTable);
  wrap.append(csvBtn, pdfBtn);
  return wrap;
}

/** Full month-by-month calculation table for a series. */
function buildMonthlyTable(points: SeriesPoint[]): HTMLElement {
  const hasWithdrawn = points.some((p) => p.withdrawn > 0);
  const wrap = document.createElement('div');
  wrap.className = 'table-card card';
  const table = document.createElement('table');
  table.className = 'monthly-table';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr><th>Month</th><th>Value</th><th>Invested</th><th>Gain</th><th>Multiple</th>${hasWithdrawn ? '<th>Withdrawn</th>' : ''}</tr>`;
  const tbody = document.createElement('tbody');
  for (const p of points) {
    const year = Math.floor((p.month - 1) / 12) + 1;
    const monthInYear = ((p.month - 1) % 12) + 1;
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td>Y${year} M${monthInYear}</td>` +
      `<td>${cur.format(p.value)}</td>` +
      `<td>${cur.format(p.invested)}</td>` +
      `<td class="${p.gain < 0 ? 'neg' : p.gain > 0 ? 'pos' : ''}">${cur.format(p.gain)}</td>` +
      `<td>${p.multiple.toFixed(2)}×</td>` +
      (hasWithdrawn ? `<td>${cur.format(p.withdrawn)}</td>` : '');
    tbody.appendChild(tr);
  }
  table.append(thead, tbody);
  wrap.appendChild(table);
  return wrap;
}

function resultListItems(results: Result[]): HTMLElement[] {
  return results.map((r) => {
    const div = document.createElement('div');
    div.className = 'result';
    const label = document.createElement('span');
    label.className = 'rl';
    label.textContent = r.label;
    const value = document.createElement('span');
    value.className = 'rv' + (r.value < 0 ? ' neg' : r.value > 0 ? ' pos' : '');
    value.textContent = format(r);
    div.append(label, value);
    return div;
  });
}

function buildResultsGrid(results: Result[]): HTMLElement {
  const grid = document.createElement('div');
  grid.className = 'results-grid card';
  grid.append(...resultListItems(results));
  return grid;
}

/** Line chart of a series' value vs. invested over time, with year markers and a hover tooltip. */
function buildChart(points: SeriesPoint[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'chart-card card';
  if (points.length < 2) return wrap; // nothing to plot

  const W = 680;
  const H = 240;
  const padL = 64;
  const padR = 16;
  const padT = 20;
  const padB = 30;
  const n = points.length;
  const xAt = (i: number) => padL + (i / (n - 1)) * (W - padL - padR);

  const values = points.map((p) => p.value);
  const invested = points.map((p) => p.invested);
  const minV = Math.min(0, ...values, ...invested);
  const maxV = Math.max(...values, ...invested, 1);
  const span = maxV - minV || 1;
  const yAt = (v: number) => padT + (1 - (v - minV) / span) * (H - padT - padB);

  const pathFor = (arr: number[]) =>
    'M ' + arr.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' L ');

  const totalYears = Math.ceil(n / 12);
  const step = Math.max(1, Math.ceil(totalYears / 6));
  const tickIdx = new Set<number>();
  for (let y = step; y <= totalYears; y += step) tickIdx.add(Math.min(y * 12, n) - 1);
  tickIdx.add(n - 1);

  const gridlines: string[] = [];
  const xLabels: string[] = [];
  const markers: string[] = [];
  for (const i of tickIdx) {
    const x = xAt(i);
    const year = Math.ceil((i + 1) / 12);
    gridlines.push(
      `<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${H - padB}" stroke="var(--border)" stroke-dasharray="2,3" />`,
    );
    xLabels.push(
      `<text x="${x.toFixed(1)}" y="${H - padB + 16}" font-size="10" fill="var(--muted)" text-anchor="middle">Yr ${year}</text>`,
    );
    const vy = yAt(points[i].value);
    markers.push(
      `<circle cx="${x.toFixed(1)}" cy="${vy.toFixed(1)}" r="3" fill="var(--accent)" />` +
        `<text x="${x.toFixed(1)}" y="${(vy - 8).toFixed(1)}" font-size="10" fill="var(--text)" text-anchor="middle">${curCompact.format(points[i].value)}</text>`,
    );
  }

  wrap.innerHTML = `
    <div class="chart-legend">
      <span><i class="swatch" style="background:var(--accent)"></i>Value</span>
      <span><i class="swatch" style="background:var(--muted)"></i>Invested</span>
    </div>
    <svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      ${gridlines.join('')}
      <path d="${pathFor(invested)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4,3" />
      <path d="${pathFor(values)}" fill="none" stroke="var(--accent)" stroke-width="2" />
      ${markers.join('')}
      ${xLabels.join('')}
      <g class="chart-hover" style="display:none">
        <line x1="0" y1="${padT}" x2="0" y2="${H - padB}" stroke="var(--text)" stroke-dasharray="2,2" />
        <circle r="4" fill="var(--accent)" />
        <circle r="4" fill="var(--muted)" />
        <rect class="chart-tip-bg" width="150" height="46" rx="6" fill="var(--card)" stroke="var(--border)" />
        <text class="chart-tip-month" x="8" y="15" font-size="11" fill="var(--muted)"></text>
        <text class="chart-tip-value" x="8" y="30" font-size="11" fill="var(--text)"></text>
        <text class="chart-tip-invested" x="8" y="43" font-size="11" fill="var(--muted)"></text>
      </g>
      <rect class="chart-overlay" x="${padL}" y="${padT}" width="${W - padL - padR}" height="${H - padT - padB}" fill="transparent" />
    </svg>`;

  const svg = wrap.querySelector('svg')!;
  const overlay = wrap.querySelector<SVGRectElement>('.chart-overlay')!;
  const hover = wrap.querySelector<SVGGElement>('.chart-hover')!;
  const hoverLine = hover.querySelector('line')!;
  const [valueDot, investedDot] = hover.querySelectorAll('circle');
  const tipBg = hover.querySelector<SVGRectElement>('.chart-tip-bg')!;
  const tipMonth = hover.querySelector('.chart-tip-month')!;
  const tipValue = hover.querySelector('.chart-tip-value')!;
  const tipInvested = hover.querySelector('.chart-tip-invested')!;

  const showAt = (i: number) => {
    const p = points[i];
    const x = xAt(i);
    hoverLine.setAttribute('x1', x.toFixed(1));
    hoverLine.setAttribute('x2', x.toFixed(1));
    valueDot.setAttribute('cx', x.toFixed(1));
    valueDot.setAttribute('cy', yAt(p.value).toFixed(1));
    investedDot.setAttribute('cx', x.toFixed(1));
    investedDot.setAttribute('cy', yAt(p.invested).toFixed(1));
    const year = Math.floor((p.month - 1) / 12) + 1;
    const monthInYear = ((p.month - 1) % 12) + 1;
    tipMonth.textContent = `Year ${year}, Month ${monthInYear}`;
    tipValue.textContent = `Value: ${cur.format(p.value)}`;
    tipInvested.textContent = `Invested: ${cur.format(p.invested)}`;
    const boxW = Number(tipBg.getAttribute('width'));
    const tipX = Math.min(Math.max(x + 10, padL), W - padR - boxW);
    const tipY = padT + 4;
    for (const el of [tipBg, tipMonth, tipValue, tipInvested]) {
      el.setAttribute('transform', `translate(${tipX.toFixed(1)}, ${tipY})`);
    }
    hover.style.display = '';
  };

  overlay.addEventListener('pointermove', (ev) => {
    const rect = svg.getBoundingClientRect();
    const svgX = ((ev.clientX - rect.left) / rect.width) * W;
    const ratio = (svgX - padL) / (W - padL - padR);
    const i = Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
    showAt(i);
  });
  overlay.addEventListener('pointerleave', () => {
    hover.style.display = 'none';
  });

  return wrap;
}

renderTabs();
renderForm();
initTheme();
update();