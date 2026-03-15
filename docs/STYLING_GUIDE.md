# Styling Guide Documentation

## 📐 Overview

This project uses **Tailwind CSS v4** as the primary styling solution, providing a utility-first approach to building responsive, maintainable user interfaces.

## 🎨 Design System

### Color Palette

#### Primary Colors

**Amber (Brand Color)**:
- `amber-400` (#FFC107) - Primary actions, active states
- `amber-500` (#FFB300) - Hover states, emphasis
- Used for: Buttons, links, highlights, charts

**Usage**:
```typescript
<button className="bg-amber-400 hover:bg-amber-500">
  Primary Action
</button>
```

#### Semantic Colors

**Success (Green)**:
- `green-500` (#4CAF50) - Success states, active status
- `green-600` (#43A047) - Hover states
- Used for: Active badges, positive trends, success messages

**Danger (Red)**:
- `red-500` (#F44336) - Destructive actions, errors
- `red-600` (#E53935) - Hover states
- Used for: Delete buttons, error messages, out of stock

**Warning (Orange)**:
- `orange-500` (#FF9800) - Warning states, low stock
- `orange-600` (#FB8C00) - Hover states
- Used for: Warning badges, alerts, low inventory

**Info (Blue)**:
- `blue-500` (#2196F3) - Informational states
- `blue-600` (#1E88E5) - Hover states
- Used for: Info messages, links, pending status

#### Neutral Colors

**Gray Scale**:
- `gray-50` (#F5F5F5) - Background, subtle surfaces
- `gray-100` (#E0E0E0) - Borders, dividers
- `gray-200` (#BDBDBD) - Input backgrounds
- `gray-600` (#757575) - Secondary text
- `gray-700` (#616161) - Tertiary text
- `gray-900` (#212121) - Primary text

**White & Black**:
- `white` (#FFFFFF) - Cards, modals, primary surfaces
- `black` (#000000) - Text (rarely used directly)

### Typography

#### Font Family

**System Font Stack**:
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 
             "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, 
             "Open Sans", "Helvetica Neue", sans-serif;
```

**Benefits**:
- Native look and feel on each platform
- Optimal performance (no font loading)
- Excellent readability
- Consistent with OS

#### Font Sizes

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 0.75rem (12px) | Small labels, captions |
| `text-sm` | 0.875rem (14px) | Body text, buttons |
| `text-base` | 1rem (16px) | Default body text |
| `text-lg` | 1.125rem (18px) | Subheadings |
| `text-xl` | 1.25rem (20px) | Headings |
| `text-2xl` | 1.5rem (24px) | Page titles |
| `text-3xl` | 1.875rem (30px) | Hero text |

#### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Emphasis |
| `font-semibold` | 600 | Buttons, labels |
| `font-bold` | 700 | Headings |

#### Line Height

- `leading-tight` (1.25) - Headings
- `leading-normal` (1.5) - Body text (default)
- `leading-relaxed` (1.625) - Long-form content

### Spacing

#### Spacing Scale

Based on 4px base unit:

| Class | Size | Pixels |
|-------|------|--------|
| `p-1` / `m-1` | 0.25rem | 4px |
| `p-2` / `m-2` | 0.5rem | 8px |
| `p-3` / `m-3` | 0.75rem | 12px |
| `p-4` / `m-4` | 1rem | 16px |
| `p-6` / `m-6` | 1.5rem | 24px |
| `p-8` / `m-8` | 2rem | 32px |

#### Common Spacing Patterns

**Card Padding**:
```typescript
<div className="p-4 md:p-6">  // 16px mobile, 24px desktop
```

**Section Spacing**:
```typescript
<section className="mb-6">  // 24px bottom margin
```

**Grid Gaps**:
```typescript
<div className="grid gap-4">  // 16px gap between items
```

### Border Radius

#### Radius Scale

| Class | Size | Usage |
|-------|------|-------|
| `rounded` | 0.25rem (4px) | Small elements |
| `rounded-lg` | 0.5rem (8px) | Medium elements |
| `rounded-xl` | 0.75rem (12px) | Buttons, inputs |
| `rounded-2xl` | 1rem (16px) | Cards, modals |
| `rounded-full` | 9999px | Circles, pills |

#### Common Patterns

**Buttons**:
```typescript
<button className="rounded-xl">  // 12px radius
```

**Cards**:
```typescript
<div className="rounded-2xl">  // 16px radius
```

**Avatars**:
```typescript
<img className="rounded-full">  // Perfect circle
```

### Shadows

#### Shadow Scale

**Subtle Shadow** (Cards):
```typescript
className="shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
```

**Medium Shadow** (Elevated cards):
```typescript
className="shadow-sm"  // 0 1px 2px 0 rgb(0 0 0 / 0.05)
```

**Large Shadow** (Modals):
```typescript
className="shadow-md"  // 0 4px 6px -1px rgb(0 0 0 / 0.1)
```

**Hover Shadow** (Interactive elements):
```typescript
className="hover:shadow-md"
```

### Transitions

#### Duration

- `duration-200` - Fast (buttons, hovers)
- `duration-300` - Medium (modals, dropdowns)
- `duration-500` - Slow (page transitions)

#### Easing

- `ease-in-out` - Default smooth transition
- `ease-out` - Deceleration
- `ease-in` - Acceleration

#### Common Patterns

**Button Hover**:
```typescript
className="transition-all duration-200 hover:bg-amber-500"
```

**Modal Fade**:
```typescript
className="transition-opacity duration-300"
```

## 🧩 Component Patterns

### Buttons

#### Primary Button

```typescript
<button className="bg-amber-400 hover:bg-amber-500 text-white font-semibold rounded-xl px-4 py-2.5 transition-all duration-200 shadow-sm hover:shadow-md">
  Primary Action
</button>
```

**Breakdown**:
- `bg-amber-400` - Brand color background
- `hover:bg-amber-500` - Darker on hover
- `text-white` - White text
- `font-semibold` - Bold text (600)
- `rounded-xl` - 12px border radius
- `px-4 py-2.5` - Horizontal and vertical padding
- `transition-all duration-200` - Smooth transitions
- `shadow-sm hover:shadow-md` - Elevation on hover

#### Secondary Button

```typescript
<button className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-xl px-4 py-2.5 border border-gray-200 transition-all duration-200">
  Secondary Action
</button>
```

#### Danger Button

```typescript
<button className="bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl px-4 py-2.5 transition-all duration-200 shadow-sm hover:shadow-md">
  Delete
</button>
```

#### Ghost Button

```typescript
<button className="bg-transparent hover:bg-gray-100 text-gray-700 font-semibold rounded-xl px-4 py-2.5 transition-all duration-200">
  Cancel
</button>
```

### Cards

#### Standard Card

```typescript
<div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
  {/* Card content */}
</div>
```

**Breakdown**:
- `bg-white` - White background
- `rounded-2xl` - 16px border radius
- `p-6` - 24px padding
- `shadow-[...]` - Custom subtle shadow
- `border border-gray-100` - Light border

#### Metric Card (Dashboard)

```typescript
<div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 hover:shadow-md transition-shadow duration-200">
  <div className="flex items-center justify-between mb-4">
    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
      <DollarSign className="w-6 h-6 text-amber-500" />
    </div>
    <span className="text-green-500 text-sm font-semibold">+12.5%</span>
  </div>
  <h3 className="text-gray-600 text-sm font-medium mb-1">Ventas del día</h3>
  <p className="text-2xl font-bold text-gray-900">$2,450</p>
</div>
```

### Forms

#### Input Field

```typescript
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700">
    Product Name
  </label>
  <input
    type="text"
    className="w-full rounded-xl px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white transition-all duration-200 outline-none"
    placeholder="Enter product name"
  />
  <p className="text-xs text-gray-500">This field is required</p>
</div>
```

**Breakdown**:
- `w-full` - Full width
- `rounded-xl` - 12px border radius
- `px-4 py-2.5` - Padding
- `bg-gray-50` - Light background
- `border border-gray-200` - Border
- `focus:border-amber-400` - Amber border on focus
- `focus:ring-2 focus:ring-amber-100` - Focus ring
- `focus:bg-white` - White background on focus
- `outline-none` - Remove default outline

#### Select Dropdown

```typescript
<select className="w-full rounded-xl px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white transition-all duration-200 outline-none">
  <option>Select category</option>
  <option>Hamburguesas</option>
  <option>Pizzas</option>
</select>
```

#### Textarea

```typescript
<textarea
  rows={4}
  className="w-full rounded-xl px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white transition-all duration-200 outline-none resize-none"
  placeholder="Enter description"
/>
```

### Badges

#### Status Badge

```typescript
// Active
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
  Active
</span>

// Inactive
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
  Inactive
</span>

// Pending
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold">
  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
  Pending
</span>
```

### Tables

#### Data Table

```typescript
<div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
  <table className="w-full">
    <thead className="bg-gray-50 border-b border-gray-100">
      <tr>
        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Product
        </th>
        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Price
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      <tr className="hover:bg-gray-50 transition-colors duration-150">
        <td className="px-6 py-4 text-sm text-gray-900">
          Product Name
        </td>
        <td className="px-6 py-4 text-sm text-gray-900">
          $120
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Modals

#### Modal Overlay

```typescript
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
    <h2 className="text-xl font-bold text-gray-900 mb-4">
      Modal Title
    </h2>
    <p className="text-gray-600 mb-6">
      Modal content goes here
    </p>
    <div className="flex gap-3 justify-end">
      <button className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-xl px-4 py-2.5">
        Cancel
      </button>
      <button className="bg-amber-400 hover:bg-amber-500 text-white font-semibold rounded-xl px-4 py-2.5">
        Confirm
      </button>
    </div>
  </div>
</div>
```

## 📱 Responsive Design

### Breakpoints

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm:` | 640px | Small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large screens |

### Mobile-First Approach

**Always start with mobile styles, then add larger breakpoints**:

```typescript
// Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Common Responsive Patterns

#### Responsive Grid

```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Metric cards */}
</div>
```

#### Responsive Padding

```typescript
<div className="p-4 md:p-6 lg:p-8">
  {/* More padding on larger screens */}
</div>
```

#### Responsive Text

```typescript
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  Responsive Heading
</h1>
```

#### Hide/Show on Breakpoints

```typescript
<div className="hidden md:block">
  {/* Only visible on tablet and up */}
</div>

<div className="block md:hidden">
  {/* Only visible on mobile */}
</div>
```

## 🎯 Layout Patterns

### Container

```typescript
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Centered content with responsive padding */}
</div>
```

### Flexbox Layouts

**Horizontal Stack**:
```typescript
<div className="flex items-center gap-4">
  {/* Items aligned horizontally */}
</div>
```

**Vertical Stack**:
```typescript
<div className="flex flex-col gap-4">
  {/* Items stacked vertically */}
</div>
```

**Space Between**:
```typescript
<div className="flex items-center justify-between">
  <div>Left</div>
  <div>Right</div>
</div>
```

### Grid Layouts

**Equal Columns**:
```typescript
<div className="grid grid-cols-3 gap-4">
  {/* 3 equal columns */}
</div>
```

**Auto-fit Grid**:
```typescript
<div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
  {/* Responsive grid that fits items */}
</div>
```

## 🎨 Utility Classes Reference

### Display

- `block` - Display block
- `inline-block` - Display inline-block
- `flex` - Display flex
- `grid` - Display grid
- `hidden` - Display none

### Position

- `relative` - Position relative
- `absolute` - Position absolute
- `fixed` - Position fixed
- `sticky` - Position sticky

### Z-Index

- `z-0` - z-index: 0
- `z-10` - z-index: 10
- `z-20` - z-index: 20
- `z-50` - z-index: 50 (modals)

### Overflow

- `overflow-hidden` - Hide overflow
- `overflow-auto` - Auto scrollbars
- `overflow-scroll` - Always scrollbars

## 🔧 Custom Utilities

### Custom Shadow

```typescript
className="shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
```

### Custom Colors

```typescript
className="bg-[#FFC107]"  // Custom hex color
```

### Custom Spacing

```typescript
className="p-[18px]"  // Custom pixel value
```

## ✅ Best Practices

### DO

✅ Use Tailwind utility classes
✅ Follow mobile-first approach
✅ Use consistent spacing scale
✅ Leverage design tokens (colors, spacing)
✅ Use semantic color names
✅ Group related utilities
✅ Use responsive variants

### DON'T

❌ Write custom CSS unless absolutely necessary
❌ Use arbitrary values excessively
❌ Mix different spacing scales
❌ Use inline styles
❌ Ignore responsive design
❌ Use too many custom colors

### Code Organization

**Group utilities logically**:
```typescript
// Layout
className="flex items-center justify-between gap-4
// Spacing
p-6 mb-4
// Appearance
bg-white rounded-2xl shadow-sm border border-gray-100
// Interactive
hover:shadow-md transition-all duration-200"
```

## 🚀 Performance Tips

1. **Purge unused CSS** - Vite automatically removes unused Tailwind classes
2. **Use JIT mode** - Tailwind v4 uses JIT by default
3. **Avoid @apply** - Use utility classes directly
4. **Minimize custom CSS** - Stick to Tailwind utilities

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
