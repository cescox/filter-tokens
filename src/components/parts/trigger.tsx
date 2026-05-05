"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import type { FilterSchema, FilterTokensReturn } from "filter-tokens";
import { cn } from "filter-tokens/lib/utils";
import { Token } from "./token";

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
  const tokenRefs = React.useRef<(HTMLSpanElement | null)[]>([]);

  const state = ft.dropdown.state;
  const isPanelMode =
    state.mode === "input" &&
    (state.inputType === "date" || state.inputType === "number");

  // When the popover opens (via token click, keyboard, or programmatic open()),
  // make sure focus lands on our outer input — except in date/number entry
  // where the panel manages its own focus, and except when focus has
  // intentionally moved to a token (ArrowLeft token nav). Without the
  // token-aware guard, the rAF would yank focus back to the input every
  // time mode changes.
  React.useEffect(() => {
    if (ft.dropdown.isOpen && !isPanelMode) {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        const onToken = active?.closest?.(
          '[data-slot="filter-tokens-token"]',
        );
        if (onToken) return;
        ft.inputProps.ref.current?.focus();
      });
    }
  }, [ft.dropdown.isOpen, state.mode, isPanelMode, ft.inputProps.ref]);

  const highlightedItem =
    ft.dropdown.highlightedIndex >= 0
      ? ft.dropdown.items[ft.dropdown.highlightedIndex]
      : null;
  const activeDescendantId =
    ft.dropdown.isOpen && highlightedItem
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
          <Token
            key={token.id}
            ref={(el) => {
              tokenRefs.current[index] = el;
            }}
            category={token.category}
            label={token.label}
            displayValue={token.displayValue}
            ariaLabel={ft.messages.tokenAria(token.label, token.displayValue)}
            removeAriaLabel={ft.messages.tokenRemoveAria(token.label, token.displayValue)}
            onRemove={() => {
              const removeIndex = index;
              const expectedCount = ft.tokens.length - 1;
              token.remove();
              requestAnimationFrame(() => {
                const nextToken =
                  removeIndex < expectedCount
                    ? tokenRefs.current[removeIndex]
                    : null;
                const prevToken =
                  removeIndex > 0
                    ? tokenRefs.current[removeIndex - 1]
                    : null;
                (nextToken ?? prevToken ?? ft.inputProps.ref.current)?.focus();
              });
            }}
            onClick={() => ft.dropdown.openFilter(token.category as keyof T & string)}
            onPrevious={
              index > 0
                ? () => tokenRefs.current[index - 1]?.focus()
                : undefined
            }
            onNext={() => {
              if (index < ft.tokens.length - 1) {
                tokenRefs.current[index + 1]?.focus();
              } else {
                // Last token → step out into the input.
                ft.inputProps.ref.current?.focus();
              }
            }}
            onEscape={() => ft.inputProps.ref.current?.focus()}
            disabled={disabled}
          />
        ))}

        <input
          {...ft.inputProps}
          data-slot="filter-tokens-input"
          disabled={disabled}
          // Panel modes (date / number) render a dialog, not a listbox, so
          // the popup type and the controlled element id both differ.
          aria-haspopup={isPanelMode ? "dialog" : "listbox"}
          aria-controls={
            ft.dropdown.isOpen && !isPanelMode ? listboxId : undefined
          }
          aria-activedescendant={activeDescendantId}
          onClick={() => {
            // Focus alone won't reopen the popover after ESC-from-categories
            // (the input keeps focus, so onFocus doesn't re-fire). A click
            // on the input bar always opens.
            if (!disabled && !ft.dropdown.isOpen) ft.dropdown.open();
          }}
          onKeyDown={(e) => {
            // ArrowLeft on an empty input with the cursor at position 0:
            // step into the token strip, focusing the last token. ArrowRight
            // / typing leaves the input behaviour intact.
            if (
              e.key === "ArrowLeft" &&
              !ft.inputProps.value &&
              ft.tokens.length > 0
            ) {
              const el = e.currentTarget;
              // selectionStart/End are 0 in real browsers and may be null in
              // jsdom for an empty input — both signal "no selection / cursor
              // at the start", which is the only state we step out for.
              const start = el.selectionStart ?? 0;
              const end = el.selectionEnd ?? 0;
              if (start === 0 && end === 0) {
                e.preventDefault();
                tokenRefs.current[ft.tokens.length - 1]?.focus();
                return;
              }
            }
            // Tab is intentionally NOT closed here — letting the natural
            // tab order walk through the popover (back button, retry, etc.)
            // is the only way keyboard-only users can reach those controls.
            // Radix's onFocusOutside still closes the popup once focus
            // genuinely leaves the trigger + content surface.
            ft.inputProps.onKeyDown(e);
          }}
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
              // Don't refocus the input. "Clear all" is a "done" gesture —
              // matching Linear / Notion, the popover stays closed and focus
              // falls naturally. The user clicks the input again if they
              // want to add new filters.
            }}
            aria-label={ft.messages.clearAllAria}
            disabled={disabled}
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>
    </>
  );
}
