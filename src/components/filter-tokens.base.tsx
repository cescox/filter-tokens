"use client";

import * as React from "react";
import {
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { format, isValid, parse } from "date-fns";
import { enUS } from "date-fns/locale";
import type { Locale } from "date-fns";
import { Popover } from "@base-ui/react/popover";
import {
  useFilterTokens,
  type FilterSchema,
  type FilterTokensProps,
} from "filter-tokens";
import { Button } from "filter-tokens/components/ui/button";
import { Calendar, CalendarDayButton } from "filter-tokens/components/ui/calendar";
import { cn } from "filter-tokens/lib/utils";

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
            <FilterToken
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

          {ft.tokens.length === 0 && (
            <span className="text-muted-foreground select-none">
              {placeholder}
            </span>
          )}

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
            className="min-w-[var(--anchor-width)] rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg outline-none"
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

                {ft.dropdown.items.length === 0 && !isTextEntry && !ft.dropdown.loading && (
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
                />
              )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ─── ItemIndicator ────────────────────────────────────────────────────────── */

function ItemIndicator({
  item,
  isMultiSelect,
}: {
  item: { key: string; type: string; selected: boolean };
  isMultiSelect: boolean;
}) {
  if (item.key === "__custom_date__") {
    return <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />;
  }

  if (item.type !== "value") return null;

  if (isMultiSelect) {
    return (
      <div
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
          item.selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input",
        )}
      >
        {item.selected && <CheckIcon className="size-3" />}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
        item.selected ? "border-primary" : "border-input",
      )}
    >
      {item.selected && <div className="size-2 rounded-full bg-primary" />}
    </div>
  );
}

/* ─── FilterToken ──────────────────────────────────────────────────────────── */

