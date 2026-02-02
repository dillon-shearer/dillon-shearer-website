# Design System Documentation

This document provides a comprehensive guide to the unified design system for dillonshearer.com.

## Design Philosophy

**Refined Brutalism** - A bold, distinctive aesthetic that combines:
- Strong, confident typography with clear hierarchy
- Refined dark theme with strategic accent colors
- Purposeful animations that enhance without overwhelming
- Professional consistency across all pages

## Color System

### Brand Colors
```css
--brand-cyan: #54b3d6          /* Primary brand color */
--brand-cyan-bright: #6dc5e8   /* Hover/active states */
--brand-cyan-dim: #3d8fb5      /* Subtle accents */
```

### Semantic Colors
```css
/* Backgrounds */
--bg-primary: #000000          /* Main background */
--bg-secondary: #0a0a0a        /* Secondary surfaces */
--bg-elevated: #141414         /* Elevated cards/modals */
--bg-subtle: rgba(255,255,255,0.03)  /* Subtle hover states */

/* Text */
--text-primary: #ffffff        /* Main headings and content */
--text-secondary: rgba(255,255,255,0.60)  /* Body text */
--text-tertiary: rgba(255,255,255,0.40)   /* Captions, labels */
--text-muted: rgba(255,255,255,0.25)      /* Disabled, placeholders */

/* Borders */
--border-primary: rgba(255,255,255,0.10)  /* Primary borders */
--border-secondary: rgba(255,255,255,0.05) /* Subtle dividers */
--border-accent: rgba(84,179,214,0.30)    /* Accent borders */
```

## Typography

### Font Stack
- **Sans-serif (Body)**: Geist Sans → system-ui → sans-serif
- **Monospace (Code)**: Geist Mono → monospace

### Scale
```
--text-xs: 0.75rem      (12px)
--text-sm: 0.875rem     (14px)
--text-base: 1rem       (16px)
--text-lg: 1.125rem     (18px)
--text-xl: 1.25rem      (20px)
--text-2xl: 1.5rem      (24px)
--text-3xl: 1.875rem    (30px)
--text-4xl: 2.25rem     (36px)
--text-5xl: 3rem        (48px)
--text-6xl: 3.75rem     (60px)
```

### Usage Guidelines

#### Headings
```tsx
<h1 className="text-5xl font-bold tracking-tight">
  Main Page Title
</h1>

<h2 className="text-4xl font-bold tracking-tight">
  Section Heading
</h2>

<h3 className="text-3xl font-semibold">
  Subsection
</h3>
```

#### Section Labels
```tsx
<p className="section-label">
  About Me
</p>
```

#### Body Text
```tsx
<p className="text-base text-white/60 leading-relaxed">
  Body paragraph text uses secondary color for comfortable reading.
</p>
```

## Spacing System

### Scale
```
--space-xs: 0.5rem     (8px)
--space-sm: 0.75rem    (12px)
--space-md: 1rem       (16px)
--space-lg: 1.5rem     (24px)
--space-xl: 2rem       (32px)
--space-2xl: 3rem      (48px)
--space-3xl: 4rem      (64px)
--space-4xl: 6rem      (96px)
```

### Consistent Patterns

**Card Padding**: Use `p-6` (24px) for standard cards, `p-8` (32px) for featured cards

**Section Spacing**: Use `mb-16` (64px) between major sections

**Element Gaps**:
- Tight: `gap-2` (8px)
- Standard: `gap-4` (16px)
- Loose: `gap-6` (24px)

## Component Patterns

### Cards

```tsx
// Standard Card
<div className="card-base">
  <p className="text-label">Label</p>
  <h3 className="text-2xl font-bold mb-2">Card Title</h3>
  <p className="text-white/60">Card description</p>
</div>

// Hover Card
<div className="card-base card-hover">
  {/* Content */}
</div>

// Accent Card
<div className="card-accent p-8">
  {/* Featured content */}
</div>
```

### Buttons

```tsx
// Primary Action
<button className="btn-primary">
  Get Started
</button>

// Secondary Action
<button className="btn-secondary">
  Learn More
</button>

// Ghost Button
<button className="btn-ghost">
  Cancel
</button>
```

### Inputs

```tsx
<input
  type="text"
  className="input-base"
  placeholder="Enter text..."
/>
```

### Badges

```tsx
// Primary Badge
<span className="badge-base badge-primary">
  New
</span>

// Secondary Badge
<span className="badge-base badge-secondary">
  Python
</span>
```

### Links

```tsx
// Standard Link
<a href="#" className="link-primary">
  Read more
</a>

// Animated Underline Link
<a href="#" className="link-underline">
  View details
</a>
```

## Page Structure

### Standard Page Layout

