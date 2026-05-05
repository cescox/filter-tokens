import type {
  ComponentType,
  ChangeEvent,
  KeyboardEvent,
  ReactNode,
  RefObject,
} from 'react';

/** Icon shape accepted by FilterDef.icon and FilterTokensDropdownItem.icon. */
export type IconComponent = ComponentType<{ className?: string }>;

export interface FilterTokensOption {
  readonly value: string;
  readonly label: string;
}

export interface FilterContext<T extends FilterSchema = FilterSchema> {
  filters: FilterValues<T>;
}

export type OptionsOrFn<T extends FilterTokensOption = FilterTokensOption> =
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

/**
 * `kind` discriminates the four item shapes the dropdown can render:
 * - `'category'`  — a top-level filter to drill into. `selected` reflects
 *                   whether that category has any value set.
 * - `'value'`     — a regular option (select option). `selected` reflects
 *                   whether it's the current value (or in a multi-select set).
 * - `'preset'`    — a date preset that applies a value when chosen.
 *                   `selected` is always false.
 * - `'custom-date'` — the "Custom..." entry that opens the calendar panel.
 *                     `selected` is always false.
 */
export interface FilterTokensDropdownItem {
  kind: 'category' | 'value' | 'preset' | 'custom-date';
  key: string;
  label: string;
  icon?: IconComponent;
  selected: boolean;
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

export interface FilterTokensDropdown<T extends FilterSchema = FilterSchema> {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  retry: () => void;
  items: FilterTokensDropdownItem[];
  select: (item: FilterTokensDropdownItem) => void;
  /** Open the popup at the top-level filter list (no-op when already open). */
  open: () => void;
  /** Open the popup directly into a specific filter's values (or its input panel). */
  openFilter: (key: keyof T & string) => void;
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
   * Screen-reader announcement string for token add/remove operations.
   * Wire this to a visually-hidden element with aria-live="polite".
   * Auto-clears after ~1500ms.
   */
  announcement: string;
  inputProps: FilterTokensInputProps;
  dropdown: FilterTokensDropdown<T>;
  /**
   * Resolved message catalog — defaults merged with the optional partial
   * passed via `useFilterTokens({ messages })`. Components and custom
   * consumers read user-visible strings from here so a single override
   * cascades to every render site.
   */
  messages: FilterTokensMessages;
  /** Removes every filter and closes the popup. */
  clear: () => void;
  /** Commits a date value (called by the calendar panel's Apply button). */
  applyDate: (category: keyof T & string, value: { from?: string; to?: string } | { date: string }) => void;
  /** Commits a number range (called by the number panel's Apply button). */
  applyNumber: (category: keyof T & string, value: { min?: number; max?: number }) => void;
}

// ── Messages (i18n / customization) ────────

/**
 * Catalog of every user-visible string the package renders. Pass a partial
 * object via the `messages` option to override individual entries — defaults
 * are English and live in `lib/messages.tsx`.
 *
 * Naming convention — every key reads as `[regionPrefix?][descriptor][roleSuffix]`:
 *
 *   Region prefix (where the message appears):
 *     token*    — the visible filter pill
 *     popup*    — the dropdown popover
 *     date*     — the date entry panel
 *     number*   — the number entry panel
 *     (no prefix) — universal entries (clearAll, cancel, apply, type/search placeholders)
 *
 *   Role suffix (what kind of string it is):
 *     *Aria         — accessible name (aria-label)
 *     *Label        — visible static text
 *     *Format       — template producing token displayValue text
 *     *Placeholder  — input placeholder
 *     *Announcement — aria-live message
 *     *Hint         — inline visible help (may contain markup)
 */
export interface FilterTokensMessages {
  // ── Token (the visible filter pill)
  /** aria-label on a token, describing the filter it represents. */
  tokenAria: (filter: string, value: string) => string;
  /** aria-label on a token's `×` remove button. */
  tokenRemoveAria: (filter: string, value: string) => string;
  /** aria-live string announced when a token is added. */
  tokenAddedAnnouncement: (filter: string, value: string) => string;
  /** aria-live string announced when a token is removed. */
  tokenRemovedAnnouncement: (filter: string, value: string) => string;

  // ── Popup (the dropdown popover)
  /** aria-label of the listbox when listing all filters at the top level. */
  popupListAria: string;
  /** aria-label of the back button when stepping out to the filter list. */
  popupBackAria: string;
  /** aria-label of the back button when stepping out to a filter's values. */
  popupBackToFilterAria: (filter: string) => string;
  /** aria-label of the loading-state region (the spinner has no visible text). */
  popupLoadingAria: string;
  /** Visible text shown when async option loading fails. */
  popupErrorLabel: string;
  /** Visible label of the retry button. */
  popupRetryLabel: string;
  /** Visible empty-state text when no items match the search. */
  popupEmptyLabel: string;
  /**
   * Inline hint shown beneath the input in text-entry mode. Default uses
   * `<kbd>` markup — pass a plain string to disable styling.
   */
  popupTextEntryHint: ReactNode;

  // ── Date entry panel
  /** Visible label of the From input in a range calendar. */
  dateFromLabel: string;
  /** Visible label of the To input in a range calendar. */
  dateToLabel: string;
  /** Visible label of the single-date input. */
  dateSingleLabel: string;
  /**
   * aria-label of a date input field. `fieldLabel` is the input's visible
   * label ("Start" / "End" / "Date"); `hasTime` is true when time is included.
   * The two-param form lets translators control word order while keeping
   * the From/To inputs distinguishable to screen readers.
   */
  dateInputAria: (fieldLabel: string, hasTime: boolean) => string;
  /** Visible label of the "Custom" listbox item (single-date filter). */
  datePresetCustomLabel: string;
  /** Visible label of the "Custom range" listbox item (range filter). */
  datePresetCustomRangeLabel: string;
  /** Token displayValue template when only `from` is set — e.g. "Since Apr 5". */
  dateSinceFormat: (date: string) => string;
  /** Token displayValue template when only `to` is set — e.g. "Until Apr 5". */
  dateUntilFormat: (date: string) => string;

  // ── Number entry panel
  /** Visible label of the minimum-bound input. */
  numberMinLabel: string;
  /** Visible label of the maximum-bound input. */
  numberMaxLabel: string;
  /** aria-label of the minimum input. `unit` is the optional unit symbol. */
  numberMinAria: (unit: string | undefined) => string;
  /** aria-label of the maximum input. */
  numberMaxAria: (unit: string | undefined) => string;

  // ── Universals (no prefix — single, unambiguous entries)
  /** aria-label of the trigger's "clear all filters" button. */
  clearAllAria: string;
  /** Visible label of the Cancel button (date and number panels). */
  cancelLabel: string;
  /** Visible label of the Apply button (date and number panels). */
  applyLabel: string;
  /** Combobox placeholder when in text-entry mode. */
  typePlaceholder: (filter: string) => string;
  /** Combobox placeholder when browsing a filter's values list. */
  searchPlaceholder: (filter: string) => string;
}

// ── Component props ────────────────────────

export interface FilterTokensProps<T extends FilterSchema> {
  filters: T;
  value: FilterValues<T>;
  onChange: (value: FilterValues<T>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Override individual user-visible strings. See `FilterTokensMessages`. */
  messages?: Partial<FilterTokensMessages>;
}

export interface UseFilterTokensOptions<T extends FilterSchema> {
  filters: T;
  value: FilterValues<T>;
  onChange: (value: FilterValues<T>) => void;
  placeholder?: string;
  locale?: string;
  /** Override individual user-visible strings. See `FilterTokensMessages`. */
  messages?: Partial<FilterTokensMessages>;
}
