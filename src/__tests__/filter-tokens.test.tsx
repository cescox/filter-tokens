import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { FilterTokens } from '../components/filter-tokens';
import React from 'react';

// Pattern A focus management runs in requestAnimationFrame so the chip-remove
// re-render commits before we move focus. Tests need to wait for that frame
// AND wrap the resulting state updates (handleFocus → openCategories) in act.
async function flushFocus() {
  await act(async () => {
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
  });
}

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

function getInput() {
  return screen.getByRole('combobox') as HTMLInputElement;
}

// ── Rendering ───────────────────────────────────

describe('FilterTokens rendering', () => {
  it('renders trigger with placeholder when empty', () => {
    render(<Setup />);
    expect(getInput()).toBeInTheDocument();
  });

  it('renders tokens from initial value', () => {
    render(<Setup initialValue={{ status: 'error' }} />);
    expect(screen.getByLabelText('Remove Status: Error')).toBeInTheDocument();
  });

  it('renders multi-select as combined token', () => {
    render(<Setup initialValue={{ tags: ['bug', 'feature'] }} />);
    expect(screen.getByLabelText('Remove Tags: Bug, Feature')).toBeInTheDocument();
  });

  it('keeps "Filter..." input placeholder visible when tokens exist', () => {
    render(<Setup initialValue={{ status: 'error' }} />);
    // Pattern A: the bordered wrapper hosts a real <input> as a flex sibling
    // to the chips. The input's placeholder serves as the visual hint —
    // there's no separate placeholder span anymore.
    expect(getInput()).toHaveAttribute('placeholder', 'Filter...');
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
    await user.click(getInput());
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Period')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('exposes a single combobox — the outer input — not a separate search input inside the popover', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
    // Pattern A: the input is on the bordered wrapper, not duplicated inside
    // the popover. There must be exactly one combobox.
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });
});

// ── Pattern A trigger ───────────────────────────

describe('FilterTokens Pattern A trigger', () => {
  it('focuses the input when clicking empty wrapper space (not on a chip)', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ status: 'error' }} />);
    const wrapper = document.querySelector(
      '[data-slot="filter-tokens-trigger"]',
    ) as HTMLElement;
    expect(wrapper).not.toBeNull();
    // Click somewhere on the wrapper that isn't a chip / clear / input —
    // the wrapper itself is fine since chips have their own bounding box.
    await user.click(wrapper);
    expect(getInput()).toHaveFocus();
  });

  it('moves focus to the next chip after removing a middle chip', async () => {
    const user = userEvent.setup();
    render(
      <Setup initialValue={{ status: 'error', tags: ['bug'], search: 'x' }} />,
    );
    // Three tokens; remove the middle one (Tags). Focus should land on
    // the chip that's now at the same index — the Search chip.
    await user.click(screen.getByLabelText('Remove Tags: Bug'));
    await flushFocus();
    expect(screen.getByLabelText('Search: x')).toHaveFocus();
  });

  it('falls back to the input when removing the last chip', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ status: 'error' }} />);
    await user.click(screen.getByLabelText('Remove Status: Error'));
    await flushFocus();
    expect(getInput()).toHaveFocus();
  });

  it('ArrowLeft from an empty input focuses the last chip', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ status: 'error', tags: ['bug'] }} />);
    const input = getInput();
    await act(async () => {
      input.focus();
    });
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByLabelText('Tags: Bug')).toHaveFocus();
  });

  it('ArrowLeft / ArrowRight navigate between chips, ArrowRight from last returns to input', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ status: 'error', tags: ['bug'] }} />);
    const input = getInput();
    await act(async () => { input.focus(); });
    await user.keyboard('{ArrowLeft}'); // → last chip (Tags)
    expect(screen.getByLabelText('Tags: Bug')).toHaveFocus();
    await user.keyboard('{ArrowLeft}'); // → previous chip (Status)
    expect(
      screen.getByLabelText('Status: Error'),
    ).toHaveFocus();
    await user.keyboard('{ArrowRight}'); // → next chip (Tags)
    expect(screen.getByLabelText('Tags: Bug')).toHaveFocus();
    await user.keyboard('{ArrowRight}'); // → input (last chip → input)
    expect(input).toHaveFocus();
  });

  it('Escape on a focused chip returns focus to the input', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ status: 'error' }} />);
    const chip = screen.getByLabelText('Status: Error');
    chip.focus();
    expect(chip).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(getInput()).toHaveFocus();
  });

  it('Backspace on a focused chip removes that chip', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ status: 'error', tags: ['bug'] }} />);
    const tagsChip = screen.getByLabelText('Tags: Bug');
    tagsChip.focus();
    await user.keyboard('{Backspace}');
    expect(getValue()).toEqual({ status: 'error' });
  });
});

