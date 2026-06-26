# Design System — FoTell Prediction Markets

> Design tokens, typography, spacing, and component-level styling guidelines.

---

## 1. Colour Palette

### Base / Background

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#0d0f12` | Page / body background |
| `bg-surface` | `#1a1d23` | Cards, panels, modals |
| `bg-elevated` | `#22262f` | Dropdowns, tooltips, hover states |
| `bg-overlay` | `rgba(0,0,0,0.6)` | Modal backdrop |

### Text

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#f0f2f5` | Headlines, primary body copy |
| `text-primary` | `#8b92a5` | Labels, meta info, placeholders |
| `text-primary` | `#4a5063` | Disabled states, low-emphasis |
| `text-inverse` | `#0d0f12` | Text on light/coloured backgrounds |

### Brand & Accent

| Token | Hex | Usage |
|---|---|---|
| `accent-blue` | `#2196f3` | Primary CTA buttons, links, active states |
| `accent-blue-hover` | `#1976d2` | CTA hover |
| `accent-blue-dim` | `rgba(33,150,243,0.12)` | Button ghost backgrounds |

### Binary Outcome Colours

| Token | Hex | Usage |
|---|---|---|
| `yes-strong` | `#00c853` | YES price, positive PnL, winning labels |
| `yes-dim` | `rgba(0,200,83,0.15)` | YES badge backgrounds, chart fills |
| `no-strong` | `#ff1744` | NO price, negative PnL, losing labels |
| `no-dim` | `rgba(255,23,68,0.15)` | NO badge backgrounds, chart fills |

### System / Status

| Token | Hex | Usage |
|---|---|---|
| `success` | `#4caf50` | Success toasts, confirmations |
| `warning` | `#ff9800` | Warning alerts, PENDING status |
| `error` | `#f44336` | Error toasts, validation errors |
| `info` | `#29b6f6` | Info banners |

### Borders & Dividers

| Token | Value | Usage |
|---|---|---|
| `border-subtle` | `rgba(255,255,255,0.06)` | Card edges, section dividers |
| `border-active` | `rgba(255,255,255,0.18)` | Focused inputs, selected items |

---

## 2. Typography

