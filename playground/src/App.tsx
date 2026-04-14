import { useState } from 'react';
import { FilterTokens, type FilterValues } from 'filter-tokens';
import { CircleDot, Calendar, Search, Tags, Clock } from 'lucide-react';

const filters = {
  status: {
    type: 'select' as const,
    label: 'Status',
    icon: CircleDot,
    options: [
      { value: 'success', label: 'Success' },
      { value: 'error', label: 'Error' },
      { value: 'pending', label: 'Pending' },
      { value: 'warning', label: 'Warning' },
    ],
  },
  tags: {
    type: 'select' as const,
    label: 'Tags',
    icon: Tags,
    multi: true,
    options: [
      { value: 'bug', label: 'Bug' },
      { value: 'feature', label: 'Feature' },
      { value: 'docs', label: 'Documentation' },
      { value: 'refactor', label: 'Refactor' },
      { value: 'test', label: 'Test' },
    ],
  },
  period: {
    type: 'date' as const,
    label: 'Period',
    icon: Calendar,
    range: true,
    time: true,
    presets: [
      { value: '1h', label: 'Last hour' },
      { value: '24h', label: '24 hours' },
      { value: '7d', label: '7 days' },
      { value: '30d', label: '30 days' },
    ],
  },
  created: {
    type: 'date' as const,
    label: 'Created',
    icon: Clock,
    presets: [
      { value: 'today', label: 'Today' },
      { value: 'yesterday', label: 'Yesterday' },
      { value: 'this-week', label: 'This week' },
    ],
  },
  search: {
    type: 'text' as const,
    label: 'Search',
    icon: Search,
    placeholder: 'Search logs...',
  },
} as const;

type Filters = typeof filters;

export function App() {
  const [value, setValue] = useState<FilterValues<Filters>>({});

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-2 text-2xl font-bold">Filter Tokens</h1>
      <p className="mb-6 text-muted-foreground">
        A tokenized filter input component for React.
      </p>

      <FilterTokens
        filters={filters}
        value={value}
        onChange={setValue}
        placeholder="Filter logs..."
      />

      <div className="mt-8 rounded-md border bg-muted/50 p-4">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Current value</h2>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(value, null, 2) || '{}'}
        </pre>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          className="rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent"
          onClick={() => setValue({ status: 'error' } as FilterValues<Filters>)}
        >
          Set status=error
        </button>
        <button
          className="rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent"
          onClick={() => setValue({ tags: ['bug', 'feature'] } as FilterValues<Filters>)}
        >
          Set tags
        </button>
        <button
          className="rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent"
          onClick={() => setValue({})}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
