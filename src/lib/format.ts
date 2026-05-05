import type {
  FilterDef,
  FilterSchema,
  FilterValues,
  FilterTokensOption,
  FilterTokensMessages,
  OptionsOrFn,
  FilterContext,
  FilterTokensToken,
} from '../types';
import { defaultMessages } from './messages';

export function resolveOptionsSync<T extends FilterTokensOption>(
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
  options: readonly FilterTokensOption[],
  value: string,
): string {
  const found = options.find((o) => o.value === value);
  return found ? found.label : value;
}

/**
 * Render a short month/day for a token's date display. Passing `locale`
 * undefined (the default) defers to the runtime — the browser's preferred
 * locale on the client, the Node default on the server. Pass an explicit
 * BCP 47 tag (e.g. 'fr-FR') to force a specific format.
 */
export function formatDateShort(dateStr: string, locale?: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Render a single filter value as the user-visible string. Shared by token
 * rendering (tokens) and aria-live announcement diffs so the spoken text and
 * the visible token stay in sync.
 *
 * `dateLabel`, when set, wins over the formatted from/to/date — it's how the
 * preset name ("Last 30 days") survives instead of being re-rendered as a
 * date range.
 */
export function formatFilterValue(
  def: FilterDef,
  val: unknown,
  ctx: FilterContext,
  locale?: string,
  dateLabel?: string,
  messages: FilterTokensMessages = defaultMessages,
): string {
  if (val === undefined || val === null) return '';

  if (def.type === 'select') {
    const options = resolveOptionsSync(def.options, ctx);
    if (def.multi && Array.isArray(val)) {
      return (val as string[]).map((v) => findOptionLabel(options, v)).join(', ');
    }
    if (typeof val === 'string') return findOptionLabel(options, val);
    return '';
  }

  if (def.type === 'text') {
    return typeof val === 'string' ? val : '';
  }

  if (def.type === 'number') {
    const n = val as { min?: number; max?: number };
    const unit = def.unit || '';
    if (n.min !== undefined && n.max !== undefined) return `${n.min}–${n.max}${unit}`;
    if (n.min !== undefined) return `≥${n.min}${unit}`;
    if (n.max !== undefined) return `≤${n.max}${unit}`;
    return '';
  }

  if (def.type === 'date') {
    if (dateLabel) return dateLabel;
    const d = val as { date?: string; from?: string; to?: string };
    const fmt = (s: string) => formatDateShort(s, locale);
    if (d.from && d.to) return `${fmt(d.from)} – ${fmt(d.to)}`;
    if (d.from) return messages.dateSinceFormat(fmt(d.from));
    if (d.to) return messages.dateUntilFormat(fmt(d.to));
    if (d.date) return fmt(d.date);
    return '';
  }

  return '';
}

function getTokenId(key: string, def: FilterDef, val: unknown): string {
  if (def.type === 'select' && !def.multi && typeof val === 'string') return `${key}-${val}`;
  if (def.type === 'select' && def.multi) return `${key}-multi`;
  return `${key}-${def.type}`;
}

export function buildTokens(
  schema: FilterSchema,
  values: FilterValues<FilterSchema>,
  ctx: FilterContext,
  onRemove: (category: string) => void,
  dateLabels: Record<string, string> = {},
  locale?: string,
  messages: FilterTokensMessages = defaultMessages,
): FilterTokensToken[] {
  const tokens: FilterTokensToken[] = [];

  for (const [key, def] of Object.entries(schema)) {
    const val = values[key];
    if (val === undefined || val === null) continue;

    const displayValue = formatFilterValue(def, val, ctx, locale, dateLabels[key], messages);
    if (!displayValue) continue;

    tokens.push({
      id: getTokenId(key, def, val),
      category: key,
      label: def.label,
      displayValue,
      remove: () => onRemove(key),
    });
  }

  return tokens;
}
