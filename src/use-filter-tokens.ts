'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import type {
  FilterSchema,
  FilterValues,
  UseFilterTokensOptions,
  FilterTokensReturn,
  DropdownItem,
  DropdownState,
  Token,
  Option,
  DateRangePreset,
  DateSinglePreset,
} from './types';
import { resolveOptionsSync, buildTokens, findOptionLabel, formatDateShort } from './utils';

function optionsContentEqual(a: Option[], b: Option[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].value !== b[i].value || a[i].label !== b[i].label) return false;
  }
  return true;
}

const ANNOUNCEMENT_CLEAR_MS = 1500;

function getValueDisplay(
  def: FilterSchema[string],
  val: unknown,
  ctx: { filters: FilterValues<FilterSchema> },
  locale?: string,
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
    const d = val as { date?: string; from?: string; to?: string };
    const fmt = (s: string) => formatDateShort(s, locale);
    if (d.from && d.to) return `${fmt(d.from)} – ${fmt(d.to)}`;
    if (d.from) return `Since ${fmt(d.from)}`;
    if (d.to) return `Until ${fmt(d.to)}`;
    if (d.date) return fmt(d.date);
    return '';
  }
  return '';
}

function diffAnnouncements(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  schema: Record<string, FilterSchema[string]>,
  ctx: { filters: FilterValues<FilterSchema> },
  locale: string | undefined,
): string[] {
  const out: string[] = [];
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    const def = schema[key];
    if (!def) continue;
    const label = def.label;
    const p = prev[key];
    const n = next[key];
    if (p === n) continue;

    if (def.type === 'select' && def.multi) {
      const pArr = (p as string[] | undefined) ?? [];
      const nArr = (n as string[] | undefined) ?? [];
      const options = resolveOptionsSync(def.options, ctx);
      for (const v of nArr) {
        if (!pArr.includes(v)) out.push(`Added ${label}: ${findOptionLabel(options, v)}`);
      }
      for (const v of pArr) {
        if (!nArr.includes(v)) out.push(`Removed ${label}: ${findOptionLabel(options, v)}`);
      }
      continue;
    }

    const pDisplay = getValueDisplay(def, p, ctx, locale);
    const nDisplay = getValueDisplay(def, n, ctx, locale);
    if (p === undefined && n !== undefined) {
      if (nDisplay) out.push(`Added ${label}: ${nDisplay}`);
    } else if (p !== undefined && n === undefined) {
      if (pDisplay) out.push(`Removed ${label}: ${pDisplay}`);
    } else {
      if (pDisplay) out.push(`Removed ${label}: ${pDisplay}`);
      if (nDisplay) out.push(`Added ${label}: ${nDisplay}`);
    }
  }
  return out;
}

