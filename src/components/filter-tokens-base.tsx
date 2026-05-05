"use client";

import * as React from "react";
import type { Locale } from "date-fns";
import { Popover } from "@base-ui/react/popover";
import {
  useFilterTokens,
  type FilterSchema,
  type FilterTokensProps,
} from "filter-tokens";
import { Trigger } from "./parts/trigger";
import { Header } from "./parts/header";
import { Listbox } from "./parts/listbox";
import { Panels } from "./parts/panels";

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
  const isPanelMode = isDateEntry || isNumberEntry;

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
        <Trigger
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
              if (e.key === "Escape" && (isValuesMode || isTextEntry || isPanelMode)) {
                e.preventDefault();
                e.stopPropagation();
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
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ─── Exports ──────────────────────────────────────────────────────────────── */

export { FilterTokens };
export type { FilterTokensComponentProps };
