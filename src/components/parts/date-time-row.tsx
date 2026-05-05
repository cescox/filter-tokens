"use client";

import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { enUS } from "date-fns/locale";
import type { Locale } from "date-fns";
import { cn } from "filter-tokens/lib/utils";

// Reference date used purely to render the placeholder so the user sees
// what shape the input expects. Year is intentionally far in the past so
// it reads as a sample, not a hint about the active range. The day (15) is
// >12 to be unambiguous between mm/dd and dd/mm conventions.
const PLACEHOLDER_REFERENCE_DATE = new Date(2000, 0, 15, 13, 30);

export interface DateTimeRowProps {
  /** Visible label shown next to the input (e.g. "Start", "End", "Date"). */
  label: string;
  /** Resolved aria-label for the input (typically `messages.dateInputAria(...)`). */
  ariaLabel: string;
  date: Date | undefined;
  /**
   * Called with the parsed date on a successful edit, OR with `undefined`
   * when the user explicitly clears the input. The panel decides whether
   * an undefined value clears just this field or also clears the other
   * end of the range.
   */
  onDateChange: (d: Date | undefined) => void;
  showTime: boolean;
  locale?: Locale;
  active?: boolean;
  onFocus?: () => void;
  onEnter?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function DateTimeRow({
  label,
  ariaLabel,
  date,
  onDateChange,
  showTime,
  locale,
  active,
  onFocus,
  onEnter,
  inputRef,
}: DateTimeRowProps) {
  const loc = locale ?? enUS;
  const fmt = showTime ? "P p" : "P";
  const ph = format(PLACEHOLDER_REFERENCE_DATE, fmt, { locale: loc });
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
    // Empty input + a previously-set date == "the user wiped this date out".
    // Without this, the input snaps back to the old value and the user can
    // never clear the field once a date has been chosen.
    if (!text.trim()) {
      if (date) onDateChange(undefined);
      return;
    }
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
        aria-label={ariaLabel}
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
