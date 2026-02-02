# Color System Quick Reference

## Brand Colors

### Primary Cyan
```
#54b3d6  --brand-cyan         ████████  Main brand color
#6dc5e8  --brand-cyan-bright  ████████  Hover/active states
#3d8fb5  --brand-cyan-dim     ████████  Subtle accents
```

**Usage:**
- Primary buttons
- Links and accents
- Icon backgrounds: `bg-[--brand-cyan]/15` or `bg-[--brand-cyan]/20`
- Borders: `border-[--brand-cyan]/30`

---

## Background Colors

### Pure Black Base
```
#000000  --bg-primary    ████████  Main page background
#0a0a0a  --bg-secondary  ████████  Secondary surfaces
#141414  --bg-elevated   ████████  Cards, modals, elevated content
```

### Subtle Overlays
```
rgba(255,255,255,0.03)  --bg-subtle  ▓▓▓▓▓▓▓▓  Hover states, subtle backgrounds
```

**Usage:**
```tsx
// Page background (already set in layout)
style={{ backgroundColor: 'var(--bg-primary)' }}

// Card backgrounds (use utilities)
className="card-base"  // Includes gradient from white/5% to white/2%

// Hover states
className="hover:bg-white/[0.03]"
```

---

## Text Colors

### White with Opacity
```
#ffffff              --text-primary    ████████  100%  Headings, primary text
rgba(255,255,255,0.6) --text-secondary  ████████  60%   Body text, descriptions
rgba(255,255,255,0.4) --text-tertiary   ████████  40%   Labels, captions
rgba(255,255,255,0.25) --text-muted     ████████  25%   Disabled, placeholders
```

**Usage:**
```tsx
// Headings
className="text-white"
style={{ color: 'var(--text-primary)' }}

// Body text (most common)
className="text-white/60"
style={{ color: 'var(--text-secondary)' }}

// Labels, secondary info
className="text-white/40"
style={{ color: 'var(--text-tertiary)' }}

// Disabled/placeholder
className="text-white/25"
style={{ color: 'var(--text-muted)' }}
```

---

## Border Colors

### Subtle Dividers
```
rgba(255,255,255,0.1)  --border-primary    ▓▓▓▓▓▓▓▓  10%  Standard borders
rgba(255,255,255,0.05) --border-secondary  ▓▓▓▓▓▓▓▓  5%   Subtle dividers
rgba(84,179,214,0.3)   --border-accent     ████████  30%  Accent borders (cyan)
```

**Usage:**
```tsx
// Card borders (most common)
className="border border-white/10"

// Subtle dividers
className="border-b border-white/5"

// Accent borders (for special cards or hover states)
className="border border-[--brand-cyan]/30"
className="hover:border-[--brand-cyan]/30"
```

---

## Color Combinations

### Standard Card
```tsx
<div className="card-base">
  {/*
    Background: Gradient from white/5% to white/2%
    Border: white/10%
    Text: white/60%
  */}
</div>
```

### Accent Card (Cyan-tinted)
```tsx
<div className="card-accent">
  {/*
    Background: Gradient from cyan/10% to cyan/3%
    Border: cyan/30%
    Great for CTAs, featured content
  */}
</div>
```

### Icon with Colored Background
```tsx
{/* Cyan accent */}
<div className="w-12 h-12 bg-[--brand-cyan]/15 rounded-xl">
  <svg style={{ color: 'var(--brand-cyan)' }}>
    {/* Icon */}
  </svg>
</div>

{/* Neutral */}
<div className="w-12 h-12 bg-white/[0.05] rounded-xl">
  <svg className="text-white/60">
    {/* Icon */}
  </svg>
</div>
```

---

## Opacity Reference

Quick reference for Tailwind opacity utilities:

