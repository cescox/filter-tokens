'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import type {
  FilterSchema,
  FilterValues,
  UseFilterTokensOptions,
  FilterTokensReturn,
  DropdownItem,
  Token,
  Option,
  DateRangePreset,
  DateSinglePreset,
} from './types';
import { resolveOptionsSync, buildTokens } from './utils';

const noop = () => {};

function optionsContentEqual(a: Option[], b: Option[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].value !== b[i].value || a[i].label !== b[i].label) return false;
  }
  return true;
}

type Mode = 'closed' | 'categories' | 'values' | 'text-entry' | 'date-entry' | 'number-entry';

export function useFilterTokens<const T extends FilterSchema>(
  options: UseFilterTokensOptions<T>,
): FilterTokensReturn<T> {
  const { filters, value, onChange, placeholder = 'Filter...', locale } = options;

  // Internal untyped references — the generic boundary is at input/output only
  const schema = filters as Record<string, FilterSchema[string]>;
  const values = value as Record<string, unknown>;
  const emitChange = onChange as (v: Record<string, unknown>) => void;

  // ── State ──────────────────────────────────

  const [mode, setMode] = useState<Mode>('closed');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null);
  const [asyncOptions, setAsyncOptions] = useState<Record<string, Option[]>>({});
  const [asyncLoading, setAsyncLoading] = useState(false);
  const [asyncError, setAsyncError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [dateLabels, setDateLabels] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = mode !== 'closed';
  const ctx = useMemo(() => ({ filters: values as FilterValues<FilterSchema> }), [values]);

  // ── State transitions ──────────────────────

  function openCategories() {
    setMode('categories');
    setActiveCategory(null);
    setHighlightedIndex(-1);
    setSearch('');
  }

  function selectCategory(key: string) {
    const def = schema[key];
    if (!def) return;

    if (def.type === 'text') {
      setMode('text-entry');
      setActiveCategory(key);
      setHighlightedIndex(-1);
      const currentVal = values[key];
      setSearch(typeof currentVal === 'string' ? currentVal : '');
      return;
    }

    if (def.type === 'number') {
      setMode('number-entry');
      setActiveCategory(key);
      setHighlightedIndex(-1);
      setSearch('');
      return;
    }

    if (def.type === 'date' && (!def.presets?.length || (values[key] && !dateLabels[key]))) {
      setMode('date-entry');
      setActiveCategory(key);
      setHighlightedIndex(-1);
      setSearch('');
      return;
    }

    setMode('values');
    setActiveCategory(key);
    setHighlightedIndex(0);
    setSearch('');
  }

  function goBack() {
    if (mode === 'date-entry' && activeCategory) {
      const def = schema[activeCategory];
      if (def?.type === 'date' && def.presets?.length) {
        setMode('values');
        setHighlightedIndex(0);
        setSearch('');
        return;
      }
    }
    if (mode === 'values' || mode === 'text-entry' || mode === 'date-entry' || mode === 'number-entry') {
      openCategories();
      return;
    }
    close();
  }

  function close() {
    setMode('closed');
    setActiveCategory(null);
    setSearch('');
    setHighlightedIndex(-1);
    setSelectedTokenIndex(null);
  }

  function afterValueSelected() {
    openCategories();
  }

  // ── Async options loading ──────────────────

  useEffect(() => {
    if (mode !== 'values' || !activeCategory) return;
    const def = schema[activeCategory];
    if (def?.type !== 'select') return;

    const raw = def.options;
    if (typeof raw !== 'function') return;

    let cancelled = false;
    const result = raw(ctx);

    if (!(result instanceof Promise)) {
      // Sync fn — bail when content is unchanged to avoid loops with unstable ctx
      const next = result as Option[];
      setAsyncOptions((prev) => {
        const existing = prev[activeCategory];
        if (existing && optionsContentEqual(existing, next)) return prev;
        return { ...prev, [activeCategory]: next };
      });
      setAsyncError((prev) => (prev === null ? prev : null));
      return;
    }

    setAsyncLoading(true);
    setAsyncError(null);
    result.then((resolved) => {
      if (!cancelled) {
        setAsyncOptions((prev) => ({ ...prev, [activeCategory]: resolved }));
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
  }, [mode, activeCategory, retryToken]);

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

  // Clamp selectedTokenIndex when tokens shrink (e.g. parent removed a value)
  useEffect(() => {
    if (selectedTokenIndex !== null && selectedTokenIndex >= tokens.length) {
      setSelectedTokenIndex(tokens.length > 0 ? tokens.length - 1 : null);
    }
  }, [tokens.length, selectedTokenIndex]);

  // ── Dropdown items ─────────────────────────

  const items: DropdownItem[] = useMemo(() => {
    const lowerSearch = search.toLowerCase();

    if (mode === 'categories') {
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

    if (mode === 'values' && activeCategory) {
      const def = schema[activeCategory];
      if (!def) return [];

      if (def.type === 'select') {
        // Static array → resolve inline; function → read from the cache
        // populated by the effect (avoids side-effecting the fn on every render).
        const opts = typeof def.options === 'function'
          ? asyncOptions[activeCategory] ?? []
          : resolveOptionsSync(def.options, ctx);
        return opts
          .filter((o) => !search || o.label.toLowerCase().includes(lowerSearch))
          .map((o) => {
            const currentVal = values[activeCategory];
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
  }, [mode, activeCategory, schema, values, search, ctx, asyncOptions]);

  // Reset highlight when items change
  useEffect(() => {
    if (mode === 'categories') setHighlightedIndex(search ? 0 : -1);
    else if (mode === 'values') setHighlightedIndex(0);
  }, [items.length, mode, search]);

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
        return; // stay open for multi
      }
      next[activeCategory] = item.key;
    } else if (def.type === 'date' && def.presets) {
      if (item.key === '__custom_date__') {
        setMode('date-entry');
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
    afterValueSelected();
  }

  // ── Keyboard handling ──────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (mode === 'text-entry' && activeCategory) {
      if (e.key === 'Enter' && search.trim()) {
        e.preventDefault();
        emitChange({ ...values, [activeCategory]: search.trim() });
        afterValueSelected();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        goBack();
      }
      return;
    }

    if (mode === 'date-entry' || mode === 'number-entry') {
      if (e.key === 'Escape') { e.preventDefault(); goBack(); }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) { openCategories(); return; }
      setHighlightedIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) setHighlightedIndex((i) => Math.max(i - 1, 0));
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
    } else if (e.key === 'Backspace' && !search) {
      if (selectedTokenIndex !== null) {
        tokens[selectedTokenIndex]?.remove();
        setSelectedTokenIndex(null);
      } else if (tokens.length > 0) {
        setSelectedTokenIndex(tokens.length - 1);
      }
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearch(val);
    setSelectedTokenIndex(null);
    if (mode === 'closed') setMode('categories');
  }

  function handleFocus() {
    if (mode === 'closed') openCategories();
  }

  // ── ARIA ───────────────────────────────────

  const highlightedId = isOpen && items[highlightedIndex]
    ? `filter-tokens-item-${items[highlightedIndex].key}`
    : undefined;

  // ── Return ─────────────────────────────────

  const inputPlaceholder = mode === 'text-entry' && activeCategory
    ? (schema[activeCategory]?.type === 'text'
        ? (schema[activeCategory] as { placeholder?: string }).placeholder
        : undefined) ?? `Type ${schema[activeCategory]?.label}...`
    : tokens.length > 0
      ? ''
      : placeholder;

  return {
    tokens,
    inputProps: {
      ref: inputRef,
      value: search,
      onChange: handleInputChange,
      onKeyDown: handleKeyDown,
      onFocus: handleFocus,
      onBlur: noop,
      placeholder: inputPlaceholder,
      role: 'combobox' as const,
      'aria-expanded': isOpen,
      'aria-haspopup': 'listbox' as const,
      'aria-activedescendant': highlightedId,
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
      setHighlightedIndex,
      state: {
        mode,
        category: activeCategory,
      },
    },
    open: () => { if (mode === 'closed') openCategories(); },
    openCategory: (key: string) => { selectCategory(key); },
    clear: () => { emitChange({}); setDateLabels({}); close(); },
    setDateValue: (category: string, dateValue: { from: string; to?: string } | { date: string }) => {
      setDateLabels((prev) => { const n = { ...prev }; delete n[category]; return n; });
      emitChange({ ...values, [category]: dateValue });
      afterValueSelected();
    },
    setNumberValue: (category: string, numValue: { min?: number; max?: number }) => {
      emitChange({ ...values, [category]: numValue });
      afterValueSelected();
    },
  } as FilterTokensReturn<T>;
}
