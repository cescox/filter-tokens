"use client";

import type { FilterTokensMessages } from "filter-tokens";
import { Button } from "filter-tokens/components/ui/button";

export interface PanelActionsProps {
  /** Whether the Apply button is disabled (no value to commit / invalid range / etc.). */
  applyDisabled?: boolean;
  onCancel: () => void;
  onApply: () => void;
  messages: FilterTokensMessages;
}

/**
 * Cancel + Apply button row shown at the bottom of date and number panels.
 * Single source of truth for spacing, button order, and label wiring so the
 * three panels (range calendar, single calendar, number) stay in sync.
 */
export function PanelActions({
  applyDisabled,
  onCancel,
  onApply,
  messages,
}: PanelActionsProps) {
  return (
    <div className="flex justify-end gap-2 px-3 pb-3">
      <Button variant="ghost" onClick={onCancel}>
        {messages.cancelLabel}
      </Button>
      <Button disabled={applyDisabled} onClick={onApply}>
        {messages.applyLabel}
      </Button>
    </div>
  );
}
