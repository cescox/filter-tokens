# filter-tokens

GitHub-style filter input for React, with visual chips. Type or click to add filters — each appears as a removable token inside the input.

```
┌──────────────────────────────────────────────────────────────────┐
│  Status: Error ×   Tags: Bug, Feature ×   Period: Last 24h ×  ⌫ │
└──────────────────────────────────────────────────────────────────┘
```

- Schema-driven: declare your filter shape, get fully-typed values
- Four filter types: `select` (single & multi), `date` (with presets, range, time), `number` (min/max), `text`
- Async option loading with cancellation, retry, and error surface
- Headless hook OR pre-built shadcn component — pick your level of control
- ~2.4 kB brotlied (hook only, excluding peer deps)
- Tailwind v4, React 18+, full keyboard nav, ARIA combobox

## Two ways to use it

| | Hook (`filter-tokens` on npm) | Component (shadcn registry) |
|---|---|---|
| **Get** | `pnpm add filter-tokens` | `npx shadcn add ...` (copies source) |
| **You write** | UI from scratch with the headless API | Nothing — get a styled component |
| **You own** | Your component | The component source in your repo |
| **Best for** | Custom design systems, non-Tailwind stacks, full control over markup | Most apps, especially shadcn projects |
| **Bundle cost** | ~2.4 kB brotlied | + your existing shadcn primitives |

The hook drives both. The component is just one consumer.

## Install

### shadcn projects (most common)

Pick the variant that matches your `components.json` `style`:

```bash
# Radix UI (styles: new-york, default — most existing shadcn projects)
npx shadcn@latest add https://cescox.pages.dev/r/filter-tokens.json

# Base UI (styles: base-* — newer shadcn CLI default)
npx shadcn@latest add https://cescox.pages.dev/r/filter-tokens-base.json
```

This copies the component into `components/filter-tokens.tsx`, uses your existing `button` and `calendar` shadcn primitives, and installs the `filter-tokens` npm package for the headless hook underneath.

### Standalone (non-shadcn)

```bash
pnpm add filter-tokens @radix-ui/react-popover react-day-picker date-fns lucide-react clsx tailwind-merge
```

```tsx
import { FilterTokens } from "filter-tokens/components/filter-tokens";
```