function FilterToken({
  category,
  label,
  displayValue,
  onRemove,
  onClick,
  disabled,
}: {
  category: string;
  label: string;
  displayValue: string;
  onRemove: () => void;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <span
      data-slot="filter-tokens-token"
      data-category={category}
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${displayValue}. Click to edit.`}
      className="group inline-flex cursor-pointer items-center gap-1 rounded-md bg-secondary py-0.5 pl-2 pr-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && onClick) onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled && onClick) onClick();
        }
      }}
    >
      <span
        data-slot="filter-tokens-token-label"
        className="text-muted-foreground"
      >
        {label}:
      </span>
      <span data-slot="filter-tokens-token-value">{displayValue}</span>
      <button
        type="button"
        data-slot="filter-tokens-token-remove"
        tabIndex={-1}
        className="ml-0.5 rounded-sm p-0.5 text-muted-foreground/80 transition-colors hover:bg-secondary-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

/* ─── RangeCalendarPanel ───────────────────────────────────────────────────── */

function RangeCalendarPanel({
  showTime,
  locale,
  initialValue,
  onSelect,
}: {
  showTime: boolean;
  locale?: Locale;
  initialValue?: { from?: string; to?: string };
  onSelect: (value: { from: string; to?: string }) => void;
}) {
  const [from, setFrom] = React.useState<Date | undefined>(() =>
    initialValue?.from ? new Date(initialValue.from) : undefined,
  );
  const [to, setTo] = React.useState<Date | undefined>(() =>
    initialValue?.to ? new Date(initialValue.to) : undefined,
  );
  const [month, setMonth] = React.useState<Date>(() => from ?? new Date());
  const [activeField, setActiveField] = React.useState<"start" | "end">(
    "start",
  );
  const [hoveredDay, setHoveredDay] = React.useState<Date | undefined>();
  const endInputRef = React.useRef<HTMLInputElement>(null);

  function handleDayClick(day: Date) {
    setHoveredDay(undefined);
    const dayDate = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const fromDate = from
      ? new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
      : undefined;

    if (activeField === "start") {
      setFrom(day);
      setTo(undefined);
      setActiveField("end");
    } else {
      if (fromDate !== undefined && dayDate < fromDate) {
        setFrom(day);
        setTo(undefined);
      } else {
        const d = new Date(day);
        if (showTime && d.getHours() === 0 && d.getMinutes() === 0) {
          d.setHours(23, 59, 59, 999);
        }
        setTo(d);
        setActiveField("start");
      }
    }
  }

  function handleApply() {
    if (!from) return;
    const toDate = new Date(to ?? from);
    if (!showTime) toDate.setHours(23, 59, 59, 999);
    onSelect({ from: from.toISOString(), to: toDate.toISOString() });
  }

  const DayButtonWithHover = React.useMemo(() => {
    return function HoverDayButton(props: React.ComponentProps<typeof CalendarDayButton>) {
      return (
        <CalendarDayButton
          {...props}
          onMouseEnter={() => setHoveredDay(props.day.date)}
        />
      );
    };
  }, []);

  const rangeModifiers = React.useMemo(() => {
    if (!from) return {};

    const previewEnd =
      activeField === "end" && hoveredDay && hoveredDay >= from
        ? hoveredDay
        : undefined;
    const displayEnd = previewEnd ?? to;

    if (!displayEnd || from.getTime() === displayEnd.getTime()) {
      return { range_start: [from], selected: [from] };
    }
    return {
      range_start: [from],
      range_end: [displayEnd],
      range_middle: { after: from, before: displayEnd },
      selected: [from, displayEnd],
    };
  }, [from, to, hoveredDay, activeField]);

  return (
    <div
      data-slot="filter-tokens-calendar"
      className="border-t border-border"
    >
      <div className="space-y-1 px-3 pb-1 pt-3">
        <DateTimeRow
          label="Start"
          date={from}
          active={activeField === "start"}
          onFocus={() => setActiveField("start")}
          onDateChange={(d) => {
            setFrom(d);
            if (to && d > to) setTo(undefined);
            setMonth(d);
          }}
          onEnter={() => {
            setActiveField("end");
            endInputRef.current?.focus();
          }}
          showTime={showTime}
          locale={locale}
        />
        <DateTimeRow
          label="End"
          date={to}
          active={activeField === "end"}
          onFocus={() => setActiveField("end")}
          onDateChange={(d) => {
            if (showTime && d.getHours() === 0 && d.getMinutes() === 0) {
              d.setHours(23, 59, 59, 999);
            }
            if (from && d < from) {
              setFrom(d);
              setTo(undefined);
            } else {
              setTo(d);
            }
            setMonth(d);
          }}
          inputRef={endInputRef}
          showTime={showTime}
          locale={locale}
        />
      </div>
      <div className="p-2" onMouseLeave={() => setHoveredDay(undefined)}>
        <Calendar
          className="mx-auto"
          showOutsideDays={false}
          locale={locale}
          month={month}
          onMonthChange={setMonth}
          onDayClick={handleDayClick}
          modifiers={rangeModifiers}
          numberOfMonths={2}
          components={{ DayButton: DayButtonWithHover }}
        />
      </div>
      <div className="px-3 pb-3">
        <Button
          className="w-full"
          disabled={!from}
          onClick={handleApply}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

/* ─── SingleCalendarPanel ──────────────────────────────────────────────────── */

function SingleCalendarPanel({
  showTime,
  locale,
  initialValue,
  onSelect,
}: {
  showTime: boolean;
  locale?: Locale;
  initialValue?: { date?: string };
  onSelect: (value: { date: string }) => void;
}) {
  const [selected, setSelected] = React.useState<Date | undefined>(() => {
    if (!initialValue?.date) return undefined;
    return new Date(initialValue.date);
  });

  const [month, setMonth] = React.useState<Date>(
    () => selected ?? new Date(),
  );

  function handleApply() {
    if (!selected) return;
    onSelect({ date: selected.toISOString() });
  }

  return (
    <div
      data-slot="filter-tokens-calendar"
      className="border-t border-border"
    >
      <div className="px-3 pb-1 pt-3">
        <DateTimeRow
          label="Date"
          date={selected}
          onDateChange={(d) => {
            setSelected(d);
            setMonth(d);
          }}
          showTime={showTime}
          locale={locale}
        />
      </div>
      <div className="p-2">
        <Calendar
          mode="single"
          className="mx-auto"
          showOutsideDays={false}
          locale={locale}
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={(day) => {
            setSelected(day);
            if (day && !showTime) onSelect({ date: day.toISOString() });
          }}
        />
      </div>
      {selected && showTime && (
        <div className="px-3 pb-3">
          <Button className="w-full" onClick={handleApply}>
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── NumberEntryPanel ─────────────────────────────────────────────────────── */

function NumberEntryPanel({
  unit,
  min,
  max,
  initialValue,
  onSelect,
}: {
  unit?: string;
  min?: number;
  max?: number;
  initialValue?: { min?: number; max?: number };
  onSelect: (value: { min?: number; max?: number }) => void;
}) {
  const [minVal, setMinVal] = React.useState(initialValue?.min?.toString() ?? "");
  const [maxVal, setMaxVal] = React.useState(initialValue?.max?.toString() ?? "");
  const minId = React.useId();
  const maxId = React.useId();

  const parsedMin = minVal ? parseFloat(minVal) : undefined;
  const parsedMax = maxVal ? parseFloat(maxVal) : undefined;
  const hasValidMin = parsedMin !== undefined && !isNaN(parsedMin);
  const hasValidMax = parsedMax !== undefined && !isNaN(parsedMax);
  const hasValue = hasValidMin || hasValidMax;

  function handleApply() {
    if (!hasValue) return;
    const result: { min?: number; max?: number } = {};
    if (hasValidMin) result.min = parsedMin;
    if (hasValidMax) result.max = parsedMax;
    onSelect(result);
  }

  return (
    <div
      data-slot="filter-tokens-number"
      className="border-t border-border p-3 space-y-2"
    >
      <div className="flex items-center gap-2 px-2 py-1 text-sm">
        <label htmlFor={minId} className="w-9 shrink-0 text-xs font-medium text-muted-foreground">
          Min
        </label>
        <input
          id={minId}
          type="number"
          aria-label={`Minimum value${unit ? ` (${unit})` : ""}`}
          className={cn(
            "flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm font-mono tabular-nums placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          )}
          placeholder={min !== undefined ? String(min) : ""}
          value={minVal}
          min={min}
          max={max}
          onChange={(e) => setMinVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApply(); } }}
        />
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      <div className="flex items-center gap-2 px-2 py-1 text-sm">
        <label htmlFor={maxId} className="w-9 shrink-0 text-xs font-medium text-muted-foreground">
          Max
        </label>
        <input
          id={maxId}
          type="number"
          aria-label={`Maximum value${unit ? ` (${unit})` : ""}`}
          className={cn(
            "flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm font-mono tabular-nums placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          )}
          placeholder={max !== undefined ? String(max) : ""}
          value={maxVal}
          min={min}
          max={max}
          onChange={(e) => setMaxVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApply(); } }}
        />
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      <div className="px-2">
        <Button className="w-full" disabled={!hasValue} onClick={handleApply}>
          Apply
        </Button>
      </div>
    </div>
  );
}

/* ─── DateTimeRow ──────────────────────────────────────────────────────────── */

function DateTimeRow({
  label,
  date,
  onDateChange,
  showTime,
  locale,
  active,
  onFocus,
  onEnter,
  inputRef,
}: {
  label: string;
  date: Date | undefined;
  onDateChange: (d: Date) => void;
  showTime: boolean;
  locale?: Locale;
  active?: boolean;
  onFocus?: () => void;
  onEnter?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const loc = locale ?? enUS;
  const fmt = showTime ? "P p" : "P";
  const ph = format(new Date(2026, 0, 15, 13, 30), fmt, { locale: loc });
  const inputId = React.useId();

  function formatDate(d: Date) {
    return format(d, fmt, { locale: loc });
  }

  function parseInput(v: string): Date | null {
    const t = v.trim();
    if (!t) return null;

    const formats = [fmt, "yyyy-MM-dd HH:mm", "yyyy-MM-dd"];
    for (const f of formats) {
      try {
        const p = parse(t, f, new Date(), { locale: loc });
        if (isValid(p)) return p;
      } catch {
        /* try next format */
      }
    }

    const fallback = new Date(t);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  const [text, setText] = React.useState(date ? formatDate(date) : "");

  React.useEffect(() => {
    setText(date ? format(date, fmt, { locale: loc }) : "");
  }, [date, fmt, loc]);

  function handleBlur() {
    const parsed = parseInput(text);
    if (!parsed) {
      if (date) setText(formatDate(date));
      return;
    }
    if (!date || formatDate(parsed) !== formatDate(date)) {
      onDateChange(parsed);
    }
  }

  return (
    <div
      data-slot="filter-tokens-date-input"
      className="flex items-center gap-2 px-2 py-1 text-sm"
    >
      <label
        htmlFor={inputId}
        className="w-9 shrink-0 text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        aria-label={`${label} date${showTime ? " and time" : ""}`}
        className={cn(
          "flex-1 rounded-md border bg-background px-2.5 py-1.5 text-sm font-mono tabular-nums placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          active ? "border-ring ring-2 ring-ring ring-offset-1" : "border-input",
        )}
        placeholder={ph}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={onFocus}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleBlur();
            onEnter?.();
          }
        }}
      />
    </div>
  );
}

/* ─── Exports ──────────────────────────────────────────────────────────────── */

export { FilterTokens };
export type { FilterTokensComponentProps };
