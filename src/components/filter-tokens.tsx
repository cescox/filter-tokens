"use client";

import * as React from "react";
import type { Locale } from "date-fns";
import * as PopoverPrimitive from "@radix-ui/react-popover";
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

/* ─── FilterTokens ─────────────────────────────────────────────────────────── */

function FilterTokens<const T extends FilterSchema>({
  filters,
  value,
  onChange,
  placeholder = "Filter...",
  className,
  disabled,
  dateLocale,
  messages,
  ...props
}: FilterTokensComponentProps<T>) {
  const ft = useFilterTokens({
    filters,
    value,
    onChange,
    placeholder,
    locale: dateLocale?.code,
    messages,
  });
  const listboxId = React.useId();
  const popoverContentId = React.useId();

  const state = ft.dropdown.state;
  const isInput = state.mode === "input";
  const inputType = isInput ? state.inputType : null;
  const activeCategory =
    state.mode === "values" || state.mode === "input" ? state.category : null;
  const isTextEntry = inputType === "text";
  const isDateEntry = inputType === "date";
  const isPanelMode = inputType === "date" || inputType === "number";

  const activeDef = activeCategory
    ? (filters as FilterSchema)[activeCategory]
    : null;
  const activeLabel = activeDef?.label ?? null;
  const isMultiSelect =
    activeDef?.type === "select" && activeDef.multi === true;

  return (
    <PopoverPrimitive.Root
      open={ft.dropdown.isOpen}
      onOpenChange={(open) => { if (!open) ft.dropdown.close(); }}
      modal={false}
    >
      <PopoverPrimitive.Anchor asChild>
        <div data-slot="filter-tokens" {...props}>
          <Trigger
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
          data-mode={state.mode}
          data-input-type={inputType ?? undefined}
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
            // Radix's escape listener fires in document capture phase, so it
            // runs *before* the hook's handleKeyDown (which is the input's
            // onKeyDown bubble). React 19 flushes setState between phases,
            // which means the hook would see the *new* mode and advance a
            // second time (values → categories → close).
            //
            // To make ESC behave correctly:
            //  - In sub-modes (values / input): goBack here and preventDefault
            //    so Radix doesn't dismiss. The hook then short-circuits
            //    because e.defaultPrevented === true.
            //  - In categories mode: do nothing here — let Radix's default
            //    dismiss path run (calls onOpenChange(false)), which closes.
            if (state.mode === "values" || state.mode === "input") {
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
              messages={ft.messages}
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
