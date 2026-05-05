'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import type {
  FilterContext,
  FilterDef,
  FilterSchema,
  FilterValues,
  SelectFilterDef,
  UseFilterTokensOptions,
  FilterTokensReturn,
  FilterTokensDropdownItem,
  FilterTokensDropdownState,
  FilterTokensMessages,
  FilterTokensToken,
  FilterTokensOption,
  DateRangePreset,
  DateSinglePreset,
} from './types';
import { resolveOptionsSync, buildTokens, findOptionLabel, formatFilterValue } from './lib/format';
import { mergeMessages } from './lib/messages';

// ── Constants ──────────────────────────────

const ANNOUNCEMENT_CLEAR_MS = 1500;

// Special dropdown-item keys for the date filter's preset list. These are
// internal — they only appear in DropdownItem.key while the user is browsing
// presets. Resolved back to a preset index (or the "custom" sentinel) inside
// selectItem; never persisted to the consumer's value record.
const CUSTOM_DATE_KEY = '__custom_date__';
const PRESET_KEY_PREFIX = 'preset-';
const presetKey = (index: number) => `${PRESET_KEY_PREFIX}${index}`;
const parsePresetKey = (key: string): number | null => {
  if (!key.startsWith(PRESET_KEY_PREFIX)) return null;
  const n = parseInt(key.slice(PRESET_KEY_PREFIX.length), 10);
  return Number.isFinite(n) ? n : null;
};

// ── Pure helpers ───────────────────────────

/**
 * Shallow content equality on option arrays — used to short-circuit the async
 * options effect when a sync options function returns a fresh-but-equivalent
 * array on every render.
 */
function optionsContentEqual(a: FilterTokensOption[], b: FilterTokensOption[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].value !== b[i].value || a[i].label !== b[i].label) return false;
  }
  return true;
}

/**
 * Picks the dropdown state and search seed produced by drilling into a
 * filter category. Pure — given the schema entry and current filter
 * values, decides whether to land on the values list (select / date with
 * presets) or jump straight into the input panel (text / number / date
 * without presets / re-editing a custom date). The select-list highlight
 * index is computed by the caller because it depends on async option
 * data the hook owns.
 */
function pickInitialDropdownState(
  key: string,
  def: FilterDef,
  values: Record<string, unknown>,
  dateLabels: Record<string, string>,
): { state: FilterTokensDropdownState; search: string } {
  if (def.type === 'text') {
    const currentVal = values[key];
    return {
      state: { mode: 'input', category: key, inputType: 'text' },
      search: typeof currentVal === 'string' ? currentVal : '',
    };
  }
  if (def.type === 'number') {
    return { state: { mode: 'input', category: key, inputType: 'number' }, search: '' };
  }
  // Date with no presets, or re-editing a custom (non-preset) date value:
  // skip the preset list and open the calendar straight away.
  if (def.type === 'date' && (!def.presets?.length || (values[key] && !dateLabels[key]))) {
    return { state: { mode: 'input', category: key, inputType: 'date' }, search: '' };
  }
  return { state: { mode: 'values', category: key }, search: '' };
}

/**
 * Returns the index of the currently-set option in the values list when
 * re-editing a select chip, so Enter doesn't silently overwrite the user's
 * pick. Falls back to 0 for fresh selections, missing values, or async
 * options that haven't loaded yet.
 */
function findCurrentSelectIndex(
  def: SelectFilterDef,
  currentVal: unknown,
  cachedAsyncOptions: FilterTokensOption[] | undefined,
  ctx: FilterContext,
): number {
  const opts =
    typeof def.options === 'function'
      ? cachedAsyncOptions ?? []
      : resolveOptionsSync(def.options, ctx);
  if (def.multi && Array.isArray(currentVal) && currentVal.length > 0) {
    const idx = opts.findIndex((o) => (currentVal as string[]).includes(o.value));
    return idx >= 0 ? idx : 0;
  }
  if (typeof currentVal === 'string') {
    const idx = opts.findIndex((o) => o.value === currentVal);
    return idx >= 0 ? idx : 0;
  }
  return 0;
}

