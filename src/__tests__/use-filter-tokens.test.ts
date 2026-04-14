import { renderHook, act } from '@testing-library/react';
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

    it('derives multiple tokens from multi-select value', () => {
      const { result } = setup({ tags: ['bug', 'feature'] });
      expect(result.current.tokens).toHaveLength(2);
      expect(result.current.tokens[0].displayValue).toBe('Bug');
      expect(result.current.tokens[1].displayValue).toBe('Feature');
    });

    it('derives token from date range value', () => {
      const { result } = setup({ period: { from: '2026-04-13T00:00:00Z', label: 'Last 24h' } });
      expect(result.current.tokens).toHaveLength(1);
      expect(result.current.tokens[0].displayValue).toBe('Last 24h');
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

    it('removes one value from multi-select', () => {
      const { result, onChange } = setup({ tags: ['bug', 'feature'] });
      act(() => result.current.tokens[0].remove());
      expect(onChange).toHaveBeenCalledWith({ tags: ['feature'] });
    });

    it('removes key when last multi-select value removed', () => {
      const { result, onChange } = setup({ tags: ['bug'] });
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
      expect(result.current.dropdown.open).toBe(false);
      expect(result.current.dropdown.items).toEqual([]);
    });

    it('opens with categories on focus', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      expect(result.current.dropdown.open).toBe(true);
      expect(result.current.dropdown.items).toHaveLength(4);
      expect(result.current.dropdown.items.map((i) => i.key)).toEqual([
        'status', 'tags', 'period', 'search',
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

    it('selects a value and closes for single select', () => {
      const { result, onChange } = setup();
      act(() => result.current.inputProps.onFocus());
      act(() => result.current.dropdown.select(result.current.dropdown.items[0]));
      act(() => result.current.dropdown.select(result.current.dropdown.items[1]));
      expect(onChange).toHaveBeenCalledWith({ status: 'error' });
      expect(result.current.dropdown.open).toBe(false);
    });

    it('stays open for multi-select after selecting', () => {
      const { result, onChange } = setup();
      act(() => result.current.inputProps.onFocus());
      const tagsItem = result.current.dropdown.items[1];
      act(() => result.current.dropdown.select(tagsItem));
      act(() => result.current.dropdown.select(result.current.dropdown.items[0]));
      expect(onChange).toHaveBeenCalledWith({ tags: ['bug'] });
      expect(result.current.dropdown.open).toBe(true);
    });

    it('enters text-entry mode for text filters', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      const searchItem = result.current.dropdown.items[3];
      act(() => result.current.dropdown.select(searchItem));
      expect(result.current.dropdown.state.mode).toBe('text-entry');
    });

    it('closes on close()', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      expect(result.current.dropdown.open).toBe(true);
      act(() => result.current.dropdown.close());
      expect(result.current.dropdown.open).toBe(false);
    });
  });

  describe('keyboard navigation', () => {
    function keyDown(result: any, key: string) {
      act(() => {
        result.current.inputProps.onKeyDown({
          key,
          preventDefault: vi.fn(),
        } as any);
      });
    }

    it('opens dropdown on ArrowDown when closed', () => {
      const { result } = setup();
      keyDown(result, 'ArrowDown');
      expect(result.current.dropdown.open).toBe(true);
    });

    it('navigates highlighted index with arrows', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
      expect(result.current.dropdown.highlightedIndex).toBe(0);
      keyDown(result, 'ArrowDown');
      expect(result.current.dropdown.highlightedIndex).toBe(1);
      keyDown(result, 'ArrowDown');
      expect(result.current.dropdown.highlightedIndex).toBe(2);
      keyDown(result, 'ArrowUp');
      expect(result.current.dropdown.highlightedIndex).toBe(1);
    });

    it('selects highlighted item on Enter', () => {
      const { result } = setup();
      act(() => result.current.inputProps.onFocus());
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
      expect(result.current.dropdown.open).toBe(false);
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
});
