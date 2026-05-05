"use client";

import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import type { Locale } from "date-fns";
import { Popover } from "@base-ui/react/popover";
import {
  useFilterTokens,
  type FilterSchema,
  type FilterTokensProps,
} from "filter-tokens";
import { cn } from "filter-tokens/lib/utils";
import { FilterTokenChip } from "./parts/chip";
import { ItemIndicator } from "./parts/item-indicator";
import { RangeCalendarPanel, SingleCalendarPanel } from "./parts/calendar-panel";
import { NumberEntryPanel } from "./parts/number-panel";

/* ─── Types ────────────────────────────────────────────────────────────────── */

type FilterTokensComponentProps<T extends FilterSchema> = FilterTokensProps<T> &
  Omit<React.ComponentProps<"div">, "onChange"> & {
    dateLocale?: Locale;
  };

/* ─── FilterTokens (Base UI variant) ───────────────────────────────────────── */

function FilterTokens<const T extends FilterSchema>({
  filters,
  value,
  onChange,
  placeholder = "Filter...",
  className,
  disabled,
  dateLocale,
  ...props
}: FilterTokensComponentProps<T>) {
  const ft = useFilterTokens({
    filters,
    value,
    onChange,
    placeholder,
    locale: dateLocale?.code,
  });
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const listboxId = React.useId();
  const popoverContentId = React.useId();

  const { mode, category: activeCategory } = ft.dropdown.state;
  const isValuesMode = mode === "values";
  const isTextEntry = mode === "text-entry";
  const isDateEntry = mode === "date-entry";
  const isNumberEntry = mode === "number-entry";

  const activeDef = activeCategory
    ? (filters as FilterSchema)[activeCategory]
    : null;
  const activeLabel = activeDef?.label ?? null;
  const isMultiSelect =
    activeDef?.type === "select" && activeDef.multi === true;

  React.useEffect(() => {
    if (ft.dropdown.open && !isDateEntry && !isNumberEntry) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [ft.dropdown.open, mode, isDateEntry, isNumberEntry]);

  const searchPlaceholder = isTextEntry
    ? `Type ${activeLabel ?? "value"}...`
    : isValuesMode
      ? `Search ${activeLabel ?? ""}...`
      : "Search filters...";

  return (
    <Popover.Root
      open={ft.dropdown.open}
      onOpenChange={(open) => { if (!open) ft.dropdown.close(); }}
    >
      <div data-slot="filter-tokens" {...props}>
        <div
          data-slot="filter-tokens-announcement"
          role="status"
          aria-live="polite"
          className="sr-only"
        >
          {ft.announcement}
        </div>
        <div
          ref={triggerRef}
          data-slot="filter-tokens-trigger"
          data-disabled={disabled || undefined}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-expanded={ft.dropdown.open}
          aria-haspopup="dialog"
          aria-controls={ft.dropdown.open ? popoverContentId : undefined}
          className={cn(
            "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm cursor-text",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            disabled && "cursor-not-allowed opacity-50",
            className,
          )}
          onClick={() => { if (!disabled) ft.open(); }}
          onKeyDown={(e) => {
            if (!disabled && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
              e.preventDefault();
              ft.open();
            }
          }}
        >
          {ft.tokens.map((token) => (
            <FilterTokenChip
              key={token.id}
              category={token.category}
              label={token.label}
              displayValue={token.displayValue}
              onRemove={() => {
                token.remove();
                requestAnimationFrame(() => triggerRef.current?.focus());
              }}
              onClick={() => ft.openCategory(token.category)}
              disabled={disabled}
            />
          ))}

          <span
            data-slot="filter-tokens-placeholder"
            className={cn(
              "select-none",
              ft.tokens.length === 0
                ? "text-muted-foreground"
                : "text-muted-foreground/40 text-xs",
            )}
          >
            {ft.tokens.length === 0 ? placeholder : "Filter..."}
          </span>

          {ft.tokens.length > 0 && (
            <div className="ml-auto flex items-center">
              <button
                type="button"
                data-slot="filter-tokens-clear"
                className="shrink-0 rounded-sm p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={(e) => {
                  e.stopPropagation();
                  ft.clear();
                }}
                aria-label="Clear all filters"
                disabled={disabled}
              >
                <XIcon className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <Popover.Portal>
        <Popover.Positioner
          anchor={triggerRef}
          align="start"
          sideOffset={4}
          className="z-50"
        >
          <Popover.Popup
            id={popoverContentId}
            data-slot="filter-tokens-dropdown"
            data-state={mode}
            className="min-w-(--anchor-width) rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg outline-none"
            initialFocus={false}
            finalFocus={triggerRef}
            onKeyDown={(e) => {
              if (e.key === "Escape" && (isValuesMode || isTextEntry || isDateEntry || isNumberEntry)) {
                e.preventDefault();
                e.stopPropagation();
                ft.dropdown.goBack();
              }
            }}
          >
            {/* Header */}
            {activeLabel && (
              <div
                data-slot="filter-tokens-dropdown-header"
                className="flex items-center gap-1.5 border-b border-border px-2 py-1.5"
              >
                <button
                  type="button"
                  aria-label={
                    isDateEntry
                      ? `Back to ${activeLabel} options`
                      : "Back to filter categories"
                  }
                  className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={ft.dropdown.goBack}
                >
                  <ChevronLeftIcon className="size-3.5" />
                </button>
                <span className="text-xs font-medium text-muted-foreground">
                  {activeLabel}
                </span>
              </div>
            )}

            {/* Search */}
            {!isDateEntry && !isNumberEntry && (
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  data-slot="filter-tokens-search"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder={searchPlaceholder}
                  value={ft.inputProps.value}
                  onChange={ft.inputProps.onChange}
                  onKeyDown={ft.inputProps.onKeyDown}
                  role="combobox"
                  aria-label={searchPlaceholder}
                  aria-expanded={true}
                  aria-controls={listboxId}
                  aria-activedescendant={
                    ft.dropdown.highlightedIndex >= 0 &&
                    ft.dropdown.items[ft.dropdown.highlightedIndex]
                      ? `${listboxId}-item-${ft.dropdown.items[ft.dropdown.highlightedIndex].key}`
                      : undefined
                  }
                  aria-autocomplete="list"
                />
              </div>
            )}

            {/* Item list */}
            {!isDateEntry && !isNumberEntry && (
              <div
                role="listbox"
                id={listboxId}
                aria-label={activeLabel ?? "Filter categories"}
                aria-multiselectable={isMultiSelect || undefined}
                aria-orientation="vertical"
                className="max-h-[260px] overflow-y-auto p-1"
              >
                {ft.dropdown.loading && (
                  <div
                    data-slot="filter-tokens-loading"
                    role="status"
                    className="flex justify-center py-6"
                  >
                    <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}

                {ft.dropdown.error && !ft.dropdown.loading && (
                  <div
                    data-slot="filter-tokens-error"
                    role="alert"
                    className="flex flex-col items-center gap-2 px-2 py-6 text-center text-sm"
                  >
                    <span className="text-destructive">Failed to load options</span>
                    <button
                      type="button"
                      onClick={ft.dropdown.retry}
                      className="text-xs text-muted-foreground underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {ft.dropdown.items.length === 0 && !isTextEntry && !ft.dropdown.loading && !ft.dropdown.error && (
                  <div
                    data-slot="filter-tokens-empty"
                    role="status"
                    className="px-2 py-6 text-center text-sm text-muted-foreground"
                  >
                    No results found
                  </div>
                )}

                {ft.dropdown.items.map((item, index) => {
                  const isHighlighted = index === ft.dropdown.highlightedIndex;
                  return (
                    <div
                      key={item.key}
                      id={`${listboxId}-item-${item.key}`}
                      role="option"
                      aria-selected={item.selected || isHighlighted}
                      data-slot="filter-tokens-dropdown-item"
                      data-type={item.type}
                      data-highlighted={isHighlighted || undefined}
                      data-selected={item.selected || undefined}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors",
                        isHighlighted
                          ? "bg-accent text-accent-foreground"
                          : "text-popover-foreground hover:bg-accent/50",
                      )}
                      onMouseEnter={() => ft.dropdown.setHighlightedIndex(index)}
                      onClick={() => ft.dropdown.select(item)}
                    >
                      <ItemIndicator
                        item={item}
                        isMultiSelect={isMultiSelect}
                      />
                      {item.icon && (
                        <item.icon className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.type === "category" && (
                        <ChevronRightIcon className="size-3.5 text-muted-foreground/50" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Calendar */}
            {isDateEntry &&
              activeCategory &&
              activeDef?.type === "date" &&
              (activeDef.range === true ? (
                <RangeCalendarPanel
                  showTime={activeDef.time === true}
                  locale={dateLocale}
                  initialValue={
                    (value as Record<string, unknown>)[activeCategory] as
                      | { from?: string; to?: string }
                      | undefined
                  }
                  onSelect={(dateValue) => {
                    ft.setDateValue(activeCategory, dateValue);
                  }}
                  onCancel={ft.dropdown.goBack}
                />
              ) : (
                <SingleCalendarPanel
                  showTime={activeDef.time === true}
                  locale={dateLocale}
                  initialValue={
                    (value as Record<string, unknown>)[activeCategory] as
                      | { date?: string }
                      | undefined
                  }
                  onSelect={(dateValue) => {
                    ft.setDateValue(activeCategory, dateValue);
                  }}
                  onCancel={ft.dropdown.goBack}
                />
              ))}

            {/* Number entry */}
            {isNumberEntry &&
              activeCategory &&
              activeDef?.type === "number" && (
                <NumberEntryPanel
                  unit={activeDef.unit}
                  min={activeDef.min}
                  max={activeDef.max}
                  initialValue={
                    (value as Record<string, unknown>)[activeCategory] as
                      | { min?: number; max?: number }
                      | undefined
                  }
                  onSelect={(numValue) => {
                    ft.setNumberValue(activeCategory, numValue);
                  }}
                  onCancel={ft.dropdown.goBack}
                />
              )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ─── Exports ──────────────────────────────────────────────────────────────── */

export { FilterTokens };
export type { FilterTokensComponentProps };
