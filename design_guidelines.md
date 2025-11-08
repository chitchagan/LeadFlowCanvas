# Lead Management System - Design Guidelines

## Design Approach: Modern Professional with Gradient Accents

**Primary Inspiration:** Modern SaaS dashboards (Stripe, Vercel, Linear) with gradient sophistication

**Core Principle:** Professional elegance with visual depth. Use gradients strategically to create engaging, modern interfaces that inspire confidence.

## Design Elements

### A. Color Palette

**Gradient-Enhanced Theme:**

**Primary Gradient:**
- Blue to Purple: `from-blue-600 via-indigo-600 to-purple-600`
- Accent Gradient: `from-cyan-500 to-blue-600`
- Success Gradient: `from-emerald-500 to-teal-600`
- Warning Gradient: `from-amber-500 to-orange-600`

**Base Colors:**
- Primary Blue: 217 91% 60% (#2B8CFF)
- Secondary Purple: 270 95% 70% (#A855F7)
- Accent Cyan: 189 94% 43% (#06B6D4)
- Success Green: 142 76% 45% (#10B981)
- Warning Amber: 38 92% 50% (#F59E0B)
- Danger Red: 0 84% 60% (#EF4444)

**Dark Mode (Primary):**
- Background: Deep gradient slate (#0F1419 to #1A1F2E)
- Surface: Cards with subtle gradient overlays
- Glass morphism: backdrop-blur with semi-transparent backgrounds
- Border: Soft glow effects using gradient borders

**Status Colors with Gradients:**
- Not Picked: Neutral gray (220 13% 45%)
- In Progress: Blue-to-indigo gradient
- Call Back Later: Amber-to-orange gradient
- Not Interested: Red gradient
- Completed: Green-to-teal gradient

### B. Typography

**Fonts:** Inter (primary UI), JetBrains Mono (metrics/code)

- Page Titles: 2.5rem/bold with gradient text effect
- Section Headers: 1.75rem/semibold
- Card Titles: 1.25rem/medium
- Body Text: 0.9375rem/normal
- Metrics/Stats: 3rem/bold (mono) with gradient
- Labels: 0.875rem/medium
- Secondary: 0.8125rem/normal (muted)

### C. Visual Effects

**Gradient Applications:**
1. **Headers & Hero Sections:** Full-width gradient backgrounds
2. **Stat Cards:** Subtle gradient borders or backgrounds
3. **Buttons:** Primary actions use gradient fills
4. **Charts:** Gradient-filled areas for visual impact
5. **Badges:** Gradient backgrounds for status indicators

**Glass Morphism:**
- Modal overlays with backdrop-blur-xl
- Floating cards with semi-transparent backgrounds
- Navigation bars with frosted glass effect

**Shadows & Depth:**
- Layered shadows for elevation (colored shadows matching gradients)
- Glow effects on hover (subtle gradient-based)
- Card elevation with gradient-enhanced shadows

### D. Component Styling

**Navigation:**
- Sidebar with subtle gradient overlay
- Active items highlighted with gradient accent
- Glass morphism header with blur effect

**Dashboards:**
- Stat cards with gradient borders
- Gradient headers for sections
- Animated gradient backgrounds on hover

**Data Tables:**
- Gradient header row
- Hover states with gradient highlight
- Status badges with gradient fills

**Forms:**
- Input focus states with gradient rings
- Submit buttons with gradient backgrounds
- Progress indicators with gradient fills

**Action Buttons:**
- Primary: Gradient background (blue-to-purple)
- Secondary: Gradient border with transparent fill
- Hover: Enhanced gradient with glow effect

### E. Interaction Patterns

**Animations:**
- Gradient shifts on hover
- Smooth color transitions
- Pulse effects for notifications
- Shimmer loading states

**Micro-interactions:**
- Button press: Gradient intensity increase
- Card hover: Gradient border reveal
- Success states: Green gradient pulse

### F. Accessibility

- Maintain WCAG AA contrast ratios
- Ensure gradients don't reduce readability
- Provide solid color fallbacks
- Test gradient visibility in different lighting

**Critical UX Patterns:**
- Gradient-enhanced loading states
- Animated gradient for processing actions
- Success confirmations with gradient celebrations
- Visual hierarchy through gradient intensity