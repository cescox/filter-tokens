# Filter Tokens

A tokenized filter input for React. Type or click to add filters — each appears as a removable token inside the input.

Inspired by the filter bars in GitHub, Vercel, Linear, and Datadog.

```
┌──────────────────────────────────────────────────────────────┐
│ Status Error ×  Tags Bug ×  Tags Feature ×  | Filter...   × │
└──────────────────────────────────────────────────────────────┘
```

## Install

### For shadcn projects

Pick the variant that matches your `components.json` `style`:

```bash
# Radix UI — styles: new-york, default, radix-* (most existing shadcn projects)
npx shadcn@latest add https://cescox.pages.dev/r/filter-tokens.json

# Base UI — styles: base-* (newer shadcn CLI default)
npx shadcn@latest add https://cescox.pages.dev/r/filter-tokens-base.json
```

Either command copies the component source into `components/filter-tokens.tsx`, uses your existing `button` and `calendar` shadcn primitives, and installs the `filter-tokens` npm package (for the headless hook).

### For non-shadcn projects (standalone)

```bash
pnpm add filter-tokens @radix-ui/react-popover react-day-picker date-fns lucide-react clsx tailwind-merge
```

```tsx
import { FilterTokens } from "filter-tokens/components/filter-tokens";
import type { FilterValues } from "filter-tokens";
```

Requires Tailwind v4 and the shadcn CSS variables (`--popover`, `--border`, `--primary`, etc.) defined in your global stylesheet — copy them from the [shadcn theming docs](https://ui.shadcn.com/docs/theming).

### Headless hook only

For custom UI with your own components:

```bash
pnpm add filter-tokens
```

```tsx
import { useFilterTokens } from "filter-tokens";
```

See the [Headless Hook](#headless-hook) section below.

## Quick Start

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
      { value: "inactive", label: "Inactive" },
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
  search: {
    type: "text",
    label: "Search",
  },
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

## Filter Types

| Type | Description | Value shape |
|------|-------------|-------------|
| `select` | Single or multi-select from options | `string` or `string[]` |
| `date` | Date with presets and/or custom range | `{ date: string }` or `{ from: string, to?: string }` |
| `text` | Free text, confirmed with Enter | `string` |
| `number` | Numeric range with min/max inputs | `{ min?: number, max?: number }` |

### Select

```tsx
{
  type: "select",
  label: "Status",
  icon: CircleIcon,        // optional, from lucide-react
  multi: true,             // default: false
  options: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ],
}
```

Options can also be a sync function or async function:

```tsx
options: ({ filters }) => fetchOptions(filters.country)
```

### Date

```tsx
{
  type: "date",
  label: "Period",
  range: true,             // date range (from–to)
  time: true,              // include time
  presets: [
    { label: "Last 24h", from: () => new Date(Date.now() - 86400000) },
    { label: "Last 7 days", from: () => new Date(Date.now() - 604800000) },
  ],
}
```

Single date presets use `date` instead of `from`:

```tsx
presets: [
  { label: "Today", date: () => new Date() },
]
```

### Text

```tsx
{
  type: "text",
  label: "Search",
  placeholder: "Search logs...",
}
```

### Number

```tsx
{
  type: "number",
  label: "Amount",
  unit: "€",               // optional, shown after inputs and in token
  min: 0,                  // optional, passed to input
  max: 10000,              // optional, passed to input
}
```

## Locale

Pass a date-fns locale to localize the calendar, date inputs, and token display:

```tsx
import { fr } from "date-fns/locale";

<FilterTokens
  filters={filters}
  value={value}
  onChange={setValue}
  dateLocale={fr}
/>
```

## Headless Hook

For custom UI, use the hook directly:

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
          {ft.dropdown.loading && <li>Loading...</li>}
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

## Customization

The component uses shadcn CSS variables for theming and `data-slot` attributes on every element for targeted styling:

```tsx
<FilterTokens
  className="[&_[data-slot=filter-tokens-token]]:bg-blue-100"
  filters={filters}
  value={value}
  onChange={setValue}
/>
```

Available slots: `filter-tokens`, `filter-tokens-trigger`, `filter-tokens-token`, `filter-tokens-token-label`, `filter-tokens-token-value`, `filter-tokens-token-remove`, `filter-tokens-clear`, `filter-tokens-search`, `filter-tokens-dropdown`, `filter-tokens-dropdown-header`, `filter-tokens-dropdown-item`, `filter-tokens-loading`, `filter-tokens-empty`, `filter-tokens-calendar`, `filter-tokens-number`, `filter-tokens-date-input`.

State attributes: `data-highlighted`, `data-selected`, `data-category`, `data-type`, `data-disabled`, `data-state`.

## TypeScript

Filter values are fully inferred from the schema via `const` generics:

```tsx
const filters = {
  status: {
    type: "select",
    label: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "error", label: "Error" },
    ],
  },
} as const;

// value.status is typed as "active" | "error" | undefined
```

## License

MIT
