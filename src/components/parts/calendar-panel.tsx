"use client";

import * as React from "react";
import type { Locale } from "date-fns";
import { Button } from "filter-tokens/components/ui/button";
import { Calendar, CalendarDayButton } from "filter-tokens/components/ui/calendar";
import { DateTimeRow } from "./date-time-row";

export interface RangeCalendarPanelProps {
  showTime: boolean;
  locale?: Locale;
  initialValue?: { from?: string; to?: string };
  onSelect: (value: { from?: string; to?: string }) => void;
  onCancel: () => void;
}

export function RangeCalendarPanel({
  showTime,
  locale,
  initialValue,
  onSelect,
  onCancel,
}: RangeCalendarPanelProps) {
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
    // Calendar clicks produce midnight timestamps — compare dates only
    const dayDate = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const fromDate = from
      ? new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
      : undefined;
    const toDate = to
      ? new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
      : undefined;

    if (activeField === "start") {
      setFrom(day);
      // Only invalidate the existing end if the new start is *after* it.
      // Re-editing the start of an existing range should preserve the end —
      // clearing it on every Start click made the calendar feel destructive.
      if (toDate !== undefined && dayDate > toDate) {
        setTo(undefined);
      }
      setActiveField("end");
    } else {
      if (fromDate !== undefined && dayDate < fromDate) {
        // Clicked before start while End is active: shift start to the clicked
        // day. Keep End active so the user can still pick an end date.
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
    if (!from && !to) return;
    if (from && !to) {
      // Open-ended "Since X"
      onSelect({ from: from.toISOString() });
      return;
    }
    if (!from && to) {
      // Open-ended "Until X"
      const toDate = new Date(to);
      if (!showTime) toDate.setHours(23, 59, 59, 999);
      onSelect({ to: toDate.toISOString() });
      return;
    }
    const toDate = new Date(to!);
    if (!showTime) toDate.setHours(23, 59, 59, 999);
    onSelect({ from: from!.toISOString(), to: toDate.toISOString() });
  }

  // Stable DayButton wrapper for hover tracking
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

  // Build modifiers for range highlighting on single-mode calendar
  const rangeModifiers = React.useMemo(() => {
    if (!from) return {};

    // Show hover preview when End is active
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
            if (d === undefined) {
              setFrom(undefined);
              return;
            }
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
            if (d === undefined) {
              setTo(undefined);
              return;
            }
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
      <div className="flex justify-end gap-2 px-3 pb-3">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={!from && !to} onClick={handleApply}>
          Apply
        </Button>
      </div>
    </div>
  );
}

export interface SingleCalendarPanelProps {
  showTime: boolean;
  locale?: Locale;
  initialValue?: { date?: string };
  onSelect: (value: { date: string }) => void;
  onCancel: () => void;
}

export function SingleCalendarPanel({
  showTime,
  locale,
  initialValue,
  onSelect,
  onCancel,
}: SingleCalendarPanelProps) {
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
            if (d) setMonth(d);
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
      {showTime && (
        <div className="flex justify-end gap-2 px-3 pb-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!selected} onClick={handleApply}>
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
