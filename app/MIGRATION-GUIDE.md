# Design System Migration Guide

This guide will help you migrate existing pages to use the new unified design system.

## Quick Reference: Before & After

### Page Headers

**Before:**
```tsx
<div className="text-center mb-16">
  <h1 className="text-4xl font-bold mb-4">
    Page Title
  </h1>
  <p className="text-xl max-w-3xl mx-auto">
    Description text
  </p>
</div>
```

**After:**
```tsx
<div className="text-center mb-16">
  <p className="section-label">Category</p>
  <h1 className="section-title">
    Page Title
  </h1>
  <p className="section-subtitle max-w-3xl mx-auto">
    Description text
  </p>
</div>
```

### Colors

**Before:**
```tsx
className="text-gray-600 dark:text-gray-300"
className="bg-gray-50 dark:bg-gray-800"
className="border-gray-200 dark:border-gray-700"
```

**After:**
```tsx
style={{ color: 'var(--text-secondary)' }}
className="card-base"
style={{ borderColor: 'var(--border-primary)' }}
```

Or use Tailwind utilities with opacity:
```tsx
className="text-white/60"
className="bg-white/[0.03]"
className="border-white/10"
```

### Cards

**Before:**
```tsx
<div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
  {/* Content */}
</div>
```

**After:**
```tsx
<div className="card-base">
  {/* Content */}
</div>

{/* Or for hover effects */}
<div className="card-base card-hover">
  {/* Content */}
</div>

{/* Or for accent cards */}
<div className="card-accent p-8">
  {/* Content */}
</div>
```

### Buttons

**Before:**
```tsx
<button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
  Click Me
</button>
```

**After:**
```tsx
<button className="btn-primary">
  Click Me
</button>

{/* Or secondary */}
<button className="btn-secondary">
  Learn More
</button>

{/* Or ghost */}
<button className="btn-ghost">
  Cancel
</button>
```

### Inputs

**Before:**
```tsx
<input
  type="text"
  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
  placeholder="Enter text"
/>
```

**After:**
```tsx
<input
  type="text"
  className="input-base"
  placeholder="Enter text"
/>
```

### Typography

**Before:**
```tsx
<h2 className="text-2xl font-bold mb-4">Section Title</h2>
<p className="text-gray-600 dark:text-gray-300">Body text</p>
<p className="text-sm uppercase tracking-wide text-gray-500">Label</p>
```

**After:**
```tsx
<h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
  Section Title
</h2>
<p style={{ color: 'var(--text-secondary)' }}>Body text</p>
<p className="text-label">Label</p>

{/* Or use Tailwind opacity utilities */}
<h2 className="text-3xl font-bold mb-4 text-white">Section Title</h2>
<p className="text-white/60">Body text</p>
<p className="text-xs uppercase tracking-wider text-white/40">Label</p>
```

### Badges/Pills

**Before:**
```tsx
<span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
  Tag
</span>
```

**After:**
```tsx
<span className="badge-base badge-primary">
  Tag
</span>

{/* Or secondary */}
<span className="badge-base badge-secondary">
  Tag
</span>
```

### Links

**Before:**
```tsx
<a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
  Read more
</a>
```

**After:**
```tsx
<a href="#" className="link-primary">
  Read more
</a>

{/* Or with animated underline */}
<a href="#" className="link-underline">
  Read more
</a>
```

### Icons with Background

**Before:**
```tsx
<div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400">
    {/* ... */}
  </svg>
</div>
```

**After:**
```tsx
<div className="w-11 h-11 bg-[--brand-cyan]/15 rounded-xl flex items-center justify-center">
  <svg className="w-5 h-5" style={{ color: 'var(--brand-cyan)' }}>
    {/* ... */}
  </svg>
</div>

{/* Or for neutral icons */}
<div className="w-11 h-11 bg-white/[0.05] rounded-xl flex items-center justify-center">
  <svg className="w-5 h-5 text-white/60">
    {/* ... */}
  </svg>
</div>
```

### Spacing

**Before:**
```tsx
className="mb-8 space-y-6 gap-4"
```

**After (use consistent spacing scale):**
```tsx
className="mb-16 space-y-6 gap-6"
// Common patterns:
// - mb-16 for section spacing
// - gap-6 for grid/flex gaps
// - space-y-6 for vertical stacking
// - p-6 or p-8 for card padding
```

## Migration Checklist for Each Page

1. **Update page structure**
   - [ ] Add `section-label` to page headers
   - [ ] Use `section-title` for main headings
   - [ ] Use `section-subtitle` for descriptions

