# Filter Tokens

A tokenized filter input for React. Type or click to add filters — each appears as a removable token inside the input.

Inspired by the filter bars in Vercel, Linear, and Datadog.

```
┌──────────────────────────────────────────────────────────────┐
│ Status Error ×  Tags Bug ×  Tags Feature ×  | Filter...   × │
└──────────────────────────────────────────────────────────────┘
```

## Install

The **npm package** gives you the headless hook. The **shadcn registry** gives you the pre-built component.

```bash
# Hook (headless, zero dependencies)
pnpm add filter-tokens

# Component (shadcn-styled, uses the hook)
npx shadcn@latest add https://filter-tokens.pages.dev/r/filter-tokens.json
```

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
| `date` | Date with presets and/or custom range | `{ preset }` or `{ date }` or `{ from, to }` |
| `text` | Free text, confirmed with Enter | `string` |
| `number` | Numeric range (types only in v1) | `{ min?, max? }` |

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
    { value: "24h", label: "Last 24h" },
    { value: "7d", label: "Last 7 days" },
  ],
}
```

### Text

```tsx
{
  type: "text",
  label: "Search",
  placeholder: "Search logs...",
}
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
      <input {...ft.inputProps} ref={ft.inputProps.ref} />
      {ft.dropdown.open && (
        <ul>
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

Available slots: `filter-tokens`, `filter-tokens-input-wrapper`, `filter-tokens-token`, `filter-tokens-token-label`, `filter-tokens-token-value`, `filter-tokens-token-remove`, `filter-tokens-input`, `filter-tokens-clear`, `filter-tokens-dropdown`, `filter-tokens-dropdown-item`, `filter-tokens-dropdown-header`, `filter-tokens-date-panel`.

State attributes: `data-highlighted`, `data-selected`, `data-category`, `data-type`, `data-disabled`.

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
