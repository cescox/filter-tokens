"use client";

import { ChevronLeftIcon } from "lucide-react";

export interface HeaderProps {
  activeLabel: string;
  isDateEntry: boolean;
  onBack: () => void;
}

export function Header({ activeLabel, isDateEntry, onBack }: HeaderProps) {
  return (
    <div
      data-slot="filter-tokens-dropdown-header"
      className="flex items-center gap-1.5 border-b border-border px-2 py-1.5"
    >
      <button
        type="button"
        aria-label={
          isDateEntry
            ? `Back to ${activeLabel} options`
            : "Back to filter categories"
        }
        className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onBack}
      >
        <ChevronLeftIcon className="size-3.5" />
      </button>
      <span className="text-xs font-medium text-muted-foreground">
        {activeLabel}
      </span>
    </div>
  );
}