export function useFilterTokens<const T extends FilterSchema>(
  options: UseFilterTokensOptions<T>,
): FilterTokensReturn<T> {
  const { filters, value, onChange, placeholder = 'Filter...', locale } = options;

  // Internal untyped references — the generic boundary is at input/output only
  const schema = filters as Record<string, FilterSchema[string]>;
  const values = value as Record<string, unknown>;
  const emitChange = onChange as (v: Record<string, unknown>) => void;

  // ── State ──────────────────────────────────
  //
  // The dropdown state is a single discriminated union — `mode` plus the
  // mode-specific fields (`category`, `inputType`). Keeping these in one
  // useState eliminates the "forgot to reset inputType when switching modes"
  // class of bug and lets TypeScript enforce the invariants at every read
  // and every transition.

  const [state, setState] = useState<DropdownState>({ mode: 'closed' });
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [asyncOptions, setAsyncOptions] = useState<Record<string, Option[]>>({});
  const [asyncLoading, setAsyncLoading] = useState(false);
  const [asyncError, setAsyncError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [dateLabels, setDateLabels] = useState<Record<string, string>>({});
  const [announcement, setAnnouncement] = useState('');
  const prevValueRef = useRef<Record<string, unknown>>(values);
  const announcementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // ArrowUp on a closed combobox should land on the LAST item per WAI-ARIA.
  // We can't compute items synchronously inside the keyboard handler because
  // they're memoised against state we just dispatched, so we set a one-shot
  // intent and pick it up in an effect after items are recomputed.
  const openIntentRef = useRef<'first' | 'last' | null>(null);

  const isOpen = state.mode !== 'closed';
  const activeCategory =
    state.mode === 'values' || state.mode === 'input' ? state.category : null;
  const ctx = useMemo(() => ({ filters: values as FilterValues<FilterSchema> }), [values]);

  // ── State transitions ──────────────────────

  function openCategories() {
    setState({ mode: 'categories' });
    setHighlightedIndex(-1);
    setSearch('');
  }

  function selectCategory(key: string) {
    const def = schema[key];
    if (!def) return;

    if (def.type === 'text') {
      setState({ mode: 'input', category: key, inputType: 'text' });
      setHighlightedIndex(-1);
      const currentVal = values[key];
      setSearch(typeof currentVal === 'string' ? currentVal : '');
      return;
    }

    if (def.type === 'number') {
      setState({ mode: 'input', category: key, inputType: 'number' });
      setHighlightedIndex(-1);
      setSearch('');
      return;
    }

    if (def.type === 'date' && (!def.presets?.length || (values[key] && !dateLabels[key]))) {
      setState({ mode: 'input', category: key, inputType: 'date' });
      setHighlightedIndex(-1);
      setSearch('');
      return;
    }

    setState({ mode: 'values', category: key });
    setSearch('');

    // Highlight the currently-chosen value when re-editing a select chip,
    // so Enter doesn't silently overwrite the user's pick. Falls back to 0
    // for fresh selections / multi-select with no matching option in view.
    let initialIndex = 0;
    if (def.type === 'select') {
      const currentVal = values[key];
      const opts =
        typeof def.options === 'function'
          ? asyncOptions[key] ?? []
          : resolveOptionsSync(def.options, ctx);
      if (def.multi && Array.isArray(currentVal) && currentVal.length > 0) {
        const idx = opts.findIndex((o) => (currentVal as string[]).includes(o.value));
        if (idx >= 0) initialIndex = idx;
      } else if (typeof currentVal === 'string') {
        const idx = opts.findIndex((o) => o.value === currentVal);
        if (idx >= 0) initialIndex = idx;
      }
    }
    setHighlightedIndex(initialIndex);
  }

  function goBack() {
    if (state.mode === 'input' && state.inputType === 'date') {
      const def = schema[state.category];
      if (def?.type === 'date' && def.presets?.length) {
        setState({ mode: 'values', category: state.category });
        setHighlightedIndex(0);
        setSearch('');
        return;
      }
    }
    if (state.mode === 'values' || state.mode === 'input') {
      openCategories();
      return;
    }
    close();
  }

  function close() {
    setState({ mode: 'closed' });
    setSearch('');
    setHighlightedIndex(-1);
  }

  // ── Async options loading ──────────────────

  useEffect(() => {
    if (state.mode !== 'values') return;
    const def = schema[state.category];
    if (def?.type !== 'select') return;

    const raw = def.options;
    if (typeof raw !== 'function') return;

    let cancelled = false;
    const result = raw(ctx);
    const cat = state.category;

    if (!(result instanceof Promise)) {
      // Sync fn — bail when content is unchanged to avoid loops with unstable ctx
      const next = result as Option[];
      setAsyncOptions((prev) => {
        const existing = prev[cat];
        if (existing && optionsContentEqual(existing, next)) return prev;
        return { ...prev, [cat]: next };
      });
      setAsyncError((prev) => (prev === null ? prev : null));
      return;
    }

    setAsyncLoading(true);
    setAsyncError(null);
    result.then((resolved) => {
      if (!cancelled) {
        setAsyncOptions((prev) => ({ ...prev, [cat]: resolved }));
        setAsyncLoading(false);
      }
    }).catch((error) => {
      if (!cancelled) {
        const message = error instanceof Error ? error.message : 'Failed to load options';
        setAsyncError(message);
        setAsyncLoading(false);
      }
    });
    return () => { cancelled = true; setAsyncLoading(false); };
    // schema and ctx intentionally omitted — they are typically unstable
    // (parent re-renders with fresh objects) and would re-trigger fetches
    // every render. Use retry() to refetch on context changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, retryToken]);

  // ── Clean up stale dateLabels when values change externally ──

  useEffect(() => {
    setDateLabels((prev) => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;
      let changed = false;
      const next: Record<string, string> = {};
      for (const key of keys) {
        if (values[key] !== undefined) {
          next[key] = prev[key];
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [values]);

  // ── aria-live announcements for chip add/remove ──

  useEffect(() => {
    const prev = prevValueRef.current;
    prevValueRef.current = values;
    if (prev === values) return;
    const messages = diffAnnouncements(prev, values, schema, ctx, locale);
    if (messages.length === 0) return;
    setAnnouncement(messages.join('. '));
    if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
    announcementTimerRef.current = setTimeout(() => {
      setAnnouncement('');
      announcementTimerRef.current = null;
    }, ANNOUNCEMENT_CLEAR_MS);
    // schema/ctx/locale intentionally omitted — unstable refs would clobber
    // the diff before the timer clears it. Resolved against current closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  useEffect(() => () => {
    if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
  }, []);

  // ── Token derivation ───────────────────────

  function removeToken(category: string) {
    const def = schema[category];
    const next = { ...values };
    delete next[category];

    if (def?.type === 'date') {
      setDateLabels((prev) => { const n = { ...prev }; delete n[category]; return n; });
    }

    emitChange(next);
  }

  const tokens: Token[] = useMemo(
    () => buildTokens(schema, values as FilterValues<FilterSchema>, ctx, removeToken, dateLabels, locale),
    // eslint-disable-next-line react-hooks/exhaustive-deps — removeToken uses values via closure, but values is already a dep
    [schema, values, ctx, dateLabels, locale],
  );

  // ── Dropdown items ─────────────────────────

  const items: DropdownItem[] = useMemo(() => {
    const lowerSearch = search.toLowerCase();

    if (state.mode === 'categories') {
      return Object.entries(schema)
        .filter(([, def]) => !search || def.label.toLowerCase().includes(lowerSearch))
        .map(([key, def]) => ({
          key,
          label: def.label,
          icon: def.icon,
          selected: values[key] !== undefined,
          type: 'category' as const,
        }));
    }

    if (state.mode === 'values') {
      const def = schema[state.category];
      if (!def) return [];

      if (def.type === 'select') {
        // Static array → resolve inline; function → read from the cache
        // populated by the effect (avoids side-effecting the fn on every render).
        const opts = typeof def.options === 'function'
          ? asyncOptions[state.category] ?? []
          : resolveOptionsSync(def.options, ctx);
        return opts
          .filter((o) => !search || o.label.toLowerCase().includes(lowerSearch))
          .map((o) => {
            const currentVal = values[state.category];
            const selected = def.multi && Array.isArray(currentVal)
              ? (currentVal as string[]).includes(o.value)
              : currentVal === o.value;
            return { key: o.value, label: o.label, selected, type: 'value' as const };
          });
      }

      if (def.type === 'date' && def.presets) {
        const presets = def.presets as readonly (DateRangePreset | DateSinglePreset)[];
        const customLabel = `Custom${def.range ? ' range' : ''}...`;
        const items: DropdownItem[] = presets
          .filter((p) => !search || p.label.toLowerCase().includes(lowerSearch))
          .map((p, i) => ({ key: `preset-${i}`, label: p.label, selected: false, type: 'value' as const }));
        if (!search || customLabel.toLowerCase().includes(lowerSearch)) {
          items.push({ key: '__custom_date__', label: customLabel, selected: false, type: 'value' as const });
        }
        return items;
      }
    }

    return [];
  }, [state, schema, values, search, ctx, asyncOptions]);

  // Re-highlight when the user *types* a search (filtered list shifted) and
  // honour ArrowUp's "land on last item" intent. Do NOT reset on bare
  // mode/items.length changes — that would clobber the explicit highlight
  // that selectCategory sets when re-editing an existing chip.
  useEffect(() => {
    if (openIntentRef.current === 'last' && items.length > 0) {
      openIntentRef.current = null;
      setHighlightedIndex(items.length - 1);
      return;
    }
    if (search) {
      setHighlightedIndex(items.length > 0 ? 0 : -1);
    }
  }, [items.length, search]);

  // ── Item selection ─────────────────────────

  function selectItem(item: DropdownItem) {
    if (item.type === 'category') {
      selectCategory(item.key);
      return;
    }

    if (!activeCategory) return;
    const def = schema[activeCategory];
    const next = { ...values };

    if (def.type === 'select') {
      if (def.multi) {
        const current = (values[activeCategory] as string[] | undefined) ?? [];
        if (current.includes(item.key)) {
          const remaining = current.filter((v) => v !== item.key);
          if (remaining.length) {
            next[activeCategory] = remaining;
          } else {
            delete next[activeCategory];
          }
        } else {
          next[activeCategory] = [...current, item.key];
        }
        emitChange(next);
        // Multi-select stays open so the user can pick more values. Reset the
        // search so the listbox shows everything again, drop the highlight to
        // the top, and pull focus back to the input — otherwise the mouse
        // click leaves focus inside the popover and the next keystroke goes
        // to the wrong place.
        setSearch('');
        setHighlightedIndex(0);
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }
      next[activeCategory] = item.key;
    } else if (def.type === 'date' && def.presets) {
      if (item.key === '__custom_date__') {
        setState({ mode: 'input', category: activeCategory, inputType: 'date' });
        setSearch('');
        return;
      }
      const presetIndex = parseInt(item.key.replace('preset-', ''), 10);
      const presets = def.presets as readonly (DateRangePreset | DateSinglePreset)[];
      const preset = presets[presetIndex];
      if (preset) {
        setDateLabels((prev) => ({ ...prev, [activeCategory]: preset.label }));
        if ('from' in preset) {
          const dateVal: Record<string, string> = { from: preset.from().toISOString() };
          if (preset.to) dateVal.to = preset.to().toISOString();
          next[activeCategory] = dateVal;
        } else {
          next[activeCategory] = { date: preset.date().toISOString() };
        }
      }
    }

    emitChange(next);
    openCategories();
  }

  // ── Keyboard handling ──────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // If an outer DismissableLayer (Radix's capture-phase listener, etc.)
    // has already run and called preventDefault, treat ESC as already
    // handled. React 19 may flush state updates between the capture-phase
    // and bubble-phase, so without this guard the hook would re-process ESC
    // against the *new* mode and double-advance (e.g., values → categories
    // → closed).
    if (e.key === 'Escape' && e.defaultPrevented) return;

    if (state.mode === 'input' && state.inputType === 'text') {
      if (e.key === 'Enter' && search.trim() && !e.nativeEvent.isComposing) {
        e.preventDefault();
        emitChange({ ...values, [state.category]: search.trim() });
        openCategories();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        goBack();
      }
      return;
    }

    if (state.mode === 'input' && (state.inputType === 'date' || state.inputType === 'number')) {
      if (e.key === 'Escape') { e.preventDefault(); goBack(); }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) { openCategories(); return; }
      // Wrap from last back to first.
      setHighlightedIndex((i) =>
        items.length === 0 ? -1 : i >= items.length - 1 ? 0 : i + 1,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        // WAI-ARIA combobox: ArrowUp on a closed combobox opens the popup
        // and lands on the *last* item (mirror of ArrowDown landing on first).
        openIntentRef.current = 'last';
        openCategories();
        return;
      }
      // Wrap from first / unset back to last.
      setHighlightedIndex((i) =>
        items.length === 0 ? -1 : i <= 0 ? items.length - 1 : i - 1,
      );
    } else if (e.key === 'Home') {
      if (isOpen && items.length > 0) {
        e.preventDefault();
        setHighlightedIndex(0);
      }
    } else if (e.key === 'End') {
      if (isOpen && items.length > 0) {
        e.preventDefault();
        setHighlightedIndex(items.length - 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && items[highlightedIndex]) selectItem(items[highlightedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      goBack();
    } else if (e.key === 'Backspace' && !search && !e.nativeEvent.isComposing) {
      // Single-press: remove the last chip directly. Matches Linear, Slack,
      // Mantine TagsInput, and modern chip-input convention.
      if (tokens.length > 0) tokens[tokens.length - 1].remove();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearch(val);
    // Typing in a panel mode (date / number) means the user is searching for
    // a different filter, not entering panel data. Bounce back to categories
    // so the typed text actually drives a visible search.
    if (state.mode === 'closed' || (state.mode === 'input' && state.inputType !== 'text')) {
      setState({ mode: 'categories' });
    }
  }

  function handleFocus() {
    if (state.mode === 'closed') openCategories();
  }

  // ── Return ─────────────────────────────────

  const inputPlaceholder =
    state.mode === 'input' && state.inputType === 'text'
      ? (schema[state.category]?.type === 'text'
          ? (schema[state.category] as { placeholder?: string }).placeholder
          : undefined) ?? `Type ${schema[state.category]?.label}...`
      : state.mode === 'values' && schema[state.category]
        ? `Search ${schema[state.category].label}...`
        : placeholder;

  return {
    tokens,
    announcement,
    inputProps: {
      ref: inputRef,
      value: search,
      onChange: handleInputChange,
      onKeyDown: handleKeyDown,
      onFocus: handleFocus,
      onBlur: () => {},
      placeholder: inputPlaceholder,
      role: 'combobox' as const,
      'aria-expanded': isOpen,
      // Default to 'listbox'; consumers rendering a panel-style popup
      // (e.g. a date picker) should override to 'dialog'.
      'aria-haspopup': 'listbox' as const,
      // Left undefined here because the hook can't know the consumer's
      // listbox ID scheme. Compose with `dropdown.highlightedItem` if you
      // want the standard `${listboxId}-item-${key}` form.
      'aria-activedescendant': undefined,
      'aria-autocomplete': 'list' as const,
    },
    dropdown: {
      open: isOpen,
      loading: asyncLoading,
      error: asyncError,
      retry: () => setRetryToken((n) => n + 1),
      items,
      select: selectItem,
      close,
      goBack,
      highlightedIndex,
      highlightedItem: items[highlightedIndex] ?? null,
      setHighlightedIndex,
      state,
    },
    open: () => { if (state.mode === 'closed') openCategories(); },
    openCategory: (key: string) => { selectCategory(key); },
    clear: () => { emitChange({}); setDateLabels({}); close(); },
    setDateValue: (category: string, dateValue: { from?: string; to?: string } | { date: string }) => {
      setDateLabels((prev) => { const n = { ...prev }; delete n[category]; return n; });
      emitChange({ ...values, [category]: dateValue });
      // Close after Apply: configuring a custom date is a deliberate
      // multi-step action; the user signalled "done" by clicking Apply.
      // (Preset selection uses the selectItem path and stays open.)
      close();
    },
    setNumberValue: (category: string, numValue: { min?: number; max?: number }) => {
      emitChange({ ...values, [category]: numValue });
      // Same as setDateValue: Apply on a number panel is a deliberate
      // commit, so close rather than reopening to categories.
      close();
    },
  } as FilterTokensReturn<T>;
}