// ── Single Select Flow ──────────────────────────

describe('FilterTokens single select', () => {
  it('shows values after clicking a category', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
    await user.click(screen.getByText('Status'));
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('creates token on value selection and returns to categories', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
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
    await user.click(screen.getByLabelText('Status: Error'));
    const errorOption = screen.getByRole('option', { name: /Error/ });
    expect(errorOption).toHaveAttribute('data-selected', 'true');
  });

  it('replaces value on different selection', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ status: 'error' }} />);
    await user.click(screen.getByLabelText('Status: Error'));
    await user.click(screen.getByText('Success'));
    expect(getValue()).toEqual({ status: 'success' });
  });
});

// ── Multi Select Flow ───────────────────────────

describe('FilterTokens multi select', () => {
  it('creates combined token and stays open', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
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
    await user.click(screen.getByLabelText('Tags: Bug, Feature'));
    // Uncheck Bug
    await user.click(screen.getByText('Bug'));
    expect(getValue()).toEqual({ tags: ['feature'] });
  });

  it('removes token when last value toggled off', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ tags: ['bug'] }} />);
    await user.click(screen.getByLabelText('Tags: Bug'));
    await user.click(screen.getByRole('option', { name: /Bug/ }));
    expect(getValue()).toEqual({});
  });
});

// ── Text Entry Flow ─────────────────────────────

describe('FilterTokens text entry', () => {
  it('creates token on Enter', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
    await user.click(screen.getByText('Search'));
    await user.type(getInput(), 'timeout{Enter}');
    expect(getValue()).toEqual({ search: 'timeout' });
  });

  it('pre-fills current value on pill re-click', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ search: 'timeout' }} />);
    await user.click(screen.getByLabelText('Search: timeout'));
    const input = getInput();
    expect(input).toHaveValue('timeout');
  });
});

// ── Date Preset Flow ────────────────────────────

