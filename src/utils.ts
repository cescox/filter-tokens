import type {
  FilterSchema,
  FilterDef,
  FilterValues,
  Option,
  OptionsOrFn,
  FilterContext,
  DateRangePreset,
  DateSinglePreset,
} from './types';

export function resolveOptions<T extends { value: string; label: string }>(
  optionsOrFn: OptionsOrFn<T> | undefined,
  ctx: FilterContext,
): T[] | Promise<T[]> {
  if (!optionsOrFn) return [];
  if (typeof optionsOrFn === 'function') return optionsOrFn(ctx);
  return [...optionsOrFn] as T[];
}

export function resolveOptionsSync<T extends { value: string; label: string }>(
  optionsOrFn: OptionsOrFn<T> | undefined,
  ctx: FilterContext,
): T[] {
  if (!optionsOrFn) return [];
  if (typeof optionsOrFn !== 'function') return [...optionsOrFn] as T[];
  const result = optionsOrFn(ctx);
  if (result instanceof Promise) return [];
  return result;
}

export function findOptionLabel(
  options: readonly Option[],
  value: string,
): string {
  const found = options.find((o) => o.value === value);
  return found ? found.label : value;
}

export function getFilterLabel(def: FilterDef): string {
  return def.label;
}

export function formatDateShort(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function buildTokens(
  schema: FilterSchema,
  values: FilterValues<FilterSchema>,
  ctx: FilterContext,
  onRemove: (category: string, tokenValue?: string) => void,
) {
  const tokens: {
    id: string;
    category: string;
    label: string;
    displayValue: string;
    remove: () => void;
  }[] = [];

  for (const [key, def] of Object.entries(schema)) {
    const val = values[key];
    if (val === undefined || val === null) continue;

    if (def.type === 'select') {
      const options = resolveOptionsSync(def.options, ctx);
      if (def.multi && Array.isArray(val)) {
        for (const v of val as string[]) {
          tokens.push({
            id: `${key}-${v}`,
            category: key,
            label: def.label,
            displayValue: findOptionLabel(options, v),
            remove: () => onRemove(key, v),
          });
        }
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
      const dateVal = val as { date?: string; from?: string; to?: string; label?: string };
      let displayValue = '';
      if (dateVal.label) {
        displayValue = dateVal.label;
      } else if ('from' in dateVal && dateVal.from) {
        displayValue = dateVal.to
          ? `${formatDateShort(dateVal.from)} – ${formatDateShort(dateVal.to)}`
          : `Since ${formatDateShort(dateVal.from)}`;
      } else if ('date' in dateVal && dateVal.date) {
        displayValue = formatDateShort(dateVal.date);
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
      const unit = (def as { unit?: string }).unit || '';
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
