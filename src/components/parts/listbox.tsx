"use client";

import * as React from "react";
import { ChevronRightIcon, LoaderCircleIcon } from "lucide-react";
import type { FilterSchema, FilterTokensReturn } from "filter-tokens";
import { cn } from "filter-tokens/lib/utils";
import { ItemIndicator } from "./item-indicator";

export interface ListboxProps<T extends FilterSchema> {
  ft: FilterTokensReturn<T>;
  listboxId: string;
  activeLabel: string | null;
  isMultiSelect: boolean;
  isTextEntry: boolean;
}

export function Listbox<T extends FilterSchema>({
  ft,
  listboxId,
  activeLabel,
  isMultiSelect,
  isTextEntry,
}: ListboxProps<T>) {
  const { items, highlightedIndex, loading, error, retry } = ft.dropdown;
  const showEmpty =
    items.length === 0 && !isTextEntry && !loading && !error;
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Keep the keyboard-highlighted option visible. The listbox has a fixed
  // max-h with overflow-y-auto, so without this, ArrowDown past the visible
  // area moves the highlight off-screen. (jsdom doesn't implement
  // scrollIntoView, so the optional-chain guards the test environment.)
  React.useEffect(() => {
    if (highlightedIndex < 0) return;
    const el = containerRef.current?.querySelector<HTMLElement>(
      '[data-highlighted="true"]',
    );
    el?.scrollIntoView?.({ block: "nearest" });
  }, [highlightedIndex]);

  return (
    <div
      ref={containerRef}
      role="listbox"
      id={listboxId}
      aria-label={activeLabel ?? "Filter categories"}
      aria-multiselectable={isMultiSelect || undefined}
      aria-orientation="vertical"
      className="max-h-[260px] overflow-y-auto p-1"
    >
      {loading && (
        <div
          data-slot="filter-tokens-loading"
          role="status"
          className="flex justify-center py-6"
        >
          <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && !loading && (
        <div
          data-slot="filter-tokens-error"
          role="alert"
          className="flex flex-col items-center gap-2 px-2 py-6 text-center text-sm"
        >
          <span className="text-destructive">Failed to load options</span>
          <button
            type="button"
            onClick={retry}
            className="rounded-sm text-xs text-muted-foreground underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Retry
          </button>
        </div>
      )}

      {showEmpty && (
        <div
          data-slot="filter-tokens-empty"
          role="status"
          className="px-2 py-6 text-center text-sm text-muted-foreground"
        >
          No results found
        </div>
      )}

      {isTextEntry && (
        <div
          data-slot="filter-tokens-text-entry-hint"
          className="px-2 py-3 text-center text-xs text-muted-foreground"
        >
          Press <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to apply, <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Esc</kbd> to cancel
        </div>
      )}

      {items.map((item, index) => {
        const isHighlighted = index === highlightedIndex;
        return (
          <div
            key={item.key}
            id={`${listboxId}-item-${item.key}`}
            role="option"
            // Categories aren't "selectable" in the WAI-ARIA sense — clicking
            // one navigates into a sub-menu rather than choosing a value. Only
            // emit aria-selected for actual value options. The data-selected
            // attribute is preserved either way so consumer CSS can still
            // indicate categories that have an active filter.
            aria-selected={item.type === 'value' ? item.selected : undefined}
            data-slot="filter-tokens-dropdown-item"
            data-type={item.type}
            data-highlighted={isHighlighted || undefined}
            data-selected={item.selected || undefined}
            className={cn(
              "relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors",
              isHighlighted
                ? "bg-accent text-accent-foreground"
                : "text-popover-foreground hover:bg-accent/50",
            )}
            onMouseEnter={() => ft.dropdown.setHighlightedIndex(index)}
            onClick={() => ft.dropdown.select(item)}
          >
            <ItemIndicator item={item} isMultiSelect={isMultiSelect} />
            {item.icon && (
              <item.icon className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1 truncate">{item.label}</span>
            {item.type === "category" && (
              <ChevronRightIcon className="size-3.5 text-muted-foreground/50" />
            )}
          </div>
        );
      })}
    </div>
  );
}
