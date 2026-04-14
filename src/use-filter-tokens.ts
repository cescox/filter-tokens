import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type {
  FilterSchema,
  FilterValues,
  UseFilterTokensOptions,
  FilterTokensReturn,
  DropdownItem,
  DropdownState,
  Token,
  Option,
  Preset,
  FilterContext,
} from './types';
import { resolveOptionsSync, buildTokens } from './utils';

export function useFilterTokens<const T extends FilterSchema>(
  options: UseFilterTokensOptions<T>,
): FilterTokensReturn<T> {
  const { filters, value, onChange, placeholder = 'Filter...' } = options;

  const schema = filters as unknown as FilterSchema;
  const values = value as unknown as FilterValues<FilterSchema>;

  const [search, setSearch] = useState('');
  const [dropdownState, setDropdownState] = useState<DropdownState>({ mode: 'closed' });
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null);
  const [asyncOptions, setAsyncOptions] = useState<Record<string, Option[] | Preset[]>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const ctx: FilterContext = useMemo(() => ({ filters: values }), [values]);

  const removeToken = useCallback(
    (category: string, tokenValue?: string) => {
      const def = schema[category];
      const newValue = { ...values };

      if (def.type === 'select' && def.multi && Array.isArray(values[category]) && tokenValue) {
        const remaining = (values[category] as string[]).filter((v) => v !== tokenValue);
        if (remaining.length === 0) {
          delete newValue[category];
        } else {
          newValue[category] = remaining as never;
        }
      } else {
        delete newValue[category];
      }

      onChange(newValue as FilterValues<T>);
    },
    [schema, values, onChange],
  );

  const tokens: Token[] = useMemo(
    () => buildTokens(schema, values, ctx, removeToken),
    [schema, values, ctx, removeToken],
  );

  // Load async options when entering values mode
  useEffect(() => {
    if (dropdownState.mode !== 'values') return;
    const category = dropdownState.category;
    const def = schema[category];
    if (!def) return;

    let optionsOrFn: typeof def.type extends 'select'
      ? typeof def
      : never;

    if (def.type === 'select') {
      const raw = def.options;
      if (typeof raw === 'function' && !Array.isArray(raw)) {
        const result = raw(ctx);
        if (result instanceof Promise) {
          result.then((resolved) => {
            setAsyncOptions((prev) => ({ ...prev, [category]: resolved }));
          });
          return;
        }
      }
    } else if (def.type === 'date' && def.presets) {
      const raw = def.presets;
      if (typeof raw === 'function' && !Array.isArray(raw)) {
        const result = raw(ctx);
        if (result instanceof Promise) {
          result.then((resolved) => {
            setAsyncOptions((prev) => ({ ...prev, [category]: resolved }));
          });
          return;
        }
      }
    }
  }, [dropdownState, schema, ctx]);

  const getDropdownItems = useCallback((): DropdownItem[] => {
    const lowerSearch = search.toLowerCase();

    if (dropdownState.mode === 'categories') {
      return Object.entries(schema)
        .filter(([, def]) => {
          if (!search) return true;
          return def.label.toLowerCase().includes(lowerSearch);
        })
        .map(([key, def]) => ({
          key,
          label: def.label,
          icon: def.icon,
          selected: values[key] !== undefined,
          type: 'category' as const,
        }));
    }

    if (dropdownState.mode === 'values') {
      const category = dropdownState.category;
      const def = schema[category];
      if (!def) return [];

      if (def.type === 'select') {
        let opts = resolveOptionsSync(def.options, ctx);
        if (opts.length === 0 && asyncOptions[category]) {
          opts = asyncOptions[category] as Option[];
        }
        return opts
          .filter((o) => {
            if (!search) return true;
            return o.label.toLowerCase().includes(lowerSearch);
          })
          .map((o) => {
            const currentVal = values[category];
            let selected = false;
            if (def.multi && Array.isArray(currentVal)) {
              selected = (currentVal as string[]).includes(o.value);
            } else {
              selected = currentVal === o.value;
            }
            return {
              key: o.value,
              label: o.label,
              selected,
              type: 'value' as const,
            };
          });
      }

      if (def.type === 'date' && def.presets) {
        let presets = resolveOptionsSync(def.presets, ctx);
        if (presets.length === 0 && asyncOptions[category]) {
          presets = asyncOptions[category] as Preset[];
        }
        const dateVal = values[category] as { preset?: string } | undefined;
        return presets
          .filter((p) => {
            if (!search) return true;
            return p.label.toLowerCase().includes(lowerSearch);
          })
          .map((p) => ({
            key: p.value,
            label: p.label,
            selected: dateVal?.preset === p.value,
            type: 'value' as const,
          }));
      }

      return [];
    }

    return [];
  }, [dropdownState, schema, values, search, ctx, asyncOptions]);

  const items = useMemo(() => getDropdownItems(), [getDropdownItems]);

  // Reset highlighted index when items change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [items.length, dropdownState.mode]);

  const selectItem = useCallback(
    (item: DropdownItem) => {
      if (item.type === 'category') {
        const def = schema[item.key];
        if (def.type === 'text') {
          setDropdownState({ mode: 'text-entry', category: item.key });
          setSearch('');
          return;
        }
        if (def.type === 'date' && !def.presets) {
          setDropdownState({ mode: 'date-entry', category: item.key });
          setSearch('');
          return;
        }
        setDropdownState({ mode: 'values', category: item.key });
        setSearch('');
        return;
      }

      // item.type === 'value'
      if (dropdownState.mode !== 'values') return;
      const category = dropdownState.category;
      const def = schema[category];
      const newValue = { ...values };

      if (def.type === 'select') {
        if (def.multi) {
          const current = (values[category] as string[] | undefined) || [];
          if (current.includes(item.key)) {
            const remaining = current.filter((v) => v !== item.key);
            if (remaining.length === 0) {
              delete newValue[category];
            } else {
              newValue[category] = remaining as never;
            }
          } else {
            newValue[category] = [...current, item.key] as never;
          }
          onChange(newValue as FilterValues<T>);
          // Keep dropdown open for multi-select
          return;
        }
        newValue[category] = item.key as never;
      } else if (def.type === 'date') {
        newValue[category] = { preset: item.key } as never;
      }

      onChange(newValue as FilterValues<T>);
      setDropdownState({ mode: 'closed' });
      setSearch('');
    },
    [dropdownState, schema, values, onChange],
  );

  const closeDropdown = useCallback(() => {
    setDropdownState({ mode: 'closed' });
    setSearch('');
    setHighlightedIndex(0);
    setSelectedTokenIndex(null);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearch(val);
      setSelectedTokenIndex(null);
      if (dropdownState.mode === 'closed') {
        setDropdownState({ mode: 'categories' });
      }
    },
    [dropdownState.mode],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Text entry mode: Enter creates token
      if (dropdownState.mode === 'text-entry') {
        if (e.key === 'Enter' && search.trim()) {
          e.preventDefault();
          const category = dropdownState.category;
          const newValue = { ...values, [category]: search.trim() as never };
          onChange(newValue as FilterValues<T>);
          setDropdownState({ mode: 'closed' });
          setSearch('');
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeDropdown();
        }
        return;
      }

      // Date entry mode
      if (dropdownState.mode === 'date-entry') {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeDropdown();
        }
        return;
      }

      const isOpen = dropdownState.mode === 'categories' || dropdownState.mode === 'values';

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) {
          setDropdownState({ mode: 'categories' });
          return;
        }
        setHighlightedIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex((i) => Math.max(i - 1, 0));
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (isOpen && items[highlightedIndex]) {
          selectItem(items[highlightedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isOpen) {
          if (dropdownState.mode === 'values') {
            setDropdownState({ mode: 'categories' });
            setSearch('');
          } else {
            closeDropdown();
          }
        }
      } else if (e.key === 'Backspace' && !search) {
        if (selectedTokenIndex !== null) {
          tokens[selectedTokenIndex]?.remove();
          setSelectedTokenIndex(null);
        } else if (tokens.length > 0) {
          setSelectedTokenIndex(tokens.length - 1);
        }
      }
    },
    [
      dropdownState,
      search,
      items,
      highlightedIndex,
      tokens,
      selectedTokenIndex,
      values,
      onChange,
      selectItem,
      closeDropdown,
    ],
  );

  const handleFocus = useCallback(() => {
    if (dropdownState.mode === 'closed') {
      setDropdownState({ mode: 'categories' });
    }
  }, [dropdownState.mode]);

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (relatedTarget?.closest('[data-filter-tokens-dropdown]')) {
        return;
      }
      closeDropdown();
    },
    [closeDropdown],
  );

  const isOpen = dropdownState.mode !== 'closed';
  const highlightedId = isOpen && items[highlightedIndex]
    ? `filter-tokens-item-${items[highlightedIndex].key}`
    : undefined;

  return {
    tokens,
    inputProps: {
      ref: inputRef,
      value: search,
      onChange: handleInputChange,
      onKeyDown: handleKeyDown,
      onFocus: handleFocus,
      onBlur: handleBlur,
      placeholder:
        dropdownState.mode === 'text-entry'
          ? (schema[dropdownState.category]?.type === 'text'
              ? (schema[dropdownState.category] as { placeholder?: string }).placeholder
              : undefined) || `Type ${schema[dropdownState.category]?.label}...`
          : tokens.length > 0
            ? ''
            : placeholder,
      role: 'combobox' as const,
      'aria-expanded': isOpen,
      'aria-haspopup': 'listbox' as const,
      'aria-activedescendant': highlightedId,
      'aria-autocomplete': 'list' as const,
    },
    dropdown: {
      open: isOpen,
      items,
      select: selectItem,
      close: closeDropdown,
      highlightedIndex,
      state: dropdownState,
    },
    clear: () => {
      onChange({} as FilterValues<T>);
      closeDropdown();
    },
  } as FilterTokensReturn<T>;
}