/**
 * Picks the placeholder shown in the combobox input. Text-input mode uses
 * the filter's own placeholder (or "Type Label...") to telegraph what
 * the user is editing; values-list mode invites search ("Search Label...");
 * everything else falls back to the consumer's top-level placeholder.
 */
function getPlaceholder(
  state: FilterTokensDropdownState,
  schema: Record<string, FilterDef>,
  fallback: string,
  messages: FilterTokensMessages,
): string {
  if (state.mode === 'input' && state.inputType === 'text') {
    const def = schema[state.category];
    if (def?.type === 'text' && def.placeholder) return def.placeholder;
    return messages.typePlaceholder(def?.label ?? state.category);
  }
  if (state.mode === 'values') {
    const def = schema[state.category];
    if (def) return messages.searchPlaceholder(def.label);
  }
  return fallback;
}

function diffAnnouncements(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  schema: Record<string, FilterSchema[string]>,
  ctx: { filters: FilterValues<FilterSchema> },
  locale: string | undefined,
  messages: FilterTokensMessages,
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

    // Multi-select diffs at the element level so we say "Added Status: Open"
    // rather than re-announcing the entire selection on every toggle.
    if (def.type === 'select' && def.multi) {
      const pArr = (p as string[] | undefined) ?? [];
      const nArr = (n as string[] | undefined) ?? [];
      const options = resolveOptionsSync(def.options, ctx);
      for (const v of nArr) {
        if (!pArr.includes(v)) out.push(messages.tokenAddedAnnouncement(label, findOptionLabel(options, v)));
      }
      for (const v of pArr) {
        if (!nArr.includes(v)) out.push(messages.tokenRemovedAnnouncement(label, findOptionLabel(options, v)));
      }
      continue;
    }

    const pDisplay = formatFilterValue(def, p, ctx, locale, undefined, messages);
    const nDisplay = formatFilterValue(def, n, ctx, locale, undefined, messages);
    if (p === undefined && n !== undefined) {
      if (nDisplay) out.push(messages.tokenAddedAnnouncement(label, nDisplay));
    } else if (p !== undefined && n === undefined) {
      if (pDisplay) out.push(messages.tokenRemovedAnnouncement(label, pDisplay));
    } else {
      if (pDisplay) out.push(messages.tokenRemovedAnnouncement(label, pDisplay));
      if (nDisplay) out.push(messages.tokenAddedAnnouncement(label, nDisplay));
    }
  }
  return out;
}

