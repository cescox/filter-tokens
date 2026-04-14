# Filter Tokens

A tokenized filter input component for React. Built with [shadcn/ui](https://ui.shadcn.com) primitives.

Type or click to add filters. Each filter appears as a removable token inside the input. Supports multiple filter categories with typed values.

Inspired by the filter bars in Vercel, Linear, Datadog, and GitHub Issues.

> **Status:** Early development — API design in progress.

## The Problem

Every SaaS dashboard with a data table needs multi-category filtering. The existing solutions are either:
- Old and unmaintained (React 0.14 era, no TypeScript, no Tailwind)
- Proprietary (Vercel, Linear built their own)
- Too complex (full query builders when you just need category + value)

## The Vision

A single input that handles multiple filter categories:

```
┌──────────────────────────────────────────────────────────────┐
│ [Period: 24h ×] [Status: Error ×]  | Type to filter...      │
└──────────────────────────────────────────────────────────────┘
```

- Click or start typing → dropdown shows filter categories
- Pick a category → dropdown shows that category's values
- Select a value → appears as a removable token inside the input
- Tokens are keyboard-navigable and removable
- Works with TanStack Table, URL state, or standalone

## Tech Stack

- React 19+
- TypeScript
- Tailwind CSS
- shadcn/ui primitives (Command, Badge, Popover)
- Headless core with styled defaults

## License

MIT
