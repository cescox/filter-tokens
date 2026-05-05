import type {
  FilterSchema,
  FilterValues,
  Option,
  OptionsOrFn,
  FilterContext,
  Token,
} from './types';

export function resolveOptionsSync<T extends { value: string; label: string }>(
  optionsOrFn: OptionsOrFn<T> | undefined,
  ctx: FilterContext,
): T[] {
  if (!optionsOrFn) return [];
  if (typeof optionsOrFn !== 'function') return [...optionsOrFn] as T[];
  const result = optionsOrFn(ctx);
  if (result instanceof Promise) {
    result.catch(() => {}); // prevent unhandled rejection — the async effect handles errors
    return [];
  }
  return result;
}

export function findOptionLabel(
  options: readonly Option[],
  value: string,
): string {
  const found = options.find((o) => o.value === value);
  return found ? found.label : value;
}

export function formatDateShort(dateStr: string, locale = 'en-US'): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function buildTokens(
  schema: FilterSchema,
  values: FilterValues<FilterSchema>,
  ctx: FilterContext,
  onRemove: (category: string) => void,
  dateLabels: Record<string, string> = {},
  locale?: string,
): Token[] {
  const tokens: Token[] = [];

  for (const [key, def] of Object.entries(schema)) {
    const val = values[key];
    if (val === undefined || val === null) continue;

    if (def.type === 'select') {
      const options = resolveOptionsSync(def.options, ctx);
      if (def.multi && Array.isArray(val)) {
        const labels = (val as string[]).map((v) => findOptionLabel(options, v));
        tokens.push({
          id: `${key}-multi`,
          category: key,
          label: def.label,
          displayValue: labels.join(', '),
          remove: () => onRemove(key),
        });
      } else if (typeof val === 'string') {
        tokens.push({
          id: `${key}-${val}`,
          category: key,
          label: def.label,
          displayValue: findOptionLabel(options, val),
          remove: () => onRemove(key),
        });
      }
    } else if (def.type === 'date') {
      const dateVal = val as { date?: string; from?: string; to?: string };
      const fmt = (s: string) => formatDateShort(s, locale);
      let displayValue = '';

      if (dateLabels[key]) {
        displayValue = dateLabels[key];
      } else if (dateVal.from && dateVal.to) {
        displayValue = `${fmt(dateVal.from)} – ${fmt(dateVal.to)}`;
      } else if (dateVal.from) {
        displayValue = `Since ${fmt(dateVal.from)}`;
      } else if (dateVal.to) {
        displayValue = `Until ${fmt(dateVal.to)}`;
      } else if (dateVal.date) {
        displayValue = fmt(dateVal.date);
      }
      if (displayValue) {
        tokens.push({
          id: `${key}-date`,
          category: key,
          label: def.label,
          displayValue,
          remove: () => onRemove(key),
        });
      }
    } else if (def.type === 'text') {
      if (typeof val === 'string' && val) {
        tokens.push({
          id: `${key}-text`,
          category: key,
          label: def.label,
          displayValue: val,
          remove: () => onRemove(key),
        });
      }
    } else if (def.type === 'number') {
      const numVal = val as { min?: number; max?: number };
      const unit = def.unit || '';
      let displayValue = '';
      if (numVal.min !== undefined && numVal.max !== undefined) {
        displayValue = `${numVal.min}–${numVal.max}${unit}`;
      } else if (numVal.min !== undefined) {
        displayValue = `≥${numVal.min}${unit}`;
      } else if (numVal.max !== undefined) {
        displayValue = `≤${numVal.max}${unit}`;
      }
      if (displayValue) {
        tokens.push({
          id: `${key}-number`,
          category: key,
          label: def.label,
          displayValue,
          remove: () => onRemove(key),
        });
      }
    }
  }

  return tokens;
}