describe('FilterTokens date presets', () => {
  it('shows presets and Custom range item', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
    await user.click(screen.getByText('Period'));
    expect(screen.getByText('Last hour')).toBeInTheDocument();
    expect(screen.getByText('Last 24h')).toBeInTheDocument();
    expect(screen.getByText('Custom range...')).toBeInTheDocument();
  });

  it('creates token with preset label on selection', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
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
    await user.click(getInput());
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

  it('applies "until X" range with only end date set', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
    await user.click(screen.getByText('Period'));
    await user.click(screen.getByText('Custom range...'));
    // Type only the End date — leave Start empty
    const endInput = screen.getByLabelText('End date and time');
    await user.clear(endInput);
    await user.type(endInput, '04/20/2026');
    await user.tab();
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    const period = getValue().period;
    expect(period.from).toBeUndefined();
    expect(period.to).toBeDefined();
  });

  it('renders "Until X" token for to-only range value', () => {
    render(<Setup initialValue={{ period: { to: '2026-04-20T23:59:59Z' } }} />);
    expect(screen.getByText('Period:')).toBeInTheDocument();
    // Token displayValue should start with "Until "
    expect(screen.getByText(/Until /)).toBeInTheDocument();
  });

  it('preserves the End when typing a new Start that falls before End', async () => {
    // Re-editing the Start of an existing range used to wipe the End on
    // every change. Now End is preserved as long as the new Start is on or
    // before the existing End.
    const user = userEvent.setup();
    render(
      <Setup
        initialValue={{
          period: { from: '2026-04-10T00:00:00Z', to: '2026-04-20T23:59:59Z' },
        }}
      />,
    );
    await user.click(screen.getByText('Period:').closest('[role="button"]')!);
    const startInput = screen.getByLabelText('Start date and time');
    await user.clear(startInput);
    await user.type(startInput, '04/15/2026');
    await user.tab();
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    const period = getValue().period;
    expect(period.from).toBeDefined();
    expect(period.to).toBeDefined();
  });

  it('clears a date when its input is emptied', async () => {
    // Used to be: emptying a date input + Tab restored the previous value.
    // Now empty-on-blur calls onDateChange(undefined) so the field clears.
    const user = userEvent.setup();
    render(
      <Setup
        initialValue={{
          period: { from: '2026-04-10T00:00:00Z', to: '2026-04-20T23:59:59Z' },
        }}
      />,
    );
    await user.click(screen.getByText('Period:').closest('[role="button"]')!);
    const endInput = screen.getByLabelText('End date and time');
    await user.clear(endInput);
    await user.tab();
    expect(endInput).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    const period = getValue().period;
    expect(period.from).toBeDefined();
    expect(period.to).toBeUndefined();
  });

  it('disables Apply when the typed range is inverted (from > to)', async () => {
    // Used to silently auto-correct: typing End < Start moved the value to
    // Start and cleared End; typing Start > End cleared End. Both surprised
    // the user. Now we trust the typed values and just disable Apply.
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
    await user.click(screen.getByText('Period'));
    await user.click(screen.getByText('Custom range...'));
    const startInput = screen.getByLabelText('Start date and time');
    const endInput = screen.getByLabelText('End date and time');
    await user.clear(startInput);
    await user.type(startInput, '04/20/2026');
    await user.tab();
    await user.clear(endInput);
    await user.type(endInput, '04/10/2026');
    await user.tab();
    // Both inputs preserve their typed values
    expect((startInput as HTMLInputElement).value).toContain('04/20/2026');
    expect((endInput as HTMLInputElement).value).toContain('04/10/2026');
    // Apply is disabled because from > to
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('highlights the End day on the calendar when re-editing a "Until X" filter', async () => {
    // Was: rangeModifiers returned {} when from was undefined, so the End
    // day got no visual treatment at all. Now End-only sets range_end.
    const user = userEvent.setup();
    render(
      <Setup initialValue={{ period: { to: '2026-04-20T23:59:59Z' } }} />,
    );
    await user.click(screen.getByText('Period:').closest('[role="button"]')!);
    // Confirm we're in the custom-date panel and the End input is pre-filled
    const endInput = screen.getByLabelText('End date and time') as HTMLInputElement;
    expect(endInput.value).toContain('04/20/2026');
    // The day button for Apr 20 carries the data-range-end attribute that
    // CalendarDayButton wires to the highlighted-pill style.
    const day20 = document.querySelector('[data-day="4/20/2026"]');
    expect(day20).not.toBeNull();
    expect(day20?.getAttribute('data-range-end')).toBe('true');
  });

  it('shows presets when re-clicking preset date pill', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
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
    await user.click(getInput());
    await user.type(getInput(), 'sta');
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    expect(screen.queryByText('Period')).not.toBeInTheDocument();
  });

  it('shows no results for unmatched search', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
    await user.type(getInput(), 'zzzzz');
    expect(screen.getByText('No results')).toBeInTheDocument();
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

// ── Announcements (aria-live) ─────────────────

describe('FilterTokens announcements', () => {
  function getAnnouncement() {
    return document.querySelector('[data-slot="filter-tokens-announcement"]');
  }

  it('announces add when a token is added', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
    await user.click(screen.getByText('Status'));
    await user.click(screen.getByText('Error'));
    expect(getAnnouncement()?.textContent).toContain('Added Status: Error');
  });

  it('announces remove when a token is removed', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ status: 'error' }} />);
    await user.click(screen.getByLabelText('Remove Status: Error'));
    expect(getAnnouncement()?.textContent).toContain('Removed Status: Error');
  });

  it('announces per-value adds for multi-select', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
    await user.click(screen.getByText('Tags'));
    await user.click(screen.getByText('Bug'));
    expect(getAnnouncement()?.textContent).toContain('Added Tags: Bug');
    await user.click(screen.getByText('Feature'));
    expect(getAnnouncement()?.textContent).toContain('Added Tags: Feature');
  });
});

