import type { FilterTokensMessages } from '../types';

/**
 * English defaults for every user-visible string the package renders. Override
 * a subset by passing `messages` to `useFilterTokens` or to the `FilterTokens`
 * component — entries you don't override fall through to these.
 */
export const defaultMessages: FilterTokensMessages = {
  // Token
  tokenAria: (filter, value) => `${filter}: ${value}`,
  tokenRemoveAria: (filter, value) => `Remove ${filter}: ${value}`,
  tokenAddedAnnouncement: (filter, value) => `Added ${filter}: ${value}`,
  tokenRemovedAnnouncement: (filter, value) => `Removed ${filter}: ${value}`,

  // Popup
  popupListAria: 'Filters',
  popupBackAria: 'Back to filters',
  popupBackToFilterAria: (filter) => `Back to ${filter}`,
  popupErrorLabel: 'Failed to load options',
  popupRetryLabel: 'Retry',
  popupEmptyLabel: 'No results',
  popupTextEntryHint: (
    <>
      Press{' '}
      <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Enter</kbd>
      {' '}to apply,{' '}
      <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Esc</kbd>
      {' '}to cancel
    </>
  ),

  // Date
  dateFromLabel: 'Start',
  dateToLabel: 'End',
  dateSingleLabel: 'Date',
  dateInputAria: (filter, hasTime) => `${filter} date${hasTime ? ' and time' : ''}`,
  datePresetCustomLabel: 'Custom',
  datePresetCustomRangeLabel: 'Custom range',
  dateSinceFormat: (date) => `Since ${date}`,
  dateUntilFormat: (date) => `Until ${date}`,

  // Number
  numberMinLabel: 'Min',
  numberMaxLabel: 'Max',
  numberMinAria: (unit) => `Minimum value${unit ? ` (${unit})` : ''}`,
  numberMaxAria: (unit) => `Maximum value${unit ? ` (${unit})` : ''}`,

  // Universals
  clearAllAria: 'Clear all filters',
  cancelLabel: 'Cancel',
  applyLabel: 'Apply',
  typePlaceholder: (filter) => `Type ${filter}...`,
  searchPlaceholder: (filter) => `Search ${filter}...`,
};

/**
 * Shallow-merge a partial override on top of the English defaults. Every
 * field the user omits falls through to `defaultMessages` so consumers only
 * specify what changes.
 */
export function mergeMessages(
  overrides?: Partial<FilterTokensMessages>,
): FilterTokensMessages {
  if (!overrides) return defaultMessages;
  return { ...defaultMessages, ...overrides };
}
