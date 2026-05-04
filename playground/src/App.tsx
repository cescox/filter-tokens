import { useState } from 'react';
import type { FilterValues } from 'filter-tokens';
import { FilterTokens } from 'filter-tokens/components/filter-tokens';
import {
  Calendar,
  CalendarClock,
  CalendarRange,
  CircleDot,
  Clock,
  CreditCard,
  DollarSign,
  Search,
} from 'lucide-react';

/* ─── Filter schema ───────────────────────────────────────────────────────── */

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const filters = {
  status: {
    type: 'select' as const,
    label: 'Status',
    icon: CircleDot,
    options: [
      { value: 'succeeded', label: 'Succeeded' },
      { value: 'failed', label: 'Failed' },
      { value: 'pending', label: 'Pending' },
      { value: 'refunded', label: 'Refunded' },
      { value: 'disputed', label: 'Disputed' },
    ],
  },
  method: {
    type: 'select' as const,
    label: 'Method',
    icon: CreditCard,
    multi: true,
    options: [
      { value: 'visa', label: 'Visa' },
      { value: 'mastercard', label: 'Mastercard' },
      { value: 'amex', label: 'Amex' },
      { value: 'apple-pay', label: 'Apple Pay' },
      { value: 'bank-transfer', label: 'Bank transfer' },
    ],
  },
  created: {
    type: 'date' as const,
    label: 'Created',
    icon: CalendarRange,
    range: true,
    presets: [
      { label: 'Last 24 hours', from: () => new Date(Date.now() - 86_400_000) },
      { label: 'Last 7 days', from: () => new Date(Date.now() - 7 * 86_400_000) },
      { label: 'Last 30 days', from: () => new Date(Date.now() - 30 * 86_400_000) },
    ],
  },
  settlement: {
    type: 'date' as const,
    label: 'Settlement',
    icon: Calendar,
    presets: [
      { label: 'Today', date: () => startOfToday() },
      {
        label: 'Tomorrow',
        date: () => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          d.setHours(0, 0, 0, 0);
          return d;
        },
      },
    ],
  },
  captured: {
    type: 'date' as const,
    label: 'Captured',
    icon: CalendarClock,
    time: true,
    presets: [
      {
        label: 'End of today',
        date: () => {
          const d = new Date();
          d.setHours(23, 59, 59, 999);
          return d;
        },
      },
      {
        label: 'End of yesterday',
        date: () => {
          const d = new Date(Date.now() - 86_400_000);
          d.setHours(23, 59, 59, 999);
          return d;
        },
      },
    ],
  },
  refunded: {
    type: 'date' as const,
    label: 'Refunded',
    icon: Clock,
    range: true,
    time: true,
    presets: [
      {
        label: 'Last hour',
        from: () => new Date(Date.now() - 3_600_000),
        to: () => new Date(),
      },
      { label: 'Last 24 hours', from: () => new Date(Date.now() - 86_400_000) },
      { label: 'Last 7 days', from: () => new Date(Date.now() - 7 * 86_400_000) },
    ],
  },
  customer: {
    type: 'text' as const,
    label: 'Customer',
    icon: Search,
    placeholder: 'Search by name or email...',
  },
  amount: {
    type: 'number' as const,
    label: 'Amount',
    icon: DollarSign,
    unit: '€',
    min: 0,
    max: 10000,
  },
} as const;

type Filters = typeof filters;

/* ─── App ─────────────────────────────────────────────────────────────────── */

export function App() {
  const [value, setValue] = useState<FilterValues<Filters>>({});

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-2xl font-bold">Filter Tokens</h1>
      <p className="mb-6 text-muted-foreground">
        A composable filter bar for React. Built with shadcn/ui.
      </p>

      <FilterTokens
        filters={filters}
        value={value}
        onChange={setValue}
        placeholder="Filter transactions..."
      />

      <div className="mt-4 rounded-lg border bg-muted/50 p-4">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Current value</h2>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(value, null, 2) || '{}'}
        </pre>
      </div>
    </div>
  );
}
