import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { FilterTokens } from '../components/filter-tokens';
import React from 'react';

const filters = {
  status: {
    type: 'select' as const,
    label: 'Status',
    options: [
      { value: 'success', label: 'Success' },
      { value: 'error', label: 'Error' },
      { value: 'pending', label: 'Pending' },
    ],
  },
  tags: {
    type: 'select' as const,
    label: 'Tags',
    multi: true,
    options: [
      { value: 'bug', label: 'Bug' },
      { value: 'feature', label: 'Feature' },
      { value: 'docs', label: 'Documentation' },
    ],
  },
  period: {
    type: 'date' as const,
    label: 'Period',
    range: true,
    time: true,
    presets: [
      { label: 'Last hour', from: () => new Date(Date.now() - 3600000), to: () => new Date() },
      { label: 'Last 24h', from: () => new Date(Date.now() - 86400000) },
    ],
  },
  search: {
    type: 'text' as const,
    label: 'Search',
  },
  amount: {
    type: 'number' as const,
    label: 'Amount',
    unit: '€',
  },
} as const;

function Setup({ initialValue = {} }: { initialValue?: Record<string, unknown> } = {}) {
  const [value, setValue] = React.useState(initialValue);
  return (
    <>
      <FilterTokens
        filters={filters}
        value={value as any}
        onChange={setValue as any}
        placeholder="Filter..."
      />
      <div data-testid="value">{JSON.stringify(value)}</div>
    </>
  );
}

function getValue() {
  return JSON.parse(screen.getByTestId('value').textContent || '{}');
}

// ── Rendering ───────────────────────────────────

describe('FilterTokens rendering', () => {
  it('renders trigger with placeholder when empty', () => {
    render(<Setup />);
    expect(screen.getByRole('button', { name: 'Filter...' })).toBeInTheDocument();
  });

  it('renders tokens from initial value', () => {
    render(<Setup initialValue={{ status: 'error' }} />);
    expect(screen.getByLabelText('Remove Status: Error')).toBeInTheDocument();
  });

  it('renders multi-select as combined token', () => {
    render(<Setup initialValue={{ tags: ['bug', 'feature'] }} />);
    expect(screen.getByLabelText('Remove Tags: Bug, Feature')).toBeInTheDocument();
  });

  it('keeps a trailing "Filter..." hint visible when tokens exist', () => {
    render(<Setup initialValue={{ status: 'error' }} />);
    const placeholder = document.querySelector('[data-slot="filter-tokens-placeholder"]');
    expect(placeholder).not.toBeNull();
    expect(placeholder?.textContent).toBe('Filter...');
  });

  it('renders clear all button when tokens exist', () => {
    render(<Setup initialValue={{ status: 'error' }} />);
    expect(screen.getByLabelText('Clear all filters')).toBeInTheDocument();
  });

  it('does not render clear all when empty', () => {
    render(<Setup />);
    expect(screen.queryByLabelText('Clear all filters')).not.toBeInTheDocument();
  });

  it('renders date token with preset label', () => {
    render(<Setup initialValue={{ period: { from: '2026-04-13T00:00:00Z' } }} />);
    expect(screen.getByText('Period:')).toBeInTheDocument();
  });

  it('renders text token', () => {
    render(<Setup initialValue={{ search: 'timeout' }} />);
    expect(screen.getByLabelText('Remove Search: timeout')).toBeInTheDocument();
  });
});

// ── Opening / Closing ───────────────────────────

describe('FilterTokens popover', () => {
  it('opens categories on trigger click', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Period')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('shows search input inside popover', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    expect(screen.getByLabelText('Search filters...')).toBeInTheDocument();
  });
});

// ── Single Select Flow ──────────────────────────

