# Shadcn/UI Style Update - Implementation Guide

## Overview

This document outlines the changes made to ensure consistent styling across the VibeClean application using shadcn/ui best practices.

## Changes Made (2026-03-14)

### 1. New Components Added

| Component | Purpose | Status |
|-----------|---------|--------|
| `Accordion` | FAQ, collapsible sections | ✅ Added |
| `AlertDialog` | Delete confirmations | ✅ Added |
| `Collapsible` | Expandable content | ✅ Added |
| `ToggleGroup` | Option sets (2-7 choices) | ✅ Added |
| `Toggle` | Binary toggle states | ✅ Added |

```bash
npx shadcn@latest add accordion alert-dialog collapsible toggle-group
```

### 2. New StatusBadge Component

Created reusable `StatusBadge` component at `src/components/ui/status-badge.tsx`:

```tsx
import { StatusBadge } from "@/components/ui/status-badge";

// Usage examples
<StatusBadge variant="pending" label="Menunggu" icon={Clock} />
<StatusBadge variant="paid" label="Lunas" />
<StatusBadge variant="active" label="Aktif" icon={CheckCircle} />
```

Available variants:
- Order status: `pending`, `processing`, `washing`, `drying`, `ironing`, `ready`, `delivered`, `completed`, `cancelled`
- Payment status: `unpaid`, `partial`, `paid`, `refunded`
- Subscription: `active`, `trial`, `expired`
- Member tiers: `gold`, `platinum`

### 3. Fixed Violations

| Type | Before | After | Files |
|------|--------|-------|-------|
| Separator | `<div className="border-t">` | `<Separator />` | founder-sidebar.tsx |

### 4. Remaining Violations (For Future Fixes)

#### Space-y-* violations (304 files)
Pattern: Replace `space-y-*` with `gap-*` in flex containers

```tsx
// Before (wrong)
<div className="flex flex-col space-y-4">
  <Item1 />
  <Item2 />
</div>

// After (correct)
<div className="flex flex-col gap-4">
  <Item1 />
  <Item2 />
</div>
```

**Note**: `space-y-*` is acceptable in non-flex layouts. The shadcn rule targets flex containers specifically.

#### Raw Color violations (168 files)
Pattern: Replace raw colors like `bg-blue-100` with semantic tokens or Badge variants

```tsx
// Before (wrong)
<span className="bg-green-100 text-green-700">Lunas</span>

// After (correct) - Option 1: Badge component
<Badge variant="secondary">Lunas</Badge>

// After (correct) - Option 2: Semantic tokens
<span className="bg-primary/10 text-primary">Lunas</span>

// After (correct) - Option 3: StatusBadge (recommended)
<StatusBadge variant="paid" label="Lunas" />
```

## Best Practices Summary

### ✅ Do's
- Use `gap-*` for spacing in flex containers
- Use semantic tokens: `bg-primary`, `text-muted-foreground`, `border-border`
- Use `cn()` for conditional classes
- Use `size-*` for equal width/height
- Use `Separator` instead of `<div className="border-t">`
- Use `Skeleton` for loading states
- Use `Badge` for status indicators

### ❌ Don'ts
- Don't use raw Tailwind colors (`bg-blue-500`, `text-red-600`)
- Don't use `space-y-*` in flex containers
- Don't use custom z-index on overlay components
- Don't use `<hr>` - use `<Separator />`

## Files Updated

1. `src/components/ui/status-badge.tsx` - NEW
2. `src/components/layout/founder-sidebar.tsx` - Fixed Separator usage

## Components Installed

```
src/components/ui/accordion.tsx
src/components/ui/collapsible.tsx
src/components/ui/toggle.tsx
src/components/ui/toggle-group.tsx
src/components/ui/alert-dialog.tsx
src/components/ui/button.tsx (updated)
```

## Next Steps (Optional)

For gradual migration, prioritize fixing:

1. **High Priority**: Files with visible status badges (orders, billing, customers)
2. **Medium Priority**: Navigation components (space-y violations)
3. **Low Priority**: Forms and detailed dialogs

Use these commands to check progress:
```bash
# Count space-y violations
grep -r "space-y-" src --include="*.tsx" | wc -l

# Count raw color violations
grep -r "bg-blue-\|bg-green-\|bg-red-\|bg-yellow-\|bg-purple-" src --include="*.tsx" | wc -l
```

## References

- [Shadcn/UI Documentation](https://ui.shadcn.com)
- [Shadcn Styling Rules](./rules/styling.md)
- [Shadcn Composition Rules](./rules/composition.md)