Requires Tailwind v4 and the shadcn CSS variables (`--popover`, `--border`, `--primary`, etc.) defined in your global stylesheet — copy them from the [shadcn theming docs](https://ui.shadcn.com/docs/theming).

### Hook only

For a fully custom UI:

```bash
pnpm add filter-tokens
```

```tsx
import { useFilterTokens } from "filter-tokens";
```

See [Headless hook](#headless-hook).

## Quick start

```tsx
import { useState } from "react";
import { FilterTokens } from "@/components/filter-tokens";
import type { FilterValues } from "filter-tokens";

const filters = {
  status: {
    type: "select",
    label: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "error", label: "Error" },
    ],
  },
  tags: {
    type: "select",
    label: "Tags",
    multi: true,
    options: [
      { value: "bug", label: "Bug" },
      { value: "feature", label: "Feature" },
    ],
  },
  search: { type: "text", label: "Search" },
} as const;

export function MyFilters() {
  const [value, setValue] = useState<FilterValues<typeof filters>>({});

  return (
    <FilterTokens
      filters={filters}
      value={value}
      onChange={setValue}
      placeholder="Filter..."
    />
  );
}
```

`value` is fully inferred from the `filters` schema — `value.status` is typed as `"active" | "error" | undefined`, `value.tags` as `("bug" | "feature")[] | undefined`.

## Filter types

| Type | Description | Value shape |
|---|---|---|
| `select` | Single or multi-select from options | `string` or `string[]` |
| `date` | Date with presets, ranges, time | `{ date: string }` or `{ from: string, to?: string }` |
| `text` | Free text, confirmed with Enter | `string` |
| `number` | Numeric range with min/max inputs | `{ min?: number, max?: number }` |

### Select

```tsx
{
  type: "select",
  label: "Status",
  icon: CircleIcon,        // optional (from lucide-react)
  multi: true,             // default: false
  options: [
    { value: "active", label: "Active" },
    { value: "error", label: "Error" },
  ],
}
```

Options can be a static array, a sync function, or an async function:

```tsx
// Async — loading spinner + retry-on-error UI built in
options: ({ filters }) => fetchOptions(filters.country)
```

When the async function rejects, the dropdown shows a "Failed to load options" message with a Retry button. Stale resolutions (from rapid category switching) are discarded automatically.

### Date

```tsx
{
  type: "date",
  label: "Period",
  range: true,             // date range (from–to)
  time: true,              // include time inputs
  presets: [
    { label: "Last 24h", from: () => new Date(Date.now() - 86400000) },
    { label: "Last 7 days", from: () => new Date(Date.now() - 604800000) },
  ],
}
```

Single-date presets use `date` instead of `from`:

```tsx
presets: [
  { label: "Today", date: () => new Date() },
]
```

Range filters support partial bounds. From "Custom range...", users can fill:

- **Both** start and end → `{ from, to }`, token displays as `Apr 15 – Apr 20`
- **Start only** → `{ from }`, token displays as `Since Apr 15` (open-ended upper bound)
- **End only** → `{ to }`, token displays as `Until Apr 20` (open-ended lower bound)

This matches GitHub issue search, Datadog, and Linear conventions. Consumers should treat missing `from` as "no lower bound" and missing `to` as "no upper bound."

### Text

```tsx
{ type: "text", label: "Search", placeholder: "Search logs..." }
```

### Number

```tsx
{
  type: "number",
  label: "Amount",
  unit: "€",               // shown after inputs and in token
  min: 0,                  // optional, hint for the input
  max: 10000,
}
```

The token renders as `5–100€`, `≥5€`, or `≤100€` depending on which bounds are filled.

## Locale

Pass a date-fns locale to localize the calendar, date inputs, and token display:

```tsx
import { fr } from "date-fns/locale";

<FilterTokens filters={filters} value={value} onChange={setValue} dateLocale={fr} />
```

## Headless hook

For custom UI:

```tsx
import { useFilterTokens } from "filter-tokens";

function MyCustomFilter() {
  const ft = useFilterTokens({
    filters: { /* schema */ },
    value,
    onChange: setValue,
  });

  return (
    <div>
      {ft.tokens.map(token => (
        <span key={token.id}>
          {token.label}: {token.displayValue}
          <button onClick={token.remove}>×</button>
        </span>
      ))}
      <input {...ft.inputProps} />
      {ft.dropdown.open && (
        <ul>
          {ft.dropdown.loading && <li>Loading…</li>}
          {ft.dropdown.error && (
            <li>
              Failed to load — <button onClick={ft.dropdown.retry}>Retry</button>
            </li>
          )}
          {ft.dropdown.items.map(item => (
            <li key={item.key} onClick={() => ft.dropdown.select(item)}>
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

The hook handles tokens, dropdown navigation, search, async option loading with cancellation, keyboard nav (Arrows, Home/End, Enter, Escape, Backspace), date/number entry modes, and ARIA combobox attributes. The component just renders.

## Customization

The component uses shadcn CSS variables for theming and `data-slot` attributes on every element for targeted styling:

```tsx
<FilterTokens
  className="**:data-[slot=filter-tokens-token]:bg-blue-100"
  filters={filters}
  value={value}
  onChange={setValue}
/>
```

Available slots: `filter-tokens`, `filter-tokens-trigger`, `filter-tokens-token`, `filter-tokens-token-label`, `filter-tokens-token-value`, `filter-tokens-token-remove`, `filter-tokens-placeholder`, `filter-tokens-clear`, `filter-tokens-search`, `filter-tokens-dropdown`, `filter-tokens-dropdown-header`, `filter-tokens-dropdown-item`, `filter-tokens-loading`, `filter-tokens-error`, `filter-tokens-empty`, `filter-tokens-calendar`, `filter-tokens-number`, `filter-tokens-date-input`.

State attributes: `data-highlighted`, `data-selected`, `data-category`, `data-type`, `data-disabled`, `data-state`.

## SSR / Next.js App Router

The component and hook are client-only — both ship with the `"use client"` directive. Place them inside a client boundary in App Router projects. No special configuration needed.

## vs alternatives

- **vs `bazza/ui`'s `data-table-filter`** — that lives in a table header. filter-tokens is unbounded: it's a standalone input you can drop above any view (list, board, map, log stream).
- **vs Radix Combobox / cmdk** — those are command/menu primitives. filter-tokens is a filter primitive: schema-driven, multi-step (categories → values), with date and number entry built in.
- **vs `react-select` + your own chip rendering** — you'd reinvent the dropdown nav, the schema typing, the date and number panels, the async cancellation, and the keyboard model. filter-tokens is the assembled answer.

## Browser support

Chromium (Chrome/Edge), Firefox, Safari — current and previous major versions. Requires React 18 or 19 and Tailwind v4.

## TypeScript

Filter values are fully inferred from the schema via `const` generics — pass your schema with `as const` and `FilterValues<typeof schema>` gives you a precise typed value bag. No string-typed escape hatches needed.

## License

MIT