### Font Families

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
```

### Type Scale

| Name | Size | Weight | Line-height | Usage |
|---|---|---|---|---|
| `display-xl` | 48px | 700 | 1.1 | Hero headlines |
| `display-lg` | 36px | 700 | 1.15 | Page titles |
| `heading-xl` | 24px | 600 | 1.3 | Section headers |
| `heading-lg` | 20px | 600 | 1.35 | Card titles |
| `heading-md` | 16px | 600 | 1.4 | Sub-headings |
| `body-lg` | 16px | 400 | 1.6 | Primary body text |
| `body-md` | 14px | 400 | 1.6 | Secondary body |
| `body-sm` | 12px | 400 | 1.5 | Labels, captions |
| `label` | 11px | 500 | 1.4 | ALL-CAPS labels |

### Numeric / Financial Text

All prices, odds, balances, and trade amounts must use:
```css
font-variant-numeric: tabular-nums;
font-family: var(--font-mono);
letter-spacing: -0.01em;
```

---

## 3. Spacing Scale

Uses an 8px base grid.

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Icon padding, tight gaps |
| `space-2` | 8px | Inline element gaps |
| `space-3` | 12px | Compact list items |
| `space-4` | 16px | Card internal padding |
| `space-5` | 20px | Section gaps |
| `space-6` | 24px | Card spacing |
| `space-8` | 32px | Section padding |
| `space-10` | 40px | Major section breaks |
| `space-12` | 48px | Page padding (mobile) |
| `space-16` | 64px | Page padding (desktop) |

---

## 4. Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 4px | Badges, chips, small tags |
| `radius-md` | 8px | Buttons, inputs, small cards |
| `radius-lg` | 12px | Cards, panels |
| `radius-xl` | 16px | Modals, drawers |
| `radius-full` | 9999px | Pills, avatar rings |

---

## 5. Shadows & Elevation

| Level | CSS | Usage |
|---|---|---|
| 0 | `none` | Flat surfaces |
| 1 | `0 1px 3px rgba(0,0,0,0.4)` | Input fields |
| 2 | `0 4px 12px rgba(0,0,0,0.5)` | Cards, dropdowns |
| 3 | `0 8px 24px rgba(0,0,0,0.6)` | Modals, popovers |
| 4 | `0 16px 48px rgba(0,0,0,0.7)` | Toasts, command palettes |

---

## 6. Button Styles

### Primary CTA

```
Background:   #2196f3
Text:         #ffffff
Border:       none
Border-radius: 8px
Padding:      10px 20px
Font:         body-md, weight 600
Hover:        bg #1976d2, box-shadow level-1
Active:       bg #1565c0, transform scale(0.98)
Disabled:     bg rgba(33,150,243,0.3), cursor not-allowed
```

### YES Button (Buy YES shares)

```
Background:   rgba(0,200,83,0.15)
Text:         #00c853
Border:       1px solid rgba(0,200,83,0.35)
Border-radius: 8px
Hover:        bg rgba(0,200,83,0.25), border rgba(0,200,83,0.6)
```

### NO Button (Buy NO shares)

```
Background:   rgba(255,23,68,0.15)
Text:         #ff1744
Border:       1px solid rgba(255,23,68,0.35)
Border-radius: 8px
Hover:        bg rgba(255,23,68,0.25), border rgba(255,23,68,0.6)
```

### Secondary / Ghost

```
Background:   transparent
Text:         #8b92a5
Border:       1px solid rgba(255,255,255,0.12)
Hover:        bg rgba(255,255,255,0.06), text #f0f2f5
```

### Danger

```
Background:   rgba(244,67,54,0.15)
Text:         #f44336
Border:       1px solid rgba(244,67,54,0.35)
Hover:        bg rgba(244,67,54,0.25)
```

### Icon Button

```
Background:   transparent
Padding:      8px
Border-radius: 8px
Hover:        bg rgba(255,255,255,0.08)
Size:         32×32px (small), 40×40px (default)
```

---

## 7. Input Styles

```
Background:       #22262f
Text:             #f0f2f5
Placeholder:      #4a5063
Border:           1px solid rgba(255,255,255,0.10)
Border-radius:    8px
Padding:          10px 14px
Focus border:     1px solid #2196f3
Focus shadow:     0 0 0 3px rgba(33,150,243,0.18)
Error border:     1px solid #f44336
Error shadow:     0 0 0 3px rgba(244,67,54,0.18)
```

---

## 8. Card Styles

```
Background:       #1a1d23
Border:           1px solid rgba(255,255,255,0.06)
Border-radius:    12px
Padding:          20px 24px
Hover:            border rgba(255,255,255,0.12), shadow level-2
```

---

## 9. Market Status Badges

| Status | Background | Text | Border |
|---|---|---|---|
| PENDING | `rgba(255,152,0,0.15)` | `#ff9800` | `rgba(255,152,0,0.3)` |
| OPEN | `rgba(0,200,83,0.15)` | `#00c853` | `rgba(0,200,83,0.3)` |
| CLOSED | `rgba(139,146,165,0.15)` | `#8b92a5` | `rgba(139,146,165,0.3)` |
| RESOLVED | `rgba(33,150,243,0.15)` | `#2196f3` | `rgba(33,150,243,0.3)` |

---

## 10. Probability / Price Display

```
YES price (≥50%):  #00c853, bold, 1.2rem
YES price (<50%):  #8b92a5, normal, 1.2rem
NO price (≥50%):   #ff1744, bold, 1.2rem
NO price (<50%):   #8b92a5, normal, 1.2rem
```

Binary probability bar:

```
Container:    h-2, border-radius full, bg #22262f
YES fill:     bg #00c853, left portion proportional to yes_price/100
NO fill:      bg #ff1744, right portion = (100 - yes_price)/100
Divider:      2px vertical line at midpoint, bg #1a1d23
```

---

## 11. Chart Styling

### Probability Timeline (LineChart)

```
Chart bg:     transparent
Grid lines:   rgba(255,255,255,0.05), dashed
Axes:         #4a5063, font-size 11px
YES line:     stroke #00c853, strokeWidth 2
NO line:      stroke #ff1744, strokeWidth 2
Area fill:    yes: rgba(0,200,83,0.08), no: rgba(255,23,68,0.08)
Tooltip bg:   #22262f, border rgba(255,255,255,0.12)
Crosshair:    rgba(255,255,255,0.15), dashed
```

### Volume Bar Chart

```
Bar fill YES:  rgba(0,200,83,0.6)
Bar fill NO:   rgba(255,23,68,0.6)
Hover fill:    full opacity variants
```

---

## 12. Tailwind CSS Configuration Snippet

```js
// tailwind.config.ts
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base:    '#0d0f12',
        surface: '#1a1d23',
        elevated:'#22262f',
        yes:    { DEFAULT: '#00c853', dim: 'rgba(0,200,83,0.15)' },
        no:     { DEFAULT: '#ff1744', dim: 'rgba(255,23,68,0.15)' },
        accent: { DEFAULT: '#2196f3', hover: '#1976d2' },
        border: { subtle: 'rgba(255,255,255,0.06)', active: 'rgba(255,255,255,0.18)' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '4px', md: '8px', lg: '12px', xl: '16px',
      },
    },
  },
}
```
