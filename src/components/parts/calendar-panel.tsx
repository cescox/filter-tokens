"use client";

import * as React from "react";
import type { Locale } from "date-fns";
import type { FilterTokensMessages } from "filter-tokens";
import { Calendar, CalendarDayButton } from "filter-tokens/components/ui/calendar";
import { DateTimeRow } from "./date-time-row";
import { PanelActions } from "./panel-actions";

/** Returns a copy of the date set to 23:59:59.999 — used to anchor an End
 *  bound to the end of the chosen day instead of midnight at its start. */
function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

/** True when the date is at 00:00 — i.e. a calendar-click (which always
 *  produces midnight timestamps) without any user-typed time. */
function isMidnight(d: Date): boolean {
  return d.getHours() === 0 && d.getMinutes() === 0;
}

export interface RangeCalendarPanelProps {
  showTime: boolean;
  locale?: Locale;
  initialValue?: { from?: string; to?: string };
  onSelect: (value: { from?: string; to?: string }) => void;
  onCancel: () => void;
  messages: FilterTokensMessages;
}

export function RangeCalendarPanel({
  showTime,
  locale,
  initialValue,
  onSelect,
  onCancel,
  messages,
}: RangeCalendarPanelProps) {
  const [from, setFrom] = React.useState<Date | undefined>(() =>
    initialValue?.from ? new Date(initialValue.from) : undefined,
  );
  const [to, setTo] = React.useState<Date | undefined>(() =>
    initialValue?.to ? new Date(initialValue.to) : undefined,
  );
  // Open the calendar on whichever side of the range is already set so the
  // existing date is in view. Falls through to today for a fresh range.
  const [month, setMonth] = React.useState<Date>(() => from ?? to ?? new Date());
  // For a fresh range, start with the Start field active; for re-editing an
  // End-only ("Until X") filter, default to the End field so the user can
  // refine without first clicking anywhere.
  const [activeField, setActiveField] = React.useState<"start" | "end">(
    !initialValue?.from && initialValue?.to ? "end" : "start",
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
        // Calendar clicks land at midnight; with the time UI visible, default
        // End to the end of that day so a single click implies "all day".
        setTo(showTime && isMidnight(day) ? endOfDay(day) : day);
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
      onSelect({ to: (showTime ? to : endOfDay(to)).toISOString() });
      return;
    }
    onSelect({
      from: from!.toISOString(),
      to: (showTime ? to! : endOfDay(to!)).toISOString(),
    });
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

  // Build modifiers for range highlighting on single-mode calendar.
  // Covers four cases: nothing set, only Start, only End, both set (real range).
  const rangeModifiers = React.useMemo(() => {
    // Only End is set → highlight End as a single selected day so the user
    // sees the chosen "Until X" date on the calendar. Without this branch
    // the calendar shows no visual feedback at all for End-only filters.
    if (!from && to) {
      return { range_end: [to], selected: [to] };
    }
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
          label={messages.dateFromLabel}
          ariaLabel={messages.dateInputAria(messages.dateFromLabel, showTime)}
          date={from}
          active={activeField === "start"}
          onFocus={() => setActiveField("start")}
          onDateChange={(d) => {
            if (d === undefined) {
              setFrom(undefined);
              return;
            }
            // Trust whatever the user typed. Auto-clearing End when the
            // new Start fell after it was destructive — the user may have
            // been refining Start with End next on the to-do list. The
            // Apply button is disabled when the range is invalid (from >
            // to), giving the user a clear cue without nuking their data.
            setFrom(d);
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
          label={messages.dateToLabel}
          ariaLabel={messages.dateInputAria(messages.dateToLabel, showTime)}
          date={to}
          active={activeField === "end"}
          onFocus={() => setActiveField("end")}
          onDateChange={(d) => {
            if (d === undefined) {
              setTo(undefined);
              return;
            }
            // Trust whatever the user typed — even if it's earlier than
            // Start. Auto-swapping to Start was confusing (typed value
            // ended up in a different field). Apply checks for empty,
            // and the consumer can validate range integrity.
            const next = showTime && isMidnight(d) ? endOfDay(d) : d;
            setTo(next);
            setMonth(next);
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
      {/*
        Apply is disabled when the user has nothing to commit OR when the
        typed range is inverted (from > to). The user is free to type Start
        later than End while editing — the disabled state tells them why
        Apply isn't moving forward.
      */}
      <PanelActions
        applyDisabled={(!from && !to) || (from !== undefined && to !== undefined && from > to)}
        onCancel={onCancel}
        onApply={handleApply}
        messages={messages}
      />
    </div>
  );
}

export interface SingleCalendarPanelProps {
  showTime: boolean;
  locale?: Locale;
  initialValue?: { date?: string };
  onSelect: (value: { date: string }) => void;
  onCancel: () => void;
  messages: FilterTokensMessages;
}

export function SingleCalendarPanel({
  showTime,
  locale,
  initialValue,
  onSelect,
  onCancel,
  messages,
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
          label={messages.dateSingleLabel}
          ariaLabel={messages.dateInputAria(messages.dateSingleLabel, showTime)}
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
        <PanelActions
          applyDisabled={!selected}
          onCancel={onCancel}
          onApply={handleApply}
          messages={messages}
        />
      )}
    </div>
  );
}
