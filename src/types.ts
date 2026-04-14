import type { ComponentType, ChangeEvent, KeyboardEvent, RefObject } from 'react';

export interface Option {
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
  readonly icon?: ComponentType<{ className?: string }>;
  readonly multi?: boolean;
  readonly options: OptionsOrFn<Option>;
};

export type DateFilterDef = {
  readonly type: 'date';
  readonly label: string;
  readonly icon?: ComponentType<{ className?: string }>;
  readonly range?: boolean;
  readonly presets?: readonly DateRangePreset[] | readonly DateSinglePreset[];
};

export type TextFilterDef = {
  readonly type: 'text';
  readonly label: string;
  readonly icon?: ComponentType<{ className?: string }>;
  readonly placeholder?: string;
};

export type NumberFilterDef = {
  readonly type: 'number';
  readonly label: string;
  readonly icon?: ComponentType<{ className?: string }>;
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

type DateValue<T extends DateFilterDef> =
  T['range'] extends true ? { from: string; to?: string } : { date: string };

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

export interface Token {
  id: string;
  category: string;
  label: string;
  displayValue: string;
  remove: () => void;
}

// ── Dropdown ───────────────────────────────

export interface DropdownItem {
  key: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  selected: boolean;
  type: 'category' | 'value';
}

export type DropdownState =
  | { mode: 'closed' }
  | { mode: 'categories' }
  | { mode: 'values'; category: string }
  | { mode: 'text-entry'; category: string }
  | { mode: 'date-entry'; category: string };

// ── Hook return ────────────────────────────

export interface InputProps {
  ref: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  placeholder: string;
  role: 'combobox';
  'aria-expanded': boolean;
  'aria-haspopup': 'listbox';
  'aria-activedescendant': string | undefined;
  'aria-autocomplete': 'list';
}

export interface Dropdown {
  open: boolean;
  items: DropdownItem[];
  select: (item: DropdownItem) => void;
  close: () => void;
  highlightedIndex: number;
  setHighlightedIndex: (index: number) => void;
  state: DropdownState;
}

export interface FilterTokensReturn<T extends FilterSchema> {
  tokens: Token[];
  inputProps: InputProps;
  dropdown: Dropdown;
  clear: () => void;
  setDateValue: (category: string, value: { from: string; to?: string } | { date: string }) => void;
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
}