// ── Disabled State ──────────────────────────────

describe('FilterTokens disabled', () => {
  it('disables the input when disabled', () => {
    render(
      <FilterTokens
        filters={filters}
        value={{}}
        onChange={() => {}}
        disabled
      />,
    );
    expect(getInput()).toBeDisabled();
  });
});

// ── Back Navigation ─────────────────────────────

describe('FilterTokens back button', () => {
  it('shows back button in values mode', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
    await user.click(screen.getByText('Status'));
    expect(screen.getByLabelText('Back to filters')).toBeInTheDocument();
  });

  it('goes back to categories on back button click', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
    await user.click(screen.getByText('Status'));
    await user.click(screen.getByLabelText('Back to filters'));
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Period')).toBeInTheDocument();
  });
});

// ── ARIA attributes ───────────────────────────

describe('FilterTokens ARIA', () => {
  it('sets aria-multiselectable on listbox in multi-select mode', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
    await user.click(screen.getByText('Tags'));
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
  });

  it('does not set aria-multiselectable in single-select mode', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
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
    await user.click(getInput());
    await user.click(screen.getByText('City'));
    expect(document.querySelector('[data-slot="filter-tokens-loading"]')).not.toBeNull();
    expect(screen.queryByText('No results')).not.toBeInTheDocument();
  });

  it('shows options after async resolution', async () => {
    const user = userEvent.setup();
    render(<AsyncSetup />);
    await user.click(getInput());
    await user.click(screen.getByText('City'));
    await screen.findByText('New York');
    expect(screen.getByText('Los Angeles')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="filter-tokens-loading"]')).toBeNull();
  });

  it('shows error state with Retry when async fails, then recovers', async () => {
    let attempt = 0;
    const failingFilters = {
      city: {
        type: 'select' as const,
        label: 'City',
        options: () => {
          attempt += 1;
          if (attempt === 1) {
            return Promise.reject(new Error('Network down'));
          }
          return Promise.resolve([{ value: 'nyc', label: 'New York' }]);
        },
      },
    } as const;
    function FailingSetup() {
      const [value, setValue] = React.useState({});
      return (
        <FilterTokens
          filters={failingFilters}
          value={value as any}
          onChange={setValue as any}
          placeholder="Filter..."
        />
      );
    }
    const user = userEvent.setup();
    render(<FailingSetup />);
    await user.click(getInput());
    await user.click(screen.getByText('City'));
    // Error UI appears
    await screen.findByText('Failed to load options');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    // Retry triggers a fresh fetch that resolves
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('New York');
    expect(screen.queryByText('Failed to load options')).not.toBeInTheDocument();
  });
});

// ── Number Entry Flow ─────────────────────────

describe('FilterTokens number entry', () => {
  it('shows min/max inputs when clicking a number category', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
    await user.click(screen.getByText('Amount'));
    expect(screen.getByLabelText(/Minimum value/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Maximum value/)).toBeInTheDocument();
  });

  it('creates token on Apply with min and max', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
    await user.click(screen.getByText('Amount'));
    await user.type(screen.getByLabelText(/Minimum value/), '10');
    await user.type(screen.getByLabelText(/Maximum value/), '500');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(getValue()).toEqual({ amount: { min: 10, max: 500 } });
  });

  it('creates token with min only', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(getInput());
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
    await user.click(getInput());
    await user.click(screen.getByText('Amount'));
    await user.type(screen.getByLabelText(/Minimum value/), '42');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(getValue()).toEqual({});
  });
});
