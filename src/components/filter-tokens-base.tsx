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
  const triggerRef = React.useRef<HTMLDivElement>(null);
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
    <Popover.Root
      open={ft.dropdown.isOpen}
      onOpenChange={(open, details) => {
        if (open) return;
        // ESC: don't let Base UI close — the hook's handleKeyDown will run
        // ESC logic against the input (goBack from values/text/date/number,
        // close from categories). If we let Base UI close here, we'd skip
        // the goBack-step-back behavior that's expected from a sub-mode.
        if (details?.reason === "escape-key") {
          details?.cancel?.();
          return;
        }
        // The combobox input lives in the trigger area, not in the popover
        // popup. When focus or pointer interactions land on it (after a token
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
            data-mode={state.mode}
            data-input-type={inputType ?? undefined}
            className="max-w-[480px] min-w-(--anchor-width) rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg outline-none"
            initialFocus={false}
            finalFocus={ft.inputProps.ref}
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
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ─── Exports ──────────────────────────────────────────────────────────────── */

export { FilterTokens };
export type { FilterTokensComponentProps };