describe('FilterTokens single select', () => {
  it('shows values after clicking a category', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('Status'));
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('creates token on value selection and returns to categories', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('Status'));
    await user.click(screen.getByText('Error'));

    expect(screen.getByLabelText('Remove Status: Error')).toBeInTheDocument();
    expect(getValue()).toEqual({ status: 'error' });
    // Should return to categories
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('shows selected state on re-click', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ status: 'error' }} />);
    await user.click(screen.getByLabelText('Status: Error. Click to edit.'));
    const errorOption = screen.getByRole('option', { name: /Error/ });
    expect(errorOption).toHaveAttribute('data-selected', 'true');
  });

  it('replaces value on different selection', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ status: 'error' }} />);
    await user.click(screen.getByLabelText('Status: Error. Click to edit.'));
    await user.click(screen.getByText('Success'));
    expect(getValue()).toEqual({ status: 'success' });
  });
});

// ── Multi Select Flow ───────────────────────────

describe('FilterTokens multi select', () => {
  it('creates combined token and stays open', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('Tags'));
    await user.click(screen.getByText('Bug'));
    await user.click(screen.getByText('Feature'));

    expect(getValue().tags).toBeDefined();
    // Should still be in Tags values mode (stays open for multi)
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  it('toggles value off', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ tags: ['bug', 'feature'] }} />);
    await user.click(screen.getByLabelText('Tags: Bug, Feature. Click to edit.'));
    // Uncheck Bug
    await user.click(screen.getByText('Bug'));
    expect(getValue()).toEqual({ tags: ['feature'] });
  });

  it('removes token when last value toggled off', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ tags: ['bug'] }} />);
    await user.click(screen.getByLabelText('Tags: Bug. Click to edit.'));
    await user.click(screen.getByRole('option', { name: /Bug/ }));
    expect(getValue()).toEqual({});
  });
});

// ── Text Entry Flow ─────────────────────────────

describe('FilterTokens text entry', () => {
  it('creates token on Enter', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('Search'));
    await user.type(screen.getByLabelText('Type Search...'), 'timeout{Enter}');
    expect(getValue()).toEqual({ search: 'timeout' });
  });

  it('pre-fills current value on pill re-click', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ search: 'timeout' }} />);
    await user.click(screen.getByLabelText('Search: timeout. Click to edit.'));
    const input = screen.getByLabelText('Type Search...');
    expect(input).toHaveValue('timeout');
  });
});

// ── Date Preset Flow ────────────────────────────

describe('FilterTokens date presets', () => {
  it('shows presets and Custom range item', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('Period'));
    expect(screen.getByText('Last hour')).toBeInTheDocument();
    expect(screen.getByText('Last 24h')).toBeInTheDocument();
    expect(screen.getByText('Custom range...')).toBeInTheDocument();
  });

  it('creates token with preset label on selection', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('Period'));
    await user.click(screen.getByText('Last 24h'));
    expect(getValue().period).toBeDefined();
    expect(getValue().period.from).toBeDefined();
    // Token should show the preset label
    expect(screen.getByLabelText(/Remove Period: Last 24h/)).toBeInTheDocument();
  });

  it('opens calendar directly when re-clicking custom date pill', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ period: { from: '2026-04-05T00:00:00Z', to: '2026-04-15T23:59:59Z' } }} />);
    await user.click(screen.getByText('Period:').closest('[role="button"]')!);
    // Should go directly to calendar (date-entry + auto-calendar), not presets
    expect(screen.getByLabelText('Start date and time')).toBeInTheDocument();
  });

  it('applies "since X" range with only start date set', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('Period'));
    await user.click(screen.getByText('Custom range...'));
    // Type only the Start date — leave End empty
    const startInput = screen.getByLabelText('Start date and time');
    await user.clear(startInput);
    await user.type(startInput, '04/15/2026');
    // Tab away to commit the input (handleBlur parses)
    await user.tab();
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    const period = getValue().period;
    expect(period.from).toBeDefined();
    expect(period.to).toBeUndefined();
  });

  it('shows presets when re-clicking preset date pill', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('Period'));
    await user.click(screen.getByText('Last 24h'));
    // Now re-click the Period pill (has preset label)
    await user.click(screen.getByText('Period:').closest('[role="button"]')!);
    expect(screen.getByText('Last hour')).toBeInTheDocument();
    expect(screen.getByText('Custom range...')).toBeInTheDocument();
  });
});

// ── Search Filtering ────────────────────────────

