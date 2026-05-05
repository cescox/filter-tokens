"use client";

import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { enUS } from "date-fns/locale";
import type { Locale } from "date-fns";
import { cn } from "filter-tokens/lib/utils";

export interface DateTimeRowProps {
  label: string;
  date: Date | undefined;
  onDateChange: (d: Date) => void;
  showTime: boolean;
  locale?: Locale;
  active?: boolean;
  onFocus?: () => void;
  onEnter?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function DateTimeRow({
  label,
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
