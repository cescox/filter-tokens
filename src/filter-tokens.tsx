import * as React from 'react';
import type { FilterSchema, FilterTokensProps } from './types';
import { useFilterTokens } from './use-filter-tokens';
import { cn } from './utils';
import { X } from './icons';

export function FilterTokens<const T extends FilterSchema>(props: FilterTokensProps<T>) {
  const { filters, value, onChange, placeholder, className, disabled } = props;
  const ft = useFilterTokens({ filters, value, onChange, placeholder });

  return (
    <div data-slot="filter-tokens" data-filter-tokens className="relative">
      <div
        data-slot="filter-tokens-input-wrapper"
        data-disabled={disabled || undefined}
        data-has-tokens={ft.tokens.length > 0 || undefined}
        className={cn(
          'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
        onClick={() => {
          if (!disabled) ft.inputProps.ref.current?.focus();
        }}
      >
        {ft.tokens.map((token) => (
          <span
            key={token.id}
            data-slot="filter-tokens-token"
            data-category={token.category}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            <span data-slot="filter-tokens-token-label" className="text-muted-foreground">
              {token.label}:
            </span>
            <span data-slot="filter-tokens-token-value">{token.displayValue}</span>
            <button
              type="button"
              data-slot="filter-tokens-token-remove"
              className="ml-0.5 inline-flex items-center justify-center rounded-sm opacity-60 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              onClick={(e) => {
                e.stopPropagation();
                token.remove();
              }}
              aria-label={`Remove ${token.label}: ${token.displayValue}`}
              disabled={disabled}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        <input
          {...ft.inputProps}
          ref={ft.inputProps.ref}
          data-slot="filter-tokens-input"
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[80px] disabled:cursor-not-allowed"
          disabled={disabled}
        />

        {ft.tokens.length > 0 && (
          <button
            type="button"
            data-slot="filter-tokens-clear"
            className="ml-auto shrink-0 inline-flex items-center justify-center rounded-sm opacity-60 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            onClick={(e) => {
              e.stopPropagation();
              ft.clear();
            }}
            aria-label="Clear all filters"
            disabled={disabled}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {ft.dropdown.open && (
        <div
          data-slot="filter-tokens-dropdown"
          data-filter-tokens-dropdown
          data-state={ft.dropdown.state.mode}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[300px] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div role="listbox" id="filter-tokens-listbox">
            {ft.dropdown.state.mode === 'text-entry' && (
              <div data-slot="filter-tokens-hint" className="px-2 py-1.5 text-xs text-muted-foreground">
                Type and press Enter
              </div>
            )}

            {ft.dropdown.items.length === 0 &&
              ft.dropdown.state.mode !== 'text-entry' &&
              ft.dropdown.state.mode !== 'date-entry' && (
                <div data-slot="filter-tokens-empty" className="px-2 py-1.5 text-sm text-muted-foreground">
                  No results
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
                    'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                    'data-[selected]:font-medium',
                  )}
                  onMouseEnter={() => ft.dropdown.setHighlightedIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    ft.dropdown.select(item);
                  }}
                >
                  {item.icon && <item.icon className="size-4 shrink-0 text-muted-foreground" />}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.selected && <Check className="size-4 shrink-0 text-muted-foreground" />}
                </div>
              );
            })}

            {ft.dropdown.state.mode === 'date-entry' && (
              <DateEntryPanel
                category={ft.dropdown.state.category}
                schema={props.filters as unknown as FilterSchema}
                value={value as Record<string, unknown>}
                onChange={onChange as (v: Record<string, unknown>) => void}
                onClose={ft.dropdown.close}
              />
            )}

            {ft.dropdown.state.mode === 'values' && (() => {
              const cat = ft.dropdown.state.category;
              const def = (props.filters as unknown as FilterSchema)[cat];
              if (def?.type === 'date' && def.presets) {
                return (
                  <DateEntryPanel
                    category={cat}
                    schema={props.filters as unknown as FilterSchema}
                    value={value as Record<string, unknown>}
                    onChange={onChange as (v: Record<string, unknown>) => void}
                    onClose={ft.dropdown.close}
                    showBelowPresets
                  />
                );
              }
              return null;
            })()}
          </div>
        </div>
      )}
    </div>
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
  if (def?.type !== 'date') return null;

  const isRange = def.range;
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [single, setSingle] = React.useState('');

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

  return (
    <div data-slot="filter-tokens-date-panel" className={cn('px-2 py-1.5', showBelowPresets && 'border-t border-border mt-1 pt-2')}>
      <div className="text-xs font-medium text-muted-foreground mb-2">
        {showBelowPresets ? 'Custom range' : 'Select date'}
      </div>
      {isRange ? (
        <div className="flex flex-col gap-2">
          <input
            type={def.time ? 'datetime-local' : 'date'}
            data-slot="filter-tokens-date-input"
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="From"
          />
          <input
            type={def.time ? 'datetime-local' : 'date'}
            data-slot="filter-tokens-date-input"
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To"
          />
          <button
            type="button"
            data-slot="filter-tokens-date-apply"
            className="w-full rounded-md bg-primary px-2 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            disabled={!from || !to}
            onClick={handleApply}
          >
            Apply
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type={def.time ? 'datetime-local' : 'date'}
            data-slot="filter-tokens-date-input"
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            value={single}
            onChange={(e) => setSingle(e.target.value)}
          />
          <button
            type="button"
            data-slot="filter-tokens-date-apply"
            className="w-full rounded-md bg-primary px-2 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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

function Check({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
