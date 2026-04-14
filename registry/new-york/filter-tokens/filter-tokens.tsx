"use client";

import * as React from "react";
import { XIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  useFilterTokens,
  type FilterSchema,
  type FilterTokensProps,
} from "filter-tokens";
import { cn } from "@/lib/utils";

function FilterTokens<const T extends FilterSchema>({
  filters,
  value,
  onChange,
  placeholder,
  className,
  disabled,
  ...props
}: FilterTokensProps<T> & React.ComponentProps<"div">) {
  const ft = useFilterTokens({ filters, value, onChange, placeholder });

  const isValuesMode = ft.dropdown.state.mode === "values";
  const isTextEntry = ft.dropdown.state.mode === "text-entry";
  const isDateEntry = ft.dropdown.state.mode === "date-entry";
  const activeCategory =
    isValuesMode || isDateEntry || isTextEntry
      ? (ft.dropdown.state as { category: string }).category
      : null;
  const activeCategoryDef = activeCategory
    ? (filters as unknown as FilterSchema)[activeCategory]
    : null;
  const activeCategoryLabel = activeCategoryDef?.label ?? null;
  const isMultiSelect =
    activeCategoryDef?.type === "select" && activeCategoryDef.multi === true;

  const goBackToCategories = React.useCallback(() => {
    ft.dropdown.close();
    setTimeout(() => ft.inputProps.ref.current?.focus(), 0);
  }, [ft.dropdown, ft.inputProps.ref]);

  return (
    <div
      data-slot="filter-tokens"
      data-filter-tokens
      className="relative"
      {...props}
    >
      <div
        data-slot="filter-tokens-input-wrapper"
        data-disabled={disabled || undefined}
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        onClick={() => {
          if (!disabled) ft.inputProps.ref.current?.focus();
        }}
      >
        {ft.tokens.map((token) => (
          <FilterToken
            key={token.id}
            category={token.category}
            label={token.label}
            displayValue={token.displayValue}
            onRemove={token.remove}
            disabled={disabled}
          />
        ))}

        <input
          {...ft.inputProps}
          ref={ft.inputProps.ref}
          data-slot="filter-tokens-input"
          className="h-6 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-[120px] disabled:cursor-not-allowed"
          disabled={disabled}
        />

        {ft.tokens.length > 0 && (
          <button
            type="button"
            data-slot="filter-tokens-clear"
            className="shrink-0 rounded-sm p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground"
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

      {ft.dropdown.open && (
        <div
          data-slot="filter-tokens-dropdown"
          data-filter-tokens-dropdown
          data-state={ft.dropdown.state.mode}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[300px] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-[0.98] duration-100"
          onMouseDown={(e) => e.preventDefault()}
        >
          {activeCategoryLabel && (
            <div
              data-slot="filter-tokens-dropdown-header"
              className="flex items-center gap-1.5 border-b border-border px-2 py-1.5"
            >
              <button
                type="button"
                className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                onMouseDown={(e) => {
                  e.preventDefault();
                  goBackToCategories();
                }}
              >
                <ChevronLeftIcon className="size-3.5" />
              </button>
              <span className="text-xs font-medium text-muted-foreground">
                {activeCategoryLabel}
              </span>
            </div>
          )}

          {isTextEntry && (
            <div
              data-slot="filter-tokens-hint"
              className="px-3 py-2 text-xs text-muted-foreground"
            >
              Type a value and press{" "}
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                Enter
              </kbd>
            </div>
          )}

          <div
            role="listbox"
            id="filter-tokens-listbox"
            className="overflow-y-auto max-h-[260px] p-1"
          >
            {ft.dropdown.items.length === 0 && !isTextEntry && !isDateEntry && (
              <div
                data-slot="filter-tokens-empty"
                className="px-2 py-6 text-center text-sm text-muted-foreground"
              >
                No results found
              </div>
            )}

            {ft.dropdown.items.map((item, index) => {
              const isHighlighted = index === ft.dropdown.highlightedIndex;
              return (
                <div
                  key={item.key}
                  id={`filter-tokens-item-${item.key}`}
                  role="option"
                  aria-selected={isHighlighted}
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
                  onMouseEnter={() =>
                    ft.dropdown.setHighlightedIndex(index)
                  }
                  onMouseDown={(e) => {
                    e.preventDefault();
                    ft.dropdown.select(item);
                  }}
                >
                  {/* Multi-select: checkbox on the left */}
                  {item.type === "value" && isMultiSelect && (
                    <div
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                        item.selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {item.selected && <CheckIcon className="size-3" />}
                    </div>
                  )}
                  {item.icon && (
                    <item.icon className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate">{item.label}</span>
                  {/* Single-select: checkmark on the right */}
                  {item.type === "value" && !isMultiSelect && item.selected && (
                    <CheckIcon className="size-4 shrink-0 text-primary" />
                  )}
                  {item.type === "category" && (
                    <ChevronRightIcon className="size-3.5 text-muted-foreground/50" />
                  )}
                </div>
              );
            })}
          </div>

          {isDateEntry && (
            <DateEntryPanel
              category={
                (ft.dropdown.state as { category: string }).category
              }
              schema={filters as unknown as FilterSchema}
              value={value as Record<string, unknown>}
              onChange={onChange as (v: Record<string, unknown>) => void}
              onClose={ft.dropdown.close}
            />
          )}

          {isValuesMode &&
            (() => {
              const cat = (ft.dropdown.state as { category: string })
                .category;
              const def = (filters as unknown as FilterSchema)[cat];
              if (def?.type === "date" && def.presets) {
                return (
                  <DateEntryPanel
                    category={cat}
                    schema={filters as unknown as FilterSchema}
                    value={value as Record<string, unknown>}
                    onChange={
                      onChange as (v: Record<string, unknown>) => void
                    }
                    onClose={ft.dropdown.close}
                    showBelowPresets
                  />
                );
              }
              return null;
            })()}
        </div>
      )}
    </div>
  );
}

function FilterToken({
  category,
  label,
  displayValue,
  onRemove,
  disabled,
}: {
  category: string;
  label: string;
  displayValue: string;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <span
      data-slot="filter-tokens-token"
      data-category={category}
      className="group inline-flex items-center gap-1 rounded-md bg-secondary pl-2 pr-1 py-0.5 text-xs font-medium text-secondary-foreground transition-colors"
    >
      <span
        data-slot="filter-tokens-token-label"
        className="text-muted-foreground"
      >
        {label}
      </span>
      <span data-slot="filter-tokens-token-value">{displayValue}</span>
      <button
        type="button"
        data-slot="filter-tokens-token-remove"
        className="ml-0.5 rounded-sm p-0.5 text-muted-foreground/80 transition-colors hover:bg-secondary-foreground/10 hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${label}: ${displayValue}`}
        disabled={disabled}
      >
        <XIcon className="size-3" />
      </button>
    </span>
  );
}

function DateEntryPanel({
  category,
  schema,
  value,
  onChange,
  onClose,
  showBelowPresets,
}: {
  category: string;
  schema: FilterSchema;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  onClose: () => void;
  showBelowPresets?: boolean;
}) {
  const def = schema[category];
  if (def?.type !== "date") return null;

  const isRange = def.range;
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [single, setSingle] = React.useState("");

  const handleApply = () => {
    const newValue = { ...value };
    if (isRange) {
      if (from && to) {
        newValue[category] = { from, to };
        onChange(newValue);
        onClose();
      }
    } else {
      if (single) {
        newValue[category] = { date: single };
        onChange(newValue);
        onClose();
      }
    }
  };

  const inputClass =
    "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1";

  return (
    <div
      data-slot="filter-tokens-date-panel"
      className={cn("p-2", showBelowPresets && "border-t border-border")}
    >
      {!showBelowPresets && (
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Select date
        </div>
      )}
      {isRange ? (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                From
              </label>
              <input
                type={def.time ? "datetime-local" : "date"}
                data-slot="filter-tokens-date-input"
                className={inputClass}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                To
              </label>
              <input
                type={def.time ? "datetime-local" : "date"}
                data-slot="filter-tokens-date-input"
                className={inputClass}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            data-slot="filter-tokens-date-apply"
            className="w-full rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            disabled={!from || !to}
            onClick={handleApply}
          >
            Apply range
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type={def.time ? "datetime-local" : "date"}
            data-slot="filter-tokens-date-input"
            className={inputClass}
            value={single}
            onChange={(e) => setSingle(e.target.value)}
          />
          <button
            type="button"
            data-slot="filter-tokens-date-apply"
            className="w-full rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            disabled={!single}
            onClick={handleApply}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

export { FilterTokens };
