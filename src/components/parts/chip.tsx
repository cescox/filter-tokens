"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { cn } from "filter-tokens/lib/utils";

export interface FilterTokenChipProps {
  category: string;
  label: string;
  displayValue: string;
  onRemove: () => void;
  onClick?: () => void;
  disabled?: boolean;
}

export const FilterTokenChip = React.forwardRef<
  HTMLSpanElement,
  FilterTokenChipProps
>(function FilterTokenChip(
  { category, label, displayValue, onRemove, onClick, disabled },
  ref,
) {
  return (
    <span
      ref={ref}
      data-slot="filter-tokens-token"
      data-category={category}
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${displayValue}. Click to edit.`}
      className="group inline-flex cursor-pointer items-center gap-1 rounded-md bg-secondary py-0.5 pl-2 pr-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        aria-label={`Remove ${label}: ${displayValue}`}
        disabled={disabled}
      >
        <XIcon className="size-3" />
      </button>
    </span>
  );
});
