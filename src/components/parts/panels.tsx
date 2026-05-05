"use client";

import type { Locale } from "date-fns";
import type {
  FilterSchema,
  FilterTokensReturn,
  FilterValues,
} from "filter-tokens";
import { RangeCalendarPanel, SingleCalendarPanel } from "./calendar-panel";
import { NumberPanel } from "./number-panel";

export interface PanelsProps<T extends FilterSchema> {
  ft: FilterTokensReturn<T>;
  filters: T;
  value: FilterValues<T>;
  dateLocale?: Locale;
}

export function Panels<T extends FilterSchema>({
  ft,
  filters,
  value,
  dateLocale,
}: PanelsProps<T>) {
  const { mode, category: activeCategory } = ft.dropdown.state;
  if (!activeCategory) return null;

  const activeDef = (filters as FilterSchema)[activeCategory];
  if (!activeDef) return null;

  if (mode === "date-entry" && activeDef.type === "date") {
    const dateValue = (value as Record<string, unknown>)[activeCategory];
    return activeDef.range === true ? (
      <RangeCalendarPanel
        showTime={activeDef.time === true}
        locale={dateLocale}
        initialValue={dateValue as { from?: string; to?: string } | undefined}
        onSelect={(v) => ft.setDateValue(activeCategory, v)}
        onCancel={ft.dropdown.goBack}
      />
    ) : (
      <SingleCalendarPanel
        showTime={activeDef.time === true}
        locale={dateLocale}
        initialValue={dateValue as { date?: string } | undefined}
        onSelect={(v) => ft.setDateValue(activeCategory, v)}
        onCancel={ft.dropdown.goBack}
      />
    );
  }

  if (mode === "number-entry" && activeDef.type === "number") {
    return (
      <NumberPanel
        unit={activeDef.unit}
        min={activeDef.min}
        max={activeDef.max}
        initialValue={
          (value as Record<string, unknown>)[activeCategory] as
            | { min?: number; max?: number }
            | undefined
        }
        onSelect={(v) => ft.setNumberValue(activeCategory, v)}
        onCancel={ft.dropdown.goBack}
      />
    );
  }

  return null;
}
