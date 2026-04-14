"use client";

import * as React from "react";
import { XIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from "lucide-react";
import {
  useFilterTokens,
  type FilterSchema,
  type FilterTokensProps,
} from "filter-tokens";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

function FilterTokens<const T extends FilterSchema>({
  filters,
  value,
  onChange,
  placeholder,
  className,
  disabled,
  ...props
}: FilterTokensProps<T> & React.ComponentProps<"div">) {
  const ft = useFilterTokens({ filters, value, onChange, placeholder });

  const isValuesMode = ft.dropdown.state.mode === "values";
  const isTextEntry = ft.dropdown.state.mode === "text-entry";
  const isDateEntry = ft.dropdown.state.mode === "date-entry";
  const activeCategory =
    isValuesMode || isDateEntry || isTextEntry
      ? (ft.dropdown.state as { category: string }).category
      : null;
  const activeCategoryDef = activeCategory
    ? (filters as unknown as FilterSchema)[activeCategory]
    : null;
  const activeCategoryLabel = activeCategoryDef?.label ?? null;
  const isMultiSelect =
    activeCategoryDef?.type === "select" && activeCategoryDef.multi === true;

  const [showCalendar, setShowCalendar] = React.useState(false);

  React.useEffect(() => {
    if (!ft.dropdown.open) setShowCalendar(false);
  }, [ft.dropdown.open]);

  const goBackToCategories = React.useCallback(() => {
    if (showCalendar) {
      setShowCalendar(false);
      return;
    }
    ft.dropdown.close();
    setTimeout(() => ft.inputProps.ref.current?.focus(), 0);
  }, [ft.dropdown, ft.inputProps.ref, showCalendar]);

  return (
    <div
      {...ft.containerProps}
      data-slot="filter-tokens"
      data-filter-tokens
      className="relative"
      {...props}
    >
      <div
        data-slot="filter-tokens-input-wrapper"
        data-disabled={disabled || undefined}
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        onClick={() => {
          if (!disabled) {
            ft.inputProps.ref.current?.focus();
            ft.open();
          }
        }}
      >
        {ft.tokens.map((token) => (
          <FilterToken
            key={token.id}
            category={token.category}
            label={token.label}
            displayValue={token.displayValue}
            onRemove={token.remove}
            disabled={disabled}
          />
        ))}

        <input
          {...ft.inputProps}
          ref={ft.inputProps.ref}
          data-slot="filter-tokens-input"
          className="h-6 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-[120px] disabled:cursor-not-allowed"
          disabled={disabled}
        />

        {ft.tokens.length > 0 && (
          <button
            type="button"
            data-slot="filter-tokens-clear"
            className="shrink-0 rounded-sm p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              ft.clear();
            }}
            aria-label="Clear all filters"
            disabled={disabled}
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>

      {ft.dropdown.open && (
        <div
          data-slot="filter-tokens-dropdown"
          data-filter-tokens-dropdown
          data-state={ft.dropdown.state.mode}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[300px] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-[0.98] duration-100"
          onMouseDown={(e) => e.preventDefault()}
        >
          {activeCategoryLabel && (
            <div
              data-slot="filter-tokens-dropdown-header"
              className="flex items-center gap-1.5 border-b border-border px-2 py-1.5"
            >
              <button
                type="button"
                className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                onMouseDown={(e) => {
                  e.preventDefault();
                  goBackToCategories();
                }}
              >
                <ChevronLeftIcon className="size-3.5" />
              </button>
              <span className="text-xs font-medium text-muted-foreground">
                {activeCategoryLabel}
              </span>
            </div>
          )}

          {!showCalendar && isTextEntry && (
            <div
              data-slot="filter-tokens-hint"
              className="px-3 py-2 text-xs text-muted-foreground"
            >
              Type a value and press{" "}
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                Enter
              </kbd>
            </div>
          )}

          <div
            role="listbox"
            id="filter-tokens-listbox"
            className={cn("overflow-y-auto max-h-[260px] p-1", showCalendar && "hidden")}
          >
            {ft.dropdown.items.length === 0 && !isTextEntry && !isDateEntry && (
              <div
                data-slot="filter-tokens-empty"
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
                  id={`filter-tokens-item-${item.key}`}
                  role="option"
                  aria-selected={isHighlighted}
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
                  onMouseEnter={() =>
                    ft.dropdown.setHighlightedIndex(index)
                  }
                  onMouseDown={(e) => {
                    e.preventDefault();
                    ft.dropdown.select(item);
                  }}
                >
                  {item.type === "value" && isMultiSelect && (
                    <div
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                        item.selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {item.selected && <CheckIcon className="size-3" />}
                    </div>
                  )}
                  {item.type === "value" && !isMultiSelect && (
                    <div
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border",
                        item.selected
                          ? "border-primary"
                          : "border-input",
                      )}
                    >
                      {item.selected && (
                        <div className="size-2 rounded-full bg-primary" />
                      )}
                    </div>
                  )}
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

          {!showCalendar && (isValuesMode || isDateEntry) && activeCategoryDef?.type === "date" && (
            <div className="border-t border-border p-1">
              <div
                className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowCalendar(true);
                }}
              >
                <CalendarIcon className="size-4" />
                <span>Custom{activeCategoryDef.range ? " range" : ""}...</span>
              </div>
            </div>
          )}

          {showCalendar && activeCategoryDef?.type === "date" && (
            <DateCalendarPanel
              isRange={activeCategoryDef.range === true}
              showTime={"time" in activeCategoryDef && activeCategoryDef.time === true}
              onSelect={(dateValue) => {
                ft.setDateValue(activeCategory!, dateValue);
                setShowCalendar(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FilterToken({
  category,
  label,
  displayValue,
  onRemove,
  disabled,
}: {
  category: string;
  label: string;
  displayValue: string;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <span
      data-slot="filter-tokens-token"
      data-category={category}
      className="group inline-flex items-center gap-1 rounded-md bg-secondary pl-2 pr-1 py-0.5 text-xs font-medium text-secondary-foreground transition-colors"
    >
      <span
        data-slot="filter-tokens-token-label"
        className="text-muted-foreground"
      >
        {label}
      </span>
      <span data-slot="filter-tokens-token-value">{displayValue}</span>
      <button
        type="button"
        data-slot="filter-tokens-token-remove"
        className="ml-0.5 rounded-sm p-0.5 text-muted-foreground/80 transition-colors hover:bg-secondary-foreground/10 hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${label}: ${displayValue}`}
        disabled={disabled}
      >
        <XIcon className="size-3" />
      </button>
    </span>
  );
}


function DateCalendarPanel({
  isRange,
  showTime,
  onSelect,
}: {
  isRange: boolean;
  showTime?: boolean;
  onSelect: (value: { from: string; to?: string } | { date: string }) => void;
}) {
  const [range, setRange] = React.useState<DateRange | undefined>();
  const [single, setSingle] = React.useState<Date | undefined>();
  const [clickCount, setClickCount] = React.useState(0);
  const [fromTime, setFromTime] = React.useState("00:00");
  const [toTime, setToTime] = React.useState("23:59");
  const [singleTime, setSingleTime] = React.useState("00:00");

  const rangeComplete = isRange && clickCount >= 2 && range?.from;
  const singleComplete = !isRange && single;
  const needsTime = showTime && (rangeComplete || singleComplete);

  const handleApply = () => {
    if (isRange && range?.from) {
      const from = applyTime(range.from, fromTime);
      const to = range.to
        ? applyTime(range.to, toTime)
        : applyTime(range.from, toTime);
      onSelect({ from: from.toISOString(), to: to.toISOString() });
    } else if (single) {
      onSelect({ date: applyTime(single, singleTime).toISOString() });
    }
  };

  const handleRangeSelect = (newRange: DateRange | undefined) => {
    setRange(newRange);
    setClickCount((c) => c + 1);

    if (!showTime && newRange?.from && clickCount >= 1) {
      const to = newRange.to ?? newRange.from;
      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);
      onSelect({
        from: newRange.from.toISOString(),
        to: endOfDay.toISOString(),
      });
    }
  };

  if (isRange) {
    return (
      <div data-slot="filter-tokens-calendar" className="p-2 border-t border-border">
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleRangeSelect}
          numberOfMonths={1}
        />
        {clickCount === 1 && (
          <p className="text-xs text-muted-foreground text-center mt-1">
            Select end date
          </p>
        )}
        {needsTime && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  From
                </label>
                <input
                  type="time"
                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
                  value={fromTime}
                  onChange={(e) => setFromTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  To
                </label>
                <input
                  type="time"
                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
                  value={toTime}
                  onChange={(e) => setToTime(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              className="w-full rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              onMouseDown={(e) => {
                e.preventDefault();
                handleApply();
              }}
            >
              Apply
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-slot="filter-tokens-calendar" className="p-2 border-t border-border">
      <Calendar
        mode="single"
        selected={single}
        onSelect={(day) => {
          setSingle(day);
          if (day && !showTime) {
            onSelect({ date: day.toISOString() });
          }
        }}
      />
      {needsTime && (
        <div className="mt-2 flex flex-col gap-2">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Time
            </label>
            <input
              type="time"
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
              value={singleTime}
              onChange={(e) => setSingleTime(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="w-full rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            onMouseDown={(e) => {
              e.preventDefault();
              handleApply();
            }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

function applyTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export { FilterTokens };