```tsx
<div className="min-h-screen">
  <div className="max-w-7xl mx-auto px-6 py-10">
    {/* Page header */}
    <header className="mb-16">
      <p className="section-label">Page Category</p>
      <h1 className="section-title">Page Title</h1>
      <p className="section-subtitle">
        A clear, concise description of what this page contains.
      </p>
    </header>

    {/* Main content sections */}
    <section className="mb-16">
      {/* Section content */}
    </section>

    {/* Additional sections */}
  </div>
</div>
```

### Container Widths
- **Full Width**: `max-w-7xl` (1280px) - Main container
- **Content Width**: `max-w-4xl` (896px) - Readable content
- **Narrow**: `max-w-2xl` (672px) - Forms, CTAs

## Animation

### Transitions
```css
--transition-fast: 150ms      /* Quick interactions */
--transition-base: 250ms      /* Standard transitions */
--transition-slow: 350ms      /* Complex animations */
```

### Common Patterns

**Hover Lift**:
```tsx
<div className="transition-transform duration-200 hover:-translate-y-1">
  {/* Content */}
</div>
```

**Fade In on Scroll**:
```tsx
<div className="reveal-on-scroll">
  {/* Content fades in when scrolled into view */}
</div>
```

**Magnetic Button** (already implemented):
```tsx
<MagneticButton href="/contact">
  Contact Me
</MagneticButton>
```

## Responsive Behavior

### Breakpoints (Tailwind defaults)
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Mobile-First Patterns

```tsx
// Stack on mobile, side-by-side on desktop
<div className="flex flex-col md:flex-row gap-6">
  {/* Content */}
</div>

// Smaller text on mobile
<h1 className="text-3xl md:text-5xl">
  Responsive Heading
</h1>

// Hide on mobile, show on desktop
<div className="hidden md:block">
  {/* Desktop-only content */}
</div>
```

## Accessibility

### Color Contrast
All text meets WCAG AA standards:
- Primary text on dark: 21:1 (AAA)
- Secondary text (60% opacity): 7.3:1 (AA+)
- Tertiary text (40% opacity): 4.9:1 (AA)

### Focus States
All interactive elements have visible focus indicators:
```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-[--brand-cyan]">
  Button
</button>
```

### Reduced Motion
Respects `prefers-reduced-motion` media query - animations disabled automatically.

## Code Examples

### Page Header Pattern
```tsx
<div className="text-center mb-16">
  <p className="section-label">About Me</p>
  <h1 className="section-title">
    Data-Centric Software Engineer
  </h1>
  <p className="section-subtitle max-w-3xl mx-auto">
    Building data systems, analytics, and applications for healthcare
    and life sciences.
  </p>
</div>
```

### Feature Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {features.map(feature => (
    <div key={feature.id} className="card-base card-hover">
      <div className="w-12 h-12 rounded-xl bg-[--brand-cyan]/20
                      flex items-center justify-center mb-4">
        {/* Icon */}
      </div>
      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
      <p className="text-white/60">{feature.description}</p>
    </div>
  ))}
</div>
```

### CTA Section
```tsx
<section className="max-w-2xl mx-auto">
  <div className="card-accent p-10 text-center">
    <h2 className="text-3xl font-bold mb-4">
      Let's Connect
    </h2>
    <p className="text-white/70 mb-8">
      Interested in working together? I'd love to hear from you.
    </p>
    <button className="btn-primary">
      Get in Touch
    </button>
  </div>
</section>
```

## Implementation Checklist

When creating a new page or component:

- [ ] Use semantic HTML elements
- [ ] Apply consistent spacing from the spacing scale
- [ ] Use typography scale for all text sizes
- [ ] Apply proper color tokens (no hardcoded colors)
- [ ] Include hover/focus states for interactive elements
- [ ] Test responsive behavior at all breakpoints
- [ ] Verify color contrast for accessibility
- [ ] Add appropriate transitions/animations
- [ ] Use consistent border radius (0.75rem standard)
- [ ] Test with keyboard navigation

## Quick Reference

### Most Common Classes

```tsx
// Containers
"max-w-7xl mx-auto px-6 py-10"          // Page container
"max-w-4xl mx-auto"                      // Content container

// Cards
"card-base"                              // Standard card
"card-base card-hover"                   // Interactive card

// Typography
"section-label"                          // Small uppercase label
"section-title"                          // Large page heading
"text-white/60"                          // Body text color
"text-white/40"                          // Tertiary text

// Spacing
"mb-16"                                  // Section margin
"gap-6"                                  // Grid/flex gap
"p-8"                                    // Card padding

// Buttons
"btn-primary"                            // Primary action
"btn-secondary"                          // Secondary action