```
text-white      = rgba(255,255,255,1)    100%  ████████
text-white/80   = rgba(255,255,255,0.8)   80%  ████████
text-white/60   = rgba(255,255,255,0.6)   60%  ████████  ← Most common for body
text-white/40   = rgba(255,255,255,0.4)   40%  ████████  ← Labels
text-white/25   = rgba(255,255,255,0.25)  25%  ████████
text-white/10   = rgba(255,255,255,0.1)   10%  ████████

bg-white/[0.08] = rgba(255,255,255,0.08)  8%   ▓▓▓▓▓▓▓▓
bg-white/[0.05] = rgba(255,255,255,0.05)  5%   ▓▓▓▓▓▓▓▓  ← Neutral backgrounds
bg-white/[0.03] = rgba(255,255,255,0.03)  3%   ▓▓▓▓▓▓▓▓  ← Hover states

border-white/10 = rgba(255,255,255,0.1)   10%  ▓▓▓▓▓▓▓▓  ← Most common border
border-white/5  = rgba(255,255,255,0.05)  5%   ▓▓▓▓▓▓▓▓
```

---

## Common Patterns

### Page Header
```tsx
<p className="text-xs uppercase tracking-wider text-[--brand-cyan] mb-4">
  Section Label (cyan)
</p>
<h1 className="text-5xl font-bold text-white mb-6">
  Main Title (white)
</h1>
<p className="text-xl text-white/60">
  Description (60% white)
</p>
```

### Card Content
```tsx
<div className="card-base">
  <h3 className="text-2xl font-bold text-white mb-2">
    Card Title (white)
  </h3>
  <p className="text-white/60">
    Card description (60% white)
  </p>
  <div className="flex gap-2 mt-4">
    <span className="badge-base badge-secondary">
      Tag (5% white background, 50% white text)
    </span>
  </div>
</div>
```

### Link Styles
```tsx
{/* Standard link - cyan */}
<a href="#" className="text-[--brand-cyan] hover:text-[--brand-cyan-bright]">
  Read more
</a>

{/* Subtle link - stays white */}
<a href="#" className="text-white/60 hover:text-white transition-colors">
  Learn more
</a>
```

### Button Variants
```tsx
{/* Primary - cyan background, black text */}
<button className="btn-primary">
  Get Started
</button>

{/* Secondary - transparent bg, white border */}
<button className="btn-secondary">
  Learn More
</button>

{/* Ghost - minimal */}
<button className="btn-ghost">
  Cancel
</button>
```

---

## Color Testing Checklist

When using colors, verify:

- [ ] Text has sufficient contrast (60% opacity minimum for body)
- [ ] Hover states are visible but subtle
- [ ] Borders are visible but not overwhelming (10% opacity standard)
- [ ] Cyan accent is used sparingly for emphasis
- [ ] Backgrounds use very low opacity (3-8%)

---

## Avoiding Common Mistakes

❌ **Don't use these old patterns:**
```tsx
className="text-gray-600 dark:text-gray-300"
className="bg-gray-800"
className="border-gray-700"
className="text-blue-600 dark:text-blue-400"
```

✅ **Use these instead:**
```tsx
className="text-white/60"
className="bg-white/[0.03]"  or  className="card-base"
className="border-white/10"
className="text-[--brand-cyan]"
```

❌ **Don't mix old grays with new opacity system**
```tsx
<div className="bg-gray-800 text-white/60">
```

✅ **Be consistent**
```tsx
<div className="bg-white/[0.05] text-white/60">
```

---

## Quick Copy-Paste

```tsx
/* Brand cyan */
style={{ color: 'var(--brand-cyan)' }}
className="text-[--brand-cyan]"
className="bg-[--brand-cyan]/15"

/* Text colors */
className="text-white"           // Primary
className="text-white/60"        // Body (most common)
className="text-white/40"        // Tertiary
className="text-white/25"        // Muted

/* Backgrounds */
className="bg-white/[0.03]"      // Hover states
className="bg-white/[0.05]"      // Card sections
className="card-base"            // Standard card

/* Borders */
className="border-white/10"      // Standard
className="border-white/5"       // Subtle
className="border-[--brand-cyan]/30"  // Accent
```