2. **Replace color classes**
   - [ ] Replace `text-gray-X dark:text-gray-Y` with `text-white/60` or CSS variables
   - [ ] Replace `bg-gray-X dark:bg-gray-Y` with `bg-white/[0.03]` or CSS variables
   - [ ] Replace `border-gray-X dark:border-gray-Y` with `border-white/10`
   - [ ] Update blue/accent colors to use `#54b3d6` (brand cyan)

3. **Update components**
   - [ ] Replace custom card styling with `card-base`, `card-hover`, or `card-accent`
   - [ ] Replace button classes with `btn-primary`, `btn-secondary`, or `btn-ghost`
   - [ ] Replace input classes with `input-base`
   - [ ] Replace badge/pill classes with `badge-base badge-primary` or `badge-secondary`

4. **Standardize spacing**
   - [ ] Use consistent spacing scale (8px increments)
   - [ ] Section margins: `mb-16` (64px)
   - [ ] Card padding: `p-6` (24px) or `p-8` (32px)
   - [ ] Grid/flex gaps: `gap-6` (24px)

5. **Update typography**
   - [ ] Ensure headings use proper size scale (`text-3xl`, `text-4xl`, `text-5xl`)
   - [ ] Add `font-bold` or `font-semibold` to headings
   - [ ] Use `text-white/60` for body text
   - [ ] Use `text-white/40` for tertiary text

6. **Add transitions**
   - [ ] Add hover states to interactive elements
   - [ ] Use `transition-all duration-200` or `duration-300`
   - [ ] Consider adding `hover:-translate-y-1` for cards

## Component-Specific Patterns

### Feature Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {features.map(feature => (
    <div key={feature.id} className="card-base card-hover">
      <div className="w-12 h-12 rounded-xl bg-[--brand-cyan]/20 flex items-center justify-center mb-4">
        {/* Icon */}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-white">
        {feature.title}
      </h3>
      <p className="text-white/60 leading-relaxed">
        {feature.description}
      </p>

      {/* Optional: Skills/Tags */}
      <div className="flex flex-wrap gap-2 mt-4">
        {feature.skills.map(skill => (
          <span key={skill} className="badge-base badge-secondary">
            {skill}
          </span>
        ))}
      </div>
    </div>
  ))}
</div>
```

### Two-Column Layout

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div className="card-base">
    {/* Left content */}
  </div>
  <div className="card-base">
    {/* Right content */}
  </div>
</div>
```

### CTA Section

```tsx
<section className="max-w-2xl mx-auto">
  <div className="card-accent p-10 text-center">
    <h2 className="text-3xl font-bold mb-4 text-white">
      Ready to Get Started?
    </h2>
    <p className="text-white/70 mb-8 leading-relaxed">
      Let's work together on your next project.
    </p>
    <button className="btn-primary">
      Get in Touch
    </button>
  </div>
</section>
```

### Contact Links

```tsx
<div className="space-y-3">
  <a
    href="mailto:email@example.com"
    className="flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-white/[0.03]"
  >
    <div className="w-11 h-11 bg-[--brand-cyan]/15 rounded-xl flex items-center justify-center">
      {/* Icon */}
    </div>
    <div>
      <p className="font-semibold text-sm text-white">Email</p>
      <p className="text-sm text-white/60">email@example.com</p>
    </div>
  </a>
</div>
```

## Testing After Migration

1. **Visual checks**
   - [ ] All text is readable with proper contrast
   - [ ] Spacing feels consistent across sections
   - [ ] Hover states work on interactive elements
   - [ ] Colors match the brand cyan (#54b3d6)

2. **Responsive checks**
   - [ ] Layout works at mobile (375px)
   - [ ] Layout works at tablet (768px)
   - [ ] Layout works at desktop (1280px+)

3. **Dark mode** (should work automatically)
   - [ ] No white backgrounds showing through
   - [ ] All colors use CSS variables or opacity utilities

## Common Pitfalls

❌ **Don't mix old and new patterns**
```tsx
// Bad - mixing gray colors with new system
<div className="bg-gray-800 text-white/60">
```

✅ **Use consistent system**
```tsx
// Good - all from design system
<div className="card-base text-white/60">
```

❌ **Don't hardcode spacing**
```tsx
// Bad
<div className="mb-7 gap-5">
```

✅ **Use spacing scale**
```tsx
// Good
<div className="mb-8 gap-6">
```

❌ **Don't forget hover states**
```tsx
// Bad - no hover feedback
<button className="btn-primary">Click</button>
```

✅ **Add hover states**
```tsx
// Good - hover effect included in btn-primary class
<button className="btn-primary">Click</button>
```

## Need Help?

- Reference `design-system.md` for full documentation
- Check `contact/page.tsx` for a complete migration example
- Look at `global.css` for all available utility classes
- CSS variables are defined at the top of `global.css`
