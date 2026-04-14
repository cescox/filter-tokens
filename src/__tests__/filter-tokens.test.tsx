import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FilterTokens } from '../../registry/new-york/filter-tokens/filter-tokens';

const filters = {
  status: {
    type: 'select' as const,
    label: 'Status',
    options: [
      { value: 'success', label: 'Success' },
      { value: 'error', label: 'Error' },
    ],
  },
  tags: {
    type: 'select' as const,
    label: 'Tags',
    multi: true,
    options: [
      { value: 'bug', label: 'Bug' },
      { value: 'feature', label: 'Feature' },
    ],
  },
  search: {
    type: 'text' as const,
    label: 'Search',
  },
} as const;

function Setup({
  initialValue = {},
}: {
  initialValue?: Record<string, unknown>;
} = {}) {
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

import React from 'react';

describe('FilterTokens component', () => {
  it('renders with placeholder', () => {
    render(<Setup />);
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Filter...');
  });

  it('shows categories dropdown on focus', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('shows values after clicking a category', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Status'));
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('creates a token on value selection', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Status'));
    await user.click(screen.getByText('Error'));
    expect(screen.getByTestId('value')).toHaveTextContent('"status":"error"');
  });

  it('renders tokens from initial value', () => {
    render(<Setup initialValue={{ status: 'error' }} />);
    const token = screen.getByLabelText('Remove Status: Error');
    expect(token).toBeInTheDocument();
  });

  it('removes a token on x click', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ status: 'error' }} />);
    const removeBtn = screen.getByLabelText('Remove Status: Error');
    await user.click(removeBtn);
    expect(screen.getByTestId('value')).toHaveTextContent('{}');
  });

  it('clears all tokens', async () => {
    const user = userEvent.setup();
    render(<Setup initialValue={{ status: 'error', search: 'test' }} />);
    const clearBtn = screen.getByLabelText('Clear all filters');
    await user.click(clearBtn);
    expect(screen.getByTestId('value')).toHaveTextContent('{}');
  });

  it('navigates with keyboard and selects with Enter', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('closes dropdown on Escape', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByText('Status')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
  });

  it('filters categories when typing', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByRole('combobox'), 'sta');
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
  });

  it('handles text filter with Enter', async () => {
    const user = userEvent.setup();
    render(<Setup />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Search'));
    await user.type(screen.getByRole('combobox'), 'timeout{Enter}');
    expect(screen.getByTestId('value')).toHaveTextContent('"search":"timeout"');
  });

  it('disables when disabled prop is set', () => {
    render(
      <FilterTokens
        filters={filters}
        value={{}}
        onChange={() => {}}
        disabled
      />,
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
