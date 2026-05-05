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
  const state = ft.dropdown.state;
  if (state.mode !== "input") return null;
  const { category: activeCategory, inputType } = state;

  const activeDef = (filters as FilterSchema)[activeCategory];
  if (!activeDef) return null;

  // Cast through a record once. The hook's generic guarantees the runtime
  // value lives at activeCategory, but the per-branch typing differs.
  const currentValue = (value as Record<string, unknown>)[activeCategory];

  if (inputType === "date" && activeDef.type === "date") {
    return activeDef.range === true ? (
      <RangeCalendarPanel
        showTime={activeDef.time === true}
        locale={dateLocale}
        initialValue={currentValue as { from?: string; to?: string } | undefined}
        onSelect={(v) => ft.applyDate(activeCategory, v)}
        onCancel={ft.dropdown.close}
      />
    ) : (
      <SingleCalendarPanel
        showTime={activeDef.time === true}
        locale={dateLocale}
        initialValue={currentValue as { date?: string } | undefined}
        onSelect={(v) => ft.applyDate(activeCategory, v)}
        onCancel={ft.dropdown.close}
      />
    );
  }

  if (inputType === "number" && activeDef.type === "number") {
    return (
      <NumberPanel
        unit={activeDef.unit}
        min={activeDef.min}
        max={activeDef.max}
        initialValue={currentValue as { min?: number; max?: number } | undefined}
        onSelect={(v) => ft.applyNumber(activeCategory, v)}
        onCancel={ft.dropdown.close}
      />
    );
  }

  return null;
}
