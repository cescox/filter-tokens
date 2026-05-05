"use client";

import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
} from "lucide-react";
import type { Locale } from "date-fns";
import { Popover } from "@base-ui/react/popover";
import {
  useFilterTokens,
  type FilterSchema,
  type FilterTokensProps,
} from "filter-tokens";
import { cn } from "filter-tokens/lib/utils";
import { ItemIndicator } from "./parts/item-indicator";
import { RangeCalendarPanel, SingleCalendarPanel } from "./parts/calendar-panel";
import { NumberEntryPanel } from "./parts/number-panel";
import { FilterTokensTrigger } from "./parts/trigger";

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

  return (
    <Popover.Root
      open={ft.dropdown.open}
      onOpenChange={(open, details) => {
        if (open) return;
        // The combobox input lives in the trigger area, not in the popover
        // popup. When focus or pointer interactions land on it (after a chip
        // click, an option select, etc.), Base UI would otherwise treat that
        // as outside the popover and request close. Cancel any close that
        // originates from inside our trigger surface.
        const target = details?.event?.target as Element | null;
        if (target?.closest?.('[data-slot="filter-tokens-trigger"]')) {
          details?.cancel?.();
          return;
        }
        ft.dropdown.close();
      }}
    >
      <div ref={triggerRef} data-slot="filter-tokens" {...props}>
        <FilterTokensTrigger
          ft={ft}
          listboxId={listboxId}
          disabled={disabled}
          className={className}
        />
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
            className="max-w-[480px] min-w-(--anchor-width) rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg outline-none"
            initialFocus={false}
            finalFocus={ft.inputProps.ref}
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
