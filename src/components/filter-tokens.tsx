"use client";

import * as React from "react";
import type { Locale } from "date-fns";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  useFilterTokens,
  type FilterSchema,
  type FilterTokensProps,
} from "filter-tokens";
import { FilterTokensTrigger } from "./parts/trigger";
import { Header } from "./parts/header";
import { Listbox } from "./parts/listbox";
import { Panels } from "./parts/panels";

/* ─── Types ────────────────────────────────────────────────────────────────── */

type FilterTokensComponentProps<T extends FilterSchema> = FilterTokensProps<T> &
  Omit<React.ComponentProps<"div">, "onChange"> & {
    dateLocale?: Locale;
  };

/* ─── FilterTokens ─────────────────────────────────────────────────────────── */

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
  const listboxId = React.useId();
  const popoverContentId = React.useId();

  const { mode, category: activeCategory } = ft.dropdown.state;
  const isValuesMode = mode === "values";
  const isTextEntry = mode === "text-entry";
  const isDateEntry = mode === "date-entry";
  const isNumberEntry = mode === "number-entry";
  const isPanelMode = isDateEntry || isNumberEntry;

  const activeDef = activeCategory
    ? (filters as FilterSchema)[activeCategory]
    : null;
  const activeLabel = activeDef?.label ?? null;
  const isMultiSelect =
    activeDef?.type === "select" && activeDef.multi === true;

  return (
    <PopoverPrimitive.Root
      open={ft.dropdown.open}
      onOpenChange={(open) => { if (!open) ft.dropdown.close(); }}
      modal={false}
    >
      <PopoverPrimitive.Anchor asChild>
        <div data-slot="filter-tokens" {...props}>
          <FilterTokensTrigger
            ft={ft}
            listboxId={listboxId}
            disabled={disabled}
            className={className}
          />
        </div>
      </PopoverPrimitive.Anchor>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          id={popoverContentId}
          data-slot="filter-tokens-dropdown"
          data-state={mode}
          align="start"
          sideOffset={4}
          className="z-50 max-w-[480px] min-w-(--radix-popover-trigger-width) rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // The combobox input lives in the trigger area, not in the popover
            // content. When focus moves to it (after a chip click or option
            // selection), Radix would otherwise treat that as an outside
            // interaction and close. Keep it open for any interaction inside
            // our trigger surface.
            const target = e.target as Element | null;
            if (target?.closest?.('[data-slot="filter-tokens-trigger"]')) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isValuesMode || isTextEntry || isPanelMode) {
              e.preventDefault();
              ft.dropdown.goBack();
            }
          }}
        >
          {activeLabel && (
            <Header
              activeLabel={activeLabel}
              isDateEntry={isDateEntry}
              onBack={ft.dropdown.goBack}
            />
          )}

          {!isPanelMode && (
            <Listbox
              ft={ft}
              listboxId={listboxId}
              activeLabel={activeLabel}
              isMultiSelect={isMultiSelect}
              isTextEntry={isTextEntry}
            />
          )}

          {isPanelMode && (
            <Panels
              ft={ft}
              filters={filters}
              value={value}
              dateLocale={dateLocale}
            />
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/* ─── Exports ──────────────────────────────────────────────────────────────── */

export { FilterTokens };
export type { FilterTokensComponentProps };
