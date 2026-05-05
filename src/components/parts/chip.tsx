"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { cn } from "filter-tokens/lib/utils";

/**
 * Visual rendering of a Token. Distinct from the `Token` data type
 * exported from the package — that's the value object (id, category,
 * label, displayValue, remove); this is the chip-shaped UI element.
 */
export interface ChipProps {
  category: string;
  label: string;
  displayValue: string;
  /** Resolved aria-label string for the chip (`messages.chipName`). */
  ariaLabel: string;
  /** Resolved aria-label string for the remove button (`messages.chipRemoveName`). */
  removeAriaLabel: string;
  onRemove: () => void;
  onClick?: () => void;
  disabled?: boolean;
  /**
   * Move focus to the previous chip (ArrowLeft on a focused chip).
   * Trigger passes a noop / undefined when there is no previous chip.
   */
  onPrevious?: () => void;
  /**
   * Move focus to the next chip, falling back to the input when this is
   * the last chip (ArrowRight on a focused chip).
   */
  onNext?: () => void;
  /**
   * Step out of the chip strip and back to the input (Escape on a focused
   * chip). Aligns with Mantine's chip-input behaviour.
   */
  onEscape?: () => void;
}

export const Chip = React.forwardRef<
  HTMLSpanElement,
  ChipProps
>(function Chip(
  { category, label, displayValue, ariaLabel, removeAriaLabel, onRemove, onClick, disabled, onPrevious, onNext, onEscape },
  ref,
) {
  return (
    <span
      ref={ref}
      data-slot="filter-tokens-token"
      data-category={category}
      data-disabled={disabled || undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      className={cn(
        "group inline-flex items-center gap-1 rounded-md bg-secondary py-0.5 pl-2 pr-1 text-xs font-medium text-secondary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:bg-secondary/80",
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && onClick) onClick();
      }}
      onMouseDown={(e) => {
        // Prevent the trigger wrapper's mousedown-to-focus-input handler
        // from stealing focus before the chip's click runs.
        e.stopPropagation();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled && onClick) onClick();
        } else if (e.key === "ArrowLeft" && onPrevious) {
          e.preventDefault();
          e.stopPropagation();
          onPrevious();
        } else if (e.key === "ArrowRight" && onNext) {
          e.preventDefault();
          e.stopPropagation();
          onNext();
        } else if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) onRemove();
        } else if (e.key === "Escape" && onEscape) {
          e.preventDefault();
          e.stopPropagation();
          onEscape();
        }
      }}
    >
      <span
        data-slot="filter-tokens-token-label"
        className="text-muted-foreground"
      >
        {label}:
      </span>
      <span data-slot="filter-tokens-token-value">{displayValue}</span>
      <button
        type="button"
        data-slot="filter-tokens-token-remove"
        tabIndex={-1}
        className="ml-0.5 rounded-sm p-0.5 text-muted-foreground/80 transition-colors hover:bg-secondary-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        onMouseDown={(e) => {
          // Same: don't let the trigger wrapper steal focus to the input
          // before the remove handler runs.
          e.stopPropagation();
        }}
        aria-label={removeAriaLabel}
        disabled={disabled}
      >
        <XIcon className="size-3" />
      </button>
    </span>
  );
});