export function useFilterTokens<const T extends FilterSchema>(
  options: UseFilterTokensOptions<T>,
): FilterTokensReturn<T> {
  const { filters, value, onChange, placeholder = 'Filter...', locale, messages: messagesOverride } = options;

  // Internal untyped references — the generic boundary is at input/output only
  const schema = filters as Record<string, FilterSchema[string]>;
  const values = value as Record<string, unknown>;
  const emitChange = onChange as (v: Record<string, unknown>) => void;
  const messages = useMemo(() => mergeMessages(messagesOverride), [messagesOverride]);

  // ── State ──────────────────────────────────
  //
  // The dropdown state is a single discriminated union — `mode` plus the
  // mode-specific fields (`category`, `inputType`). Keeping these in one
  // useState eliminates the "forgot to reset inputType when switching modes"
  // class of bug and lets TypeScript enforce the invariants at every read
  // and every transition.

  const [state, setState] = useState<FilterTokensDropdownState>({ mode: 'closed' });
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [asyncOptions, setAsyncOptions] = useState<Record<string, FilterTokensOption[]>>({});
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

    const { state: nextState, search: nextSearch } =
      pickInitialDropdownState(key, def, values, dateLabels);
    setState(nextState);
    setSearch(nextSearch);

    // Only the values-list of a select can pre-highlight the current pick —
    // input modes have no list and date presets are stateless actions.
    if (nextState.mode === 'values' && def.type === 'select') {
      setHighlightedIndex(findCurrentSelectIndex(def, values[key], asyncOptions[key], ctx));
    } else {
      setHighlightedIndex(-1);
    }
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
      const next = result as FilterTokensOption[];
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
    const announcements = diffAnnouncements(prev, values, schema, ctx, locale, messages);
    if (announcements.length === 0) return;
    setAnnouncement(announcements.join('. '));
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

  const tokens: FilterTokensToken[] = useMemo(
    () => buildTokens(schema, values as FilterValues<FilterSchema>, ctx, removeToken, dateLabels, locale, messages),
    // eslint-disable-next-line react-hooks/exhaustive-deps — removeToken uses values via closure, but values is already a dep
    [schema, values, ctx, dateLabels, locale, messages],
  );

  // ── Dropdown items ─────────────────────────

  const items: FilterTokensDropdownItem[] = useMemo(() => {
    const lowerSearch = search.toLowerCase();

    if (state.mode === 'categories') {
      return Object.entries(schema)
        .filter(([, def]) => !search || def.label.toLowerCase().includes(lowerSearch))
        .map(([key, def]) => ({
          kind: 'category' as const,
          key,
          label: def.label,
          icon: def.icon,
          selected: values[key] !== undefined,
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
            return { kind: 'value' as const, key: o.value, label: o.label, selected };
          });
      }

      if (def.type === 'date' && def.presets) {
        const presets = def.presets as readonly (DateRangePreset | DateSinglePreset)[];
        const customLabel = def.range
          ? messages.datePresetCustomRangeLabel
          : messages.datePresetCustomLabel;
        const items: FilterTokensDropdownItem[] = presets
          .filter((p) => !search || p.label.toLowerCase().includes(lowerSearch))
          .map((p, i) => ({ kind: 'preset' as const, key: presetKey(i), label: p.label, selected: false }));
        if (!search || customLabel.toLowerCase().includes(lowerSearch)) {
          items.push({ kind: 'custom-date' as const, key: CUSTOM_DATE_KEY, label: customLabel, selected: false });
        }
        return items;
      }
    }

    return [];
  }, [state, schema, values, search, ctx, asyncOptions, messages]);

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

  function selectItem(item: FilterTokensDropdownItem) {
    if (item.kind === 'category') {
      selectCategory(item.key);
      return;
    }

    if (item.kind === 'custom-date' && activeCategory) {
      setState({ mode: 'input', category: activeCategory, inputType: 'date' });
      setSearch('');
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
      const presetIndex = parsePresetKey(item.key);
      const presets = def.presets as readonly (DateRangePreset | DateSinglePreset)[];
      const preset = presetIndex !== null ? presets[presetIndex] : undefined;
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

  const inputPlaceholder = getPlaceholder(state, schema, placeholder, messages);

  return {
    tokens,
    announcement,
    messages,
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
      isOpen,
      loading: asyncLoading,
      error: asyncError,
      retry: () => setRetryToken((n) => n + 1),
      items,
      select: selectItem,
      open: () => { if (state.mode === 'closed') openCategories(); },
      openFilter: (key: string) => { selectCategory(key); },
      close,
      goBack,
      highlightedIndex,
      highlightedItem: items[highlightedIndex] ?? null,
      setHighlightedIndex,
      state,
    },
    clear: () => { emitChange({}); setDateLabels({}); close(); },
    applyDate: (category: string, value: { from?: string; to?: string } | { date: string }) => {
      setDateLabels((prev) => { const n = { ...prev }; delete n[category]; return n; });
      emitChange({ ...values, [category]: value });
      // Close after Apply: configuring a custom date is a deliberate
      // multi-step action; the user signalled "done" by clicking Apply.
      // (Preset selection uses the selectItem path and stays open.)
      close();
    },
    applyNumber: (category: string, value: { min?: number; max?: number }) => {
      emitChange({ ...values, [category]: value });
      // Same as applyDate: Apply on a number panel is a deliberate
      // commit, so close rather than reopening to categories.
      close();
    },
  } as FilterTokensReturn<T>;
}
