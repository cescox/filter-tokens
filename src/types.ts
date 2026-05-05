import type { ComponentType, ChangeEvent, KeyboardEvent, RefObject } from 'react';

/** Icon shape accepted by FilterDef.icon and FilterTokensDropdownItem.icon. */
export type IconComponent = ComponentType<{ className?: string }>;

export interface FilterTokensOption {
  readonly value: string;
  readonly label: string;
}

export interface FilterContext<T extends FilterSchema = FilterSchema> {
  filters: FilterValues<T>;
}

export type OptionsOrFn<T extends { value: string; label: string }> =
  | readonly T[]
  | ((ctx: FilterContext) => T[])
  | ((ctx: FilterContext) => Promise<T[]>);

// ── Date presets ───────────────────────────

export interface DateRangePreset {
  readonly label: string;
  readonly from: () => Date;
  readonly to?: () => Date;
}

export interface DateSinglePreset {
  readonly label: string;
  readonly date: () => Date;
}

// ── Filter definitions ─────────────────────

export type SelectFilterDef = {
  readonly type: 'select';
  readonly label: string;
  readonly icon?: IconComponent;
  readonly multi?: boolean;
  readonly options: OptionsOrFn<FilterTokensOption>;
};

export type DateFilterDef = {
  readonly type: 'date';
  readonly label: string;
  readonly icon?: IconComponent;
  readonly range?: boolean;
  readonly time?: boolean;
  readonly presets?: readonly DateRangePreset[] | readonly DateSinglePreset[];
};

export type TextFilterDef = {
  readonly type: 'text';
  readonly label: string;
  readonly icon?: IconComponent;
  readonly placeholder?: string;
};

export type NumberFilterDef = {
  readonly type: 'number';
  readonly label: string;
  readonly icon?: IconComponent;
  readonly unit?: string;
  readonly min?: number;
  readonly max?: number;
};

export type FilterDef = SelectFilterDef | DateFilterDef | TextFilterDef | NumberFilterDef;

export type FilterSchema = Record<string, FilterDef>;

// ── Value type inference ───────────────────

type ExtractValues<T> = T extends readonly { value: infer V extends string }[]
  ? V
  : string;

type SelectValue<T extends SelectFilterDef> =
  T['multi'] extends true
    ? ExtractValues<T['options']>[]
    : ExtractValues<T['options']>;

// Range filters allow either bound to be present (or both). When `from` is
// missing the filter renders as "Until X"; when `to` is missing as "Since X".
type DateValue<T extends DateFilterDef> =
  T['range'] extends true ? { from?: string; to?: string } : { date: string };

type TextValue = string;

type NumberValue = { min?: number; max?: number };

type InferFilterValue<T extends FilterDef> =
  T extends SelectFilterDef ? SelectValue<T> :
  T extends DateFilterDef ? DateValue<T> :
  T extends TextFilterDef ? TextValue :
  T extends NumberFilterDef ? NumberValue :
  never;

export type FilterValues<T extends FilterSchema> = {
  [K in keyof T]?: InferFilterValue<T[K]>;
};

// ── Token ──────────────────────────────────

export interface FilterTokensToken {
  id: string;
  category: string;
  label: string;
  displayValue: string;
  remove: () => void;
}

// ── Dropdown ───────────────────────────────

export interface FilterTokensDropdownItem {
  key: string;
  label: string;
  icon?: IconComponent;
  selected: boolean;
  type: 'category' | 'value';
}

export type FilterTokensDropdownState =
  | { mode: 'closed' }
  | { mode: 'categories' }
  | { mode: 'values'; category: string }
  | { mode: 'input'; category: string; inputType: 'text' | 'date' | 'number' };

// ── Hook return ────────────────────────────

export interface FilterTokensInputProps {
  ref: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  placeholder: string;
  role: 'combobox';
  'aria-expanded': boolean;
  'aria-haspopup': 'listbox' | 'dialog';
  'aria-activedescendant': string | undefined;
  'aria-autocomplete': 'list';
}

export interface FilterTokensDropdown {
  open: boolean;
  loading: boolean;
  error: string | null;
  retry: () => void;
  items: FilterTokensDropdownItem[];
  select: (item: FilterTokensDropdownItem) => void;
  close: () => void;
  goBack: () => void;
  highlightedIndex: number;
  /**
   * The item at `highlightedIndex`, or null when nothing is highlighted.
   * Convenient for composing `aria-activedescendant`:
   * `aria-activedescendant={ft.dropdown.highlightedItem ? ${listboxId}-item-${ft.dropdown.highlightedItem.key} : undefined}`
   */
  highlightedItem: FilterTokensDropdownItem | null;
  setHighlightedIndex: (index: number) => void;
  state: FilterTokensDropdownState;
}

export interface FilterTokensReturn<T extends FilterSchema> {
  tokens: FilterTokensToken[];
  /**
   * Screen-reader announcement string for chip add/remove operations.
   * Wire this to a visually-hidden element with aria-live="polite".
   * Auto-clears after ~1500ms.
   */
  announcement: string;
  inputProps: FilterTokensInputProps;
  dropdown: FilterTokensDropdown;
  open: () => void;
  openCategory: (key: string) => void;
  clear: () => void;
  setDateValue: (category: string, value: { from?: string; to?: string } | { date: string }) => void;
  setNumberValue: (category: string, value: { min?: number; max?: number }) => void;
}

// ── Component props ────────────────────────

export interface FilterTokensProps<T extends FilterSchema> {
  filters: T;
  value: FilterValues<T>;
  onChange: (value: FilterValues<T>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export interface UseFilterTokensOptions<T extends FilterSchema> {
  filters: T;
  value: FilterValues<T>;
  onChange: (value: FilterValues<T>) => void;
  placeholder?: string;
  locale?: string;
}
