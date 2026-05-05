import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useFilterTokens } from '../use-filter-tokens';

const schema = {
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
  period: {
    type: 'date' as const,
    label: 'Period',
    range: true,
    presets: [
      { label: 'Last hour', from: () => new Date(Date.now() - 3600000) },
      { label: 'Last 24h', from: () => new Date(Date.now() - 86400000) },
    ],
  },
  search: {
    type: 'text' as const,
    label: 'Search',
    placeholder: 'Search...',
  },
  amount: {
    type: 'number' as const,
    label: 'Amount',
    unit: '€',
    min: 0,
    max: 10000,
  },
} as const;

function setup(value = {}) {
  const onChange = vi.fn();
  const result = renderHook(
    ({ value }) => useFilterTokens({ filters: schema, value, onChange }),
    { initialProps: { value } },
  );
  return { ...result, onChange };
}

describe('useFilterTokens', () => {
  describe('tokens', () => {
    it('returns empty tokens when value is empty', () => {
      const { result } = setup();
      expect(result.current.tokens).toEqual([]);
    });

    it('derives tokens from single select value', () => {
      const { result } = setup({ status: 'error' });
      expect(result.current.tokens).toHaveLength(1);
      expect(result.current.tokens[0].category).toBe('status');
      expect(result.current.tokens[0].label).toBe('Status');
      expect(result.current.tokens[0].displayValue).toBe('Error');
    });

    it('derives combined token from multi-select value', () => {
      const { result } = setup({ tags: ['bug', 'feature'] });
      expect(result.current.tokens).toHaveLength(1);
      expect(result.current.tokens[0].displayValue).toBe('Bug, Feature');
    });

    it('derives token from date range value', () => {
      const { result } = setup({ period: { from: '2026-04-13T00:00:00Z' } });
      expect(result.current.tokens).toHaveLength(1);
      expect(result.current.tokens[0].displayValue).toContain('Apr');
    });

    it('derives token from text value', () => {
      const { result } = setup({ search: 'timeout' });
      expect(result.current.tokens).toHaveLength(1);
      expect(result.current.tokens[0].displayValue).toBe('timeout');
    });
  });

  describe('token removal', () => {
    it('removes a single select token', () => {
      const { result, onChange } = setup({ status: 'error' });
      act(() => result.current.tokens[0].remove());
      expect(onChange).toHaveBeenCalledWith({});
    });

    it('removes all values when multi-select token is removed', () => {
      const { result, onChange } = setup({ tags: ['bug', 'feature'] });
      act(() => result.current.tokens[0].remove());
      expect(onChange).toHaveBeenCalledWith({});
    });
  });

  describe('clear', () => {
    it('clears all tokens', () => {
      const { result, onChange } = setup({ status: 'error', search: 'test' });
      act(() => result.current.clear());
      expect(onChange).toHaveBeenCalledWith({});
    });
  });

  describe('dropdown', () => {
    it('starts closed', () => {
      const { result } = setup();
      expect(result.current.dropdown.isOpen).toBe(false);
      expect(result.current.dropdown.items).toEqual([]);
    });

    it('opens with categories on focus', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      expect(result.current.dropdown.isOpen).toBe(true);
      expect(result.current.dropdown.items).toHaveLength(5);
      expect(result.current.dropdown.items.map((i) => i.key)).toEqual([
        'status', 'tags', 'period', 'search', 'amount',
      ]);
    });

    it('shows values after selecting a category', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      const statusItem = result.current.dropdown.items[0];
      act(() => result.current.dropdown.select(statusItem));
      expect(result.current.dropdown.items).toHaveLength(2);
      expect(result.current.dropdown.items.map((i) => i.key)).toEqual(['success', 'error']);
    });

    it('selects a value and returns to categories for single select', () => {
      const { result, onChange } = setup();
      act(() => result.current.inputProps.onFocus());
      act(() => result.current.dropdown.select(result.current.dropdown.items[0]));
      act(() => result.current.dropdown.select(result.current.dropdown.items[1]));
      expect(onChange).toHaveBeenCalledWith({ status: 'error' });
      expect(result.current.dropdown.isOpen).toBe(true);
      expect(result.current.dropdown.state.mode).toBe('categories');
    });

    it('stays open for multi-select after selecting', () => {
      const { result, onChange } = setup();
      act(() => result.current.inputProps.onFocus());
      const tagsItem = result.current.dropdown.items[1];
      act(() => result.current.dropdown.select(tagsItem));
      act(() => result.current.dropdown.select(result.current.dropdown.items[0]));
      expect(onChange).toHaveBeenCalledWith({ tags: ['bug'] });
      expect(result.current.dropdown.isOpen).toBe(true);
    });

    it('enters text-entry mode for text filters', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      const searchItem = result.current.dropdown.items[3];
      act(() => result.current.dropdown.select(searchItem));
      expect(result.current.dropdown.state).toMatchObject({ mode: 'input', inputType: 'text' });
    });

    it('closes on close()', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      expect(result.current.dropdown.isOpen).toBe(true);
      act(() => result.current.dropdown.close());
      expect(result.current.dropdown.isOpen).toBe(false);
    });
  });

  describe('keyboard navigation', () => {
    function keyDown(result: any, key: string, opts?: { isComposing?: boolean }) {
      act(() => {
        result.current.inputProps.onKeyDown({
          key,
          preventDefault: vi.fn(),
          nativeEvent: { isComposing: opts?.isComposing ?? false },
        } as any);
      });
    }

    it('opens dropdown on ArrowDown when closed', () => {
      const { result } = setup();
      keyDown(result, 'ArrowDown');
      expect(result.current.dropdown.isOpen).toBe(true);
    });

    it('opens dropdown on ArrowUp when closed', () => {
      // WAI-ARIA combobox: both ArrowDown and ArrowUp open a closed popup.
      const { result } = setup();
      keyDown(result, 'ArrowUp');
      expect(result.current.dropdown.isOpen).toBe(true);
    });

    it('navigates highlighted index with arrows', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      expect(result.current.dropdown.highlightedIndex).toBe(-1);
      keyDown(result, 'ArrowDown');
      expect(result.current.dropdown.highlightedIndex).toBe(0);
      keyDown(result, 'ArrowDown');
      expect(result.current.dropdown.highlightedIndex).toBe(1);
      keyDown(result, 'ArrowUp');
      expect(result.current.dropdown.highlightedIndex).toBe(0);
    });

    it('jumps to first item on Home', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      keyDown(result, 'ArrowDown');
      keyDown(result, 'ArrowDown');
      expect(result.current.dropdown.highlightedIndex).toBe(1);
      keyDown(result, 'Home');
      expect(result.current.dropdown.highlightedIndex).toBe(0);
    });

    it('jumps to last item on End', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      const lastIndex = result.current.dropdown.items.length - 1;
      keyDown(result, 'End');
      expect(result.current.dropdown.highlightedIndex).toBe(lastIndex);
    });

    it('selects highlighted item on Enter', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      keyDown(result, 'ArrowDown');
      keyDown(result, 'Enter');
      expect(result.current.dropdown.state.mode).toBe('values');
    });

    it('goes back to categories on Escape from values', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      act(() => result.current.dropdown.select(result.current.dropdown.items[0]));
      expect(result.current.dropdown.state.mode).toBe('values');
      keyDown(result, 'Escape');
      expect(result.current.dropdown.state.mode).toBe('categories');
    });

    it('closes dropdown on Escape from categories', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      keyDown(result, 'Escape');
      expect(result.current.dropdown.isOpen).toBe(false);
    });
  });

  describe('search filtering', () => {
    it('filters categories by search text', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      act(() => {
        result.current.inputProps.onChange({
          target: { value: 'sta' },
        } as any);
      });
      expect(result.current.dropdown.items).toHaveLength(1);
      expect(result.current.dropdown.items[0].key).toBe('status');
    });

    it('filters values by search text', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      act(() => result.current.dropdown.select(result.current.dropdown.items[0]));
      act(() => {
        result.current.inputProps.onChange({
          target: { value: 'err' },
        } as any);
      });
      expect(result.current.dropdown.items).toHaveLength(1);
      expect(result.current.dropdown.items[0].key).toBe('error');
    });
  });

  describe('sync function options', () => {
    it('resolves sync function options', () => {
      const dynamicSchema = {
        level: {
          type: 'select' as const,
          label: 'Level',
          options: () => [
            { value: 'info', label: 'Info' },
            { value: 'warn', label: 'Warn' },
          ],
        },
      } as const;

      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useFilterTokens({ filters: dynamicSchema, value: {}, onChange }),
      );

      act(() => result.current.inputProps.onFocus());
      act(() => result.current.dropdown.select(result.current.dropdown.items[0]));
      expect(result.current.dropdown.items).toHaveLength(2);
      expect(result.current.dropdown.items[0].label).toBe('Info');
    });
  });

  describe('search auto-highlight', () => {
    it('highlights first match when searching categories', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      act(() => {
        result.current.inputProps.onChange({ target: { value: 'sta' } } as any);
      });
      expect(result.current.dropdown.items).toHaveLength(1);
      expect(result.current.dropdown.highlightedIndex).toBe(0);
    });

    it('does not highlight when search is empty in categories', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      expect(result.current.dropdown.highlightedIndex).toBe(-1);
    });
  });

  describe('text re-edit', () => {
    it('pre-fills input with current text value on openCategory', () => {
      const { result } = setup({ search: 'timeout' });
      act(() => result.current.openCategory('search'));
      expect(result.current.dropdown.state).toMatchObject({ mode: 'input', inputType: 'text' });
      expect(result.current.inputProps.value).toBe('timeout');
    });

    it('starts empty for new text entry', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      const searchItem = result.current.dropdown.items.find((i) => i.key === 'search');
      act(() => result.current.dropdown.select(searchItem!));
      expect(result.current.inputProps.value).toBe('');
    });
  });

  describe('date presets and custom', () => {
    it('shows presets including Custom range item', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      const periodItem = result.current.dropdown.items.find((i) => i.key === 'period');
      act(() => result.current.dropdown.select(periodItem!));
      expect(result.current.dropdown.state.mode).toBe('values');
      const customItem = result.current.dropdown.items.find((i) => i.key === '__custom_date__');
      expect(customItem).toBeDefined();
      expect(customItem!.label).toBe('Custom range...');
    });

    it('enters date-entry mode when selecting Custom range item', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      const periodItem = result.current.dropdown.items.find((i) => i.key === 'period');
      act(() => result.current.dropdown.select(periodItem!));
      const customItem = result.current.dropdown.items.find((i) => i.key === '__custom_date__');
      act(() => result.current.dropdown.select(customItem!));
      expect(result.current.dropdown.state).toMatchObject({ mode: 'input', inputType: 'date' });
    });

    it('goes to date-entry when clicking date pill with custom value', () => {
      const { result } = setup({ period: { from: '2026-04-05T00:00:00Z', to: '2026-04-15T23:59:59Z' } });
      act(() => result.current.openCategory('period'));
      expect(result.current.dropdown.state).toMatchObject({ mode: 'input', inputType: 'date' });
    });

    it('goes back to presets from date-entry when presets exist', () => {
      const { result } = setup({ period: { from: '2026-04-05T00:00:00Z', to: '2026-04-15T23:59:59Z' } });
      act(() => result.current.openCategory('period'));
      expect(result.current.dropdown.state).toMatchObject({ mode: 'input', inputType: 'date' });
      act(() => result.current.dropdown.goBack());
      expect(result.current.dropdown.state.mode).toBe('values');
      expect(result.current.dropdown.items.length).toBeGreaterThan(1);
    });

    it('enters date-entry for date filters without presets', () => {
      const noPresetSchema = {
        when: {
          type: 'date' as const,
          label: 'When',
        },
      } as const;
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useFilterTokens({ filters: noPresetSchema, value: {}, onChange }),
      );
      act(() => result.current.inputProps.onFocus());
      act(() => result.current.dropdown.select(result.current.dropdown.items[0]));
      expect(result.current.dropdown.state).toMatchObject({ mode: 'input', inputType: 'date' });
    });

    it('stores preset label and shows it in token', () => {
      const { result, onChange } = setup();
      act(() => result.current.inputProps.onFocus());
      const periodItem = result.current.dropdown.items.find((i) => i.key === 'period');
      act(() => result.current.dropdown.select(periodItem!));
      const lastHourItem = result.current.dropdown.items[0];
      act(() => result.current.dropdown.select(lastHourItem));
      expect(onChange).toHaveBeenCalled();
      const call = onChange.mock.calls[0][0];
      expect(call.period).toBeDefined();
      expect(call.period.from).toBeDefined();
    });

    it('Custom range is searchable', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      const periodItem = result.current.dropdown.items.find((i) => i.key === 'period');
      act(() => result.current.dropdown.select(periodItem!));
      act(() => {
        result.current.inputProps.onChange({ target: { value: 'custom' } } as any);
      });
      expect(result.current.dropdown.items).toHaveLength(1);
      expect(result.current.dropdown.items[0].key).toBe('__custom_date__');
    });
  });

  describe('escape navigation', () => {
    it('goes back from values to categories', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      act(() => result.current.dropdown.select(result.current.dropdown.items[0]));
      expect(result.current.dropdown.state.mode).toBe('values');
      act(() => result.current.dropdown.goBack());
      expect(result.current.dropdown.state.mode).toBe('categories');
      expect(result.current.dropdown.isOpen).toBe(true);
    });

    it('goes back from text-entry to categories', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      const searchItem = result.current.dropdown.items.find((i) => i.key === 'search');
      act(() => result.current.dropdown.select(searchItem!));
      expect(result.current.dropdown.state).toMatchObject({ mode: 'input', inputType: 'text' });
      act(() => result.current.dropdown.goBack());
      expect(result.current.dropdown.state.mode).toBe('categories');
    });

    it('closes from categories', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      expect(result.current.dropdown.isOpen).toBe(true);
      act(() => result.current.dropdown.goBack());
      expect(result.current.dropdown.isOpen).toBe(false);
    });
  });

  describe('multi-select toggle', () => {
    it('toggles values on and off', () => {
      const { result, onChange, rerender } = setup();
      act(() => result.current.inputProps.onFocus());
      const tagsItem = result.current.dropdown.items[1];
      act(() => result.current.dropdown.select(tagsItem));
      act(() => result.current.dropdown.select(result.current.dropdown.items[0]));
      expect(onChange).toHaveBeenCalledWith({ tags: ['bug'] });

      rerender({ value: { tags: ['bug'] } });
      act(() => result.current.dropdown.select(result.current.dropdown.items[0]));
      expect(onChange).toHaveBeenLastCalledWith({});
    });

    it('shows selected state for multi-select items', () => {
      const { result } = setup({ tags: ['bug'] });
      act(() => result.current.openCategory('tags'));
      const bugItem = result.current.dropdown.items.find((i) => i.key === 'bug');
      expect(bugItem?.selected).toBe(true);
      const featureItem = result.current.dropdown.items.find((i) => i.key === 'feature');
      expect(featureItem?.selected).toBe(false);
    });

    it('resets search and highlight after each multi-select pick', () => {
      // Was a real UX bug: pick one value via mouse → search filter and
      // listbox stayed narrowed, focus slid into the popover.
      const { result } = setup();
      act(() => result.current.openCategory('tags'));
      // Type to filter the listbox
      act(() => {
        result.current.inputProps.onChange({ target: { value: 'bug' } } as any);
      });
      expect(result.current.inputProps.value).toBe('bug');
      // Pick the only matching item
      const bugItem = result.current.dropdown.items.find((i) => i.key === 'bug');
      act(() => result.current.dropdown.select(bugItem!));
      // Search must clear so the user can type the next value
      expect(result.current.inputProps.value).toBe('');
      // Highlight resets to the top
      expect(result.current.dropdown.highlightedIndex).toBe(0);
      // Mode stays in values (multi keeps the dropdown open)
      expect(result.current.dropdown.state.mode).toBe('values');
    });
  });

  describe('re-edit highlight (single-select)', () => {
    it('highlights the currently chosen value when re-entering values mode', () => {
      // Was a real UX bug: re-clicking Status: Failed chip highlighted
      // Succeeded (index 0); pressing Enter silently overwrote Failed.
      const { result } = setup({ status: 'error' });
      act(() => result.current.openCategory('status'));
      // Status options are [success(0), error(1)]. Should highlight error.
      const items = result.current.dropdown.items;
      const errorIdx = items.findIndex((i) => i.key === 'error');
      expect(result.current.dropdown.highlightedIndex).toBe(errorIdx);
    });
  });

  describe('applyDate', () => {
    it('sets date value and closes the popover (Apply commits and dismisses)', () => {
      const { result, onChange } = setup();
      act(() => result.current.openCategory('period'));
      act(() => {
        result.current.applyDate('period', { from: '2026-04-05T00:00:00Z', to: '2026-04-15T23:59:59Z' });
      });
      expect(onChange).toHaveBeenCalledWith({
        period: { from: '2026-04-05T00:00:00Z', to: '2026-04-15T23:59:59Z' },
      });
      // Apply on a custom date panel is a deliberate commit; close after.
      expect(result.current.dropdown.state.mode).toBe('closed');
    });
  });

  describe('async options', () => {
    function asyncSetup() {
      const asyncSchema = {
        city: {
          type: 'select' as const,
          label: 'City',
          options: vi.fn(() =>
            Promise.resolve([
              { value: 'nyc', label: 'New York' },
              { value: 'la', label: 'Los Angeles' },
            ]),
          ),
        },
      } as const;
      const onChange = vi.fn();
      const result = renderHook(
        ({ value }) => useFilterTokens({ filters: asyncSchema, value, onChange }),
        { initialProps: { value: {} as Record<string, unknown> } },
      );
      return { ...result, onChange, asyncSchema };
    }

    it('sets loading true while async options are pending', async () => {
      const { result } = asyncSetup();
      act(() => result.current.inputProps.onFocus());
      act(() => result.current.dropdown.select(result.current.dropdown.items[0]));
      expect(result.current.dropdown.loading).toBe(true);
      expect(result.current.dropdown.items).toHaveLength(0);
      await act(async () => {});
      expect(result.current.dropdown.loading).toBe(false);
      expect(result.current.dropdown.items).toHaveLength(2);
    });

    it('resolves async options and shows items', async () => {
      const { result } = asyncSetup();
      act(() => result.current.inputProps.onFocus());
      act(() => result.current.dropdown.select(result.current.dropdown.items[0]));
      await act(async () => {});
      expect(result.current.dropdown.items[0].label).toBe('New York');
      expect(result.current.dropdown.items[1].label).toBe('Los Angeles');
    });

    it('exposes error and clears loading on rejection', async () => {
      const failSchema = {
        city: {
          type: 'select' as const,
          label: 'City',
          options: () => Promise.reject(new Error('network error')),
        },
      } as const;
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useFilterTokens({ filters: failSchema, value: {}, onChange }),
      );
      act(() => result.current.inputProps.onFocus());
      act(() => result.current.dropdown.select(result.current.dropdown.items[0]));
      expect(result.current.dropdown.loading).toBe(true);
      await waitFor(() => {
        expect(result.current.dropdown.loading).toBe(false);
      });
      expect(result.current.dropdown.items).toHaveLength(0);
      expect(result.current.dropdown.error).toBe('network error');
    });

    it('retry() re-runs the options fn and clears prior error', async () => {
      let attempt = 0;
      const failSchema = {
        city: {
          type: 'select' as const,
          label: 'City',
          options: () => {
            attempt += 1;
            return attempt === 1
              ? Promise.reject(new Error('first attempt failed'))
              : Promise.resolve([{ value: 'nyc', label: 'New York' }]);
          },
        },
      } as const;
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useFilterTokens({ filters: failSchema, value: {}, onChange }),
      );
      act(() => result.current.inputProps.onFocus());
      act(() => result.current.dropdown.select(result.current.dropdown.items[0]));
      await waitFor(() => {
        expect(result.current.dropdown.error).toBe('first attempt failed');
      });
      act(() => result.current.dropdown.retry());
      await waitFor(() => {
        expect(result.current.dropdown.error).toBeNull();
        expect(result.current.dropdown.items).toHaveLength(1);
      });
    });
  });

  describe('locale option', () => {
    it('uses locale for date token display', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useFilterTokens({
          filters: schema,
          value: { period: { from: '2026-04-05T12:00:00Z', to: '2026-04-15T12:00:00Z' } },
          onChange,
          locale: 'en-US',
        }),
      );
      // en-US formats as "Apr 5" / "Apr 15"
      expect(result.current.tokens[0].displayValue).toContain('Apr');
    });
  });

  describe('dateLabels cleanup', () => {
    it('cleans up stale dateLabels when value is cleared externally', () => {
      const { result, onChange, rerender } = setup();
      // Select a preset → stores dateLabel
      act(() => result.current.inputProps.onFocus());
      const periodItem = result.current.dropdown.items.find((i) => i.key === 'period');
      act(() => result.current.dropdown.select(periodItem!));
      act(() => result.current.dropdown.select(result.current.dropdown.items[0]));
      expect(onChange).toHaveBeenCalled();

      // Now clear value externally
      rerender({ value: {} });
      // Verify no stale tokens
      expect(result.current.tokens).toHaveLength(0);
    });
  });

  describe('backspace token removal', () => {
    function keyDown(result: any, key: string, opts?: { isComposing?: boolean }) {
      act(() => {
        result.current.inputProps.onKeyDown({
          key,
          preventDefault: vi.fn(),
          nativeEvent: { isComposing: opts?.isComposing ?? false },
        } as any);
      });
    }

    it('removes the last token on Backspace when input is empty', () => {
      // Single-press: matches Linear / Slack / Mantine TagsInput.
      const { result, onChange } = setup({ status: 'error', search: 'test' });
      act(() => result.current.inputProps.onFocus());
      keyDown(result, 'Backspace');
      // `tokens` order is the schema order: status (index 0), search (index 1).
      // The last token (search) must be the one removed.
      expect(onChange).toHaveBeenCalledWith({ status: 'error' });
    });

    it('does nothing when there are no tokens', () => {
      const { result, onChange } = setup();
      act(() => result.current.inputProps.onFocus());
      expect(() => keyDown(result, 'Backspace')).not.toThrow();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('does NOT remove a token when Backspace fires during IME composition', () => {
      const { result, onChange } = setup({ status: 'error' });
      act(() => result.current.inputProps.onFocus());
      // With isComposing=true the Backspace must be a no-op so that
      // Korean/Japanese/etc. input composition can use Backspace to delete
      // composing characters without losing the last chip.
      keyDown(result, 'Backspace', { isComposing: true });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('number filter', () => {
    it('enters number-entry mode when selecting number category', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      const amountItem = result.current.dropdown.items.find((i) => i.key === 'amount');
      act(() => result.current.dropdown.select(amountItem!));
      expect(result.current.dropdown.state).toMatchObject({ mode: 'input', inputType: 'number' });
    });

    it('derives token from number value with min and max', () => {
      const { result } = setup({ amount: { min: 5, max: 100 } });
      expect(result.current.tokens).toHaveLength(1);
      expect(result.current.tokens[0].displayValue).toBe('5–100€');
    });

    it('derives token from number value with min only', () => {
      const { result } = setup({ amount: { min: 50 } });
      expect(result.current.tokens[0].displayValue).toBe('≥50€');
    });

    it('derives token from number value with max only', () => {
      const { result } = setup({ amount: { max: 200 } });
      expect(result.current.tokens[0].displayValue).toBe('≤200€');
    });

    it('sets number value and closes the popover (Apply commits and dismisses)', () => {
      const { result, onChange } = setup();
      act(() => result.current.openCategory('amount'));
      expect(result.current.dropdown.state).toMatchObject({ mode: 'input', inputType: 'number' });
      act(() => {
        result.current.applyNumber('amount', { min: 10, max: 500 });
      });
      expect(onChange).toHaveBeenCalledWith({ amount: { min: 10, max: 500 } });
      expect(result.current.dropdown.state.mode).toBe('closed');
    });

    it('goes back from number-entry to categories', () => {
      const { result } = setup();
      act(() => result.current.openCategory('amount'));
      expect(result.current.dropdown.state).toMatchObject({ mode: 'input', inputType: 'number' });
      act(() => result.current.dropdown.goBack());
      expect(result.current.dropdown.state.mode).toBe('categories');
    });
  });

  describe('announcement (aria-live)', () => {
    it('updates announcement on token add', () => {
      const { result, rerender } = setup();
      expect(result.current.announcement).toBe('');
      rerender({ value: { status: 'error' } });
      expect(result.current.announcement).toContain('Added Status: Error');
    });

    it('updates announcement on token remove', () => {
      const { result, rerender } = setup({ status: 'error' });
      expect(result.current.announcement).toBe('');
      rerender({ value: {} });
      expect(result.current.announcement).toContain('Removed Status: Error');
    });

    it('clears announcement after 1500ms', () => {
      vi.useFakeTimers();
      try {
        const { result, rerender } = setup();
        rerender({ value: { status: 'error' } });
        expect(result.current.announcement).toContain('Added Status: Error');
        act(() => {
          vi.advanceTimersByTime(1500);
        });
        expect(result.current.announcement).toBe('');
      } finally {
        vi.useRealTimers();
      }
    });

    it('per-value announcement for multi-select adds', () => {
      const { result, rerender } = setup({ tags: ['bug'] });
      rerender({ value: { tags: ['bug', 'feature'] } });
      expect(result.current.announcement).toContain('Added Tags: Feature');
      expect(result.current.announcement).not.toContain('Added Tags: Bug');
    });

    it('per-value announcement for multi-select removes', () => {
      const { result, rerender } = setup({ tags: ['bug', 'feature'] });
      rerender({ value: { tags: ['bug'] } });
      expect(result.current.announcement).toContain('Removed Tags: Feature');
      expect(result.current.announcement).not.toContain('Removed Tags: Bug');
    });
  });
});
