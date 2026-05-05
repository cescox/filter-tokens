"use client";

import { CalendarIcon, CheckIcon } from "lucide-react";
import { cn } from "filter-tokens/lib/utils";

export interface ItemIndicatorProps {
  item: { key: string; type: string; selected: boolean };
  isMultiSelect: boolean;
}

export function ItemIndicator({ item, isMultiSelect }: ItemIndicatorProps) {
  if (item.key === "__custom_date__") {
    return <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />;
  }

  if (item.type !== "value") return null;

  if (isMultiSelect) {
    return (
      <div
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
          item.selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input",
        )}
      >
        {item.selected && <CheckIcon className="size-3" />}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
        item.selected ? "border-primary" : "border-input",
      )}
    >
      {item.selected && <div className="size-2 rounded-full bg-primary" />}
    </div>
  );
}