describe('FilterTokens search', () => {
  it('filters categories by text', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.type(screen.getByLabelText('Search filters...'), 'sta');
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    expect(screen.queryByText('Period')).not.toBeInTheDocument();
  });

  it('shows no results for unmatched search', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.type(screen.getByLabelText('Search filters...'), 'zzzzz');
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });
});

// ── Token Management ────────────────────────────

describe('FilterTokens token management', () => {
  it('removes individual token on x click', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ status: 'error', search: 'test' }} />);
    await user.click(screen.getByLabelText('Remove Status: Error'));
    expect(getValue()).toEqual({ search: 'test' });
  });

  it('clears all tokens', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ status: 'error', search: 'test' }} />);
    await user.click(screen.getByLabelText('Clear all filters'));
    expect(getValue()).toEqual({});
  });
});

// ── Disabled State ──────────────────────────────

describe('FilterTokens disabled', () => {
  it('prevents opening when disabled', () => {
    render(
      <FilterTokens
        filters={filters}
        value={{}}
        onChange={() => {}}
        disabled
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Filter...' });
    expect(trigger).toHaveAttribute('tabindex', '-1');
  });
});

// ── Back Navigation ─────────────────────────────

describe('FilterTokens back button', () => {
  it('shows back button in values mode', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('Status'));
    expect(screen.getByLabelText('Back to filter categories')).toBeInTheDocument();
  });

  it('goes back to categories on back button click', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('Status'));
    await user.click(screen.getByLabelText('Back to filter categories'));
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Period')).toBeInTheDocument();
  });
});

// ── ARIA attributes ───────────────────────────

describe('FilterTokens ARIA', () => {
  it('sets aria-multiselectable on listbox in multi-select mode', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('Tags'));
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
  });

  it('does not set aria-multiselectable in single-select mode', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('Status'));
    const listbox = screen.getByRole('listbox');
    expect(listbox).not.toHaveAttribute('aria-multiselectable');
  });
});

// ── Async Loading ─────────────────────────────

describe('FilterTokens async loading', () => {
  const asyncFilters = {
    city: {
      type: 'select' as const,
      label: 'City',
      options: () =>
        new Promise<{ value: string; label: string }[]>((resolve) =>
          setTimeout(() => resolve([
            { value: 'nyc', label: 'New York' },
            { value: 'la', label: 'Los Angeles' },
          ]), 10),
        ),
    },
  } as const;

  function AsyncSetup() {
    const [value, setValue] = React.useState({});
    return (
      <FilterTokens
        filters={asyncFilters}
        value={value as any}
        onChange={setValue as any}
        placeholder="Filter..."
      />
    );
  }

  it('shows loading spinner while async options load', async () => {
    const user = userEvent.setup();
    render(<AsyncSetup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('City'));
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('No results found')).not.toBeInTheDocument();
  });

  it('shows options after async resolution', async () => {
    const user = userEvent.setup();
    render(<AsyncSetup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('City'));
    await screen.findByText('New York');
    expect(screen.getByText('Los Angeles')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

// ── Number Entry Flow ─────────────────────────

describe('FilterTokens number entry', () => {
  it('shows min/max inputs when clicking a number category', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('Amount'));
    expect(screen.getByLabelText(/Minimum value/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Maximum value/)).toBeInTheDocument();
  });

  it('creates token on Apply with min and max', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('Amount'));
    await user.type(screen.getByLabelText(/Minimum value/), '10');
    await user.type(screen.getByLabelText(/Maximum value/), '500');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(getValue()).toEqual({ amount: { min: 10, max: 500 } });
  });

  it('creates token with min only', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('Amount'));
    await user.type(screen.getByLabelText(/Minimum value/), '25');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(getValue()).toEqual({ amount: { min: 25 } });
  });

  it('renders number token with unit', () => {
    render(<Setup initialValue={{ amount: { min: 5, max: 100 } }} />);
    expect(screen.getByLabelText('Remove Amount: 5–100€')).toBeInTheDocument();
  });

  it('Cancel discards entry without committing', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('button', { name: 'Filter...' }));
    await user.click(screen.getByText('Amount'));
    await user.type(screen.getByLabelText(/Minimum value/), '42');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(getValue()).toEqual({});
  });
});
