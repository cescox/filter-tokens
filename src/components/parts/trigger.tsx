"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import type { FilterSchema, FilterTokensReturn } from "filter-tokens";
import { cn } from "filter-tokens/lib/utils";
import { Chip } from "./chip";

export interface TriggerProps<T extends FilterSchema> {
  ft: FilterTokensReturn<T>;
  /**
   * ID of the listbox element rendered inside the popover content.
   * Used for `aria-controls` and to compute the highlighted option ID
   * for `aria-activedescendant`.
   */
  listboxId: string;
  disabled?: boolean;
  className?: string;
}

export function Trigger<T extends FilterSchema>({
  ft,
  listboxId,
  disabled,
  className,
}: TriggerProps<T>) {
  const chipRefs = React.useRef<(HTMLSpanElement | null)[]>([]);

  const isPanelMode =
    ft.dropdown.state.mode === "date-entry" ||
    ft.dropdown.state.mode === "number-entry";

  // When the popover opens (via chip click, keyboard, or programmatic open()),
  // make sure focus lands on our outer input — except in date/number entry
  // where the panel manages its own focus.
  React.useEffect(() => {
    if (ft.dropdown.open && !isPanelMode) {
      requestAnimationFrame(() => ft.inputProps.ref.current?.focus());
    }
  }, [ft.dropdown.open, ft.dropdown.state.mode, isPanelMode, ft.inputProps.ref]);

  const highlightedItem =
    ft.dropdown.highlightedIndex >= 0
      ? ft.dropdown.items[ft.dropdown.highlightedIndex]
      : null;
  const activeDescendantId =
    ft.dropdown.open && highlightedItem
      ? `${listboxId}-item-${highlightedItem.key}`
      : undefined;

  function handleWrapperMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (disabled) return;
    const target = e.target as HTMLElement;
    if (
      target.closest("[data-slot=filter-tokens-token]") ||
      target.closest("[data-slot=filter-tokens-clear]") ||
      target.tagName === "INPUT"
    ) {
      return;
    }
    e.preventDefault();
    ft.inputProps.ref.current?.focus();
  }

  return (
    <>
      <div
        data-slot="filter-tokens-announcement"
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {ft.announcement}
      </div>
      <div
        data-slot="filter-tokens-trigger"
        data-disabled={disabled || undefined}
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm cursor-text",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        onMouseDown={handleWrapperMouseDown}
      >
        {ft.tokens.map((token, index) => (
          <Chip
            key={token.id}
            ref={(el) => {
              chipRefs.current[index] = el;
            }}
            category={token.category}
            label={token.label}
            displayValue={token.displayValue}
            onRemove={() => {
              const removeIndex = index;
              const expectedCount = ft.tokens.length - 1;
              token.remove();
              requestAnimationFrame(() => {
                const nextChip =
                  removeIndex < expectedCount
                    ? chipRefs.current[removeIndex]
                    : null;
                const prevChip =
                  removeIndex > 0
                    ? chipRefs.current[removeIndex - 1]
                    : null;
                (nextChip ?? prevChip ?? ft.inputProps.ref.current)?.focus();
              });
            }}
            onClick={() => ft.openCategory(token.category)}
            disabled={disabled}
          />
        ))}

        <input
          {...ft.inputProps}
          data-slot="filter-tokens-input"
          disabled={disabled}
          aria-controls={ft.dropdown.open ? listboxId : undefined}
          aria-activedescendant={activeDescendantId}
          className="flex-1 min-w-[120px] border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
        />

        {ft.tokens.length > 0 && (
          <button
            type="button"
            data-slot="filter-tokens-clear"
            tabIndex={-1}
            className="ml-auto shrink-0 rounded-sm p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              ft.clear();
            }}
            aria-label="Clear all filters"
            disabled={disabled}
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>
    </>
  );
}
