"use client";

import * as React from "react";
import type { FilterTokensMessages } from "filter-tokens";
import { cn } from "filter-tokens/lib/utils";
import { PanelActions } from "./panel-actions";

export interface NumberPanelProps {
  unit?: string;
  min?: number;
  max?: number;
  initialValue?: { min?: number; max?: number };
  onSelect: (value: { min?: number; max?: number }) => void;
  onCancel: () => void;
  messages: FilterTokensMessages;
}

export function NumberPanel({
  unit,
  min,
  max,
  initialValue,
  onSelect,
  onCancel,
  messages,
}: NumberPanelProps) {
  const [minVal, setMinVal] = React.useState(initialValue?.min?.toString() ?? "");
  const [maxVal, setMaxVal] = React.useState(initialValue?.max?.toString() ?? "");
  const minId = React.useId();
  const maxId = React.useId();

  const parsedMin = minVal ? parseFloat(minVal) : undefined;
  const parsedMax = maxVal ? parseFloat(maxVal) : undefined;
  const hasValidMin = parsedMin !== undefined && !isNaN(parsedMin);
  const hasValidMax = parsedMax !== undefined && !isNaN(parsedMax);
  const hasValue = hasValidMin || hasValidMax;

  function handleApply() {
    if (!hasValue) return;
    const result: { min?: number; max?: number } = {};
    if (hasValidMin) result.min = parsedMin;
    if (hasValidMax) result.max = parsedMax;
    onSelect(result);
  }

  return (
    <div
      data-slot="filter-tokens-number"
      className="border-t border-border p-3 space-y-2"
    >
      <div className="flex items-center gap-2 px-2 py-1 text-sm">
        <label htmlFor={minId} className="w-9 shrink-0 text-xs font-medium text-muted-foreground">
          {messages.numberMinLabel}
        </label>
        <input
          id={minId}
          type="number"
          aria-label={messages.numberMinAria(unit)}
          className={cn(
            "flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm font-mono tabular-nums placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          )}
          placeholder={min !== undefined ? String(min) : ""}
          value={minVal}
          min={min}
          max={max}
          onChange={(e) => setMinVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApply(); } }}
        />
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      <div className="flex items-center gap-2 px-2 py-1 text-sm">
        <label htmlFor={maxId} className="w-9 shrink-0 text-xs font-medium text-muted-foreground">
          {messages.numberMaxLabel}
        </label>
        <input
          id={maxId}
          type="number"
          aria-label={messages.numberMaxAria(unit)}
          className={cn(
            "flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm font-mono tabular-nums placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          )}
          placeholder={max !== undefined ? String(max) : ""}
          value={maxVal}
          min={min}
          max={max}
          onChange={(e) => setMaxVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApply(); } }}
        />
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      <PanelActions
        applyDisabled={!hasValue}
        onCancel={onCancel}
        onApply={handleApply}
        messages={messages}
      />
    </div>
  );
}
