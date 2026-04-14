import { useState } from 'react';
import type { FilterValues } from 'filter-tokens';
import { FilterTokens } from '../../registry/new-york/filter-tokens/filter-tokens';
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
      { label: 'Last hour', from: () => new Date(Date.now() - 3600000), to: () => new Date() },
      { label: 'Last 24h', from: () => new Date(Date.now() - 86400000) },
      { label: 'Last 7 days', from: () => new Date(Date.now() - 7 * 86400000) },
      { label: 'Last 30 days', from: () => new Date(Date.now() - 30 * 86400000) },
    ],
  },
  created: {
    type: 'date' as const,
    label: 'Created',
    icon: Clock,
    presets: [
      { label: 'Today', date: () => new Date(new Date().setHours(0, 0, 0, 0)) },
      { label: 'Yesterday', date: () => new Date(new Date(Date.now() - 86400000).setHours(0, 0, 0, 0)) },
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
