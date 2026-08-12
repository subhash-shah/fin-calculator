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
  if (view.kind === 'static') {
    renderResults(view.results);
  } else {
    // Series: show the final period's point.
    renderResults(current.describeSeries(view.points[view.points.length - 1]));
  }
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

function renderResults(results: Result[]) {
  resultsEl.innerHTML = '';
  const items = resultListItems(results);
  const grid = document.createElement('div');
  grid.className = 'results-grid card';
  grid.append(...items);
  resultsEl.appendChild(grid);
}

renderTabs();
renderForm();
initTheme();
update();