# Design System Specification

## 1. Overview & Creative North Star: "The Kinetic Architect"

This design system is built to bridge the gap between raw, athletic grit and sophisticated digital precision. Our Creative North Star, **"The Kinetic Architect,"** rejects the standard "app-on-a-grid" approach in favor of a UI that feels like a high-performance machine. 

We move beyond the template by employing a "High-End Editorial" aesthetic. This means leveraging aggressive typographic scales, intentional asymmetry, and depth created through tonal layering rather than structural lines. The layout should feel like a premium sports magazine—breathable, authoritative, and fast. We replace thin, weak borders with solid blocks of depth and use the vibrant orange primary accent to guide the eye like a laser through a darkened gym.

---

## 2. Colors & Surface Philosophy

The palette is rooted in deep charcoals and blacks to minimize eye strain in gym environments, punctuated by a high-energy "Ignition Orange."

### The "No-Line" Rule
To achieve a premium feel, **1px solid borders are strictly prohibited for sectioning.** We do not draw boxes; we define spaces. Boundaries must be created through background color shifts. A `surface-container-low` card sitting on a `surface` background provides all the separation necessary.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the Material `surface-container` tiers to create "nested" depth:
- **Base Level:** `surface` (#131313)
- **Secondary Level:** `surface-container-low` (#1C1B1B) for large background sections.
- **Interactive/Feature Level:** `surface-container-high` (#2A2A2A) for primary cards and actionable containers.
- **Topmost Priority:** `surface-bright` (#3A3939) for transient elements like modals or active states.

### The "Glass & Gradient" Rule
Floating elements (like navigation bars or top-level headers) should utilize **Glassmorphism**. Use `surface-container` colors at 70-80% opacity with a `backdrop-blur` of 20px-30px. 
**Signature Textures:** Main CTAs should never be flat orange. Apply a subtle linear gradient from `primary` (#FFB596) to `primary-container` (#F26411) at a 135-degree angle to give the element a metallic, light-catching "soul."

---

## 3. Typography: Editorial Authority

We use a dual-font strategy to balance performance and readability. We pair the industrial, condensed nature of **Barlow Condensed** (for headers) with the clean, modern versatility of **Inter** (for data).

*   **Display & Headlines (Barlow Condensed):** These are the "shouted" metrics. Use `display-lg` to `headline-sm` for weights, PRs, and titles. The condensed nature allows for high-impact numbers without consuming excessive horizontal space.
*   **Body & Labels (Inter):** All instructional text, input fields, and descriptions use Inter. This ensures high legibility during high-intensity workouts.

**Hierarchy as Brand:** Use `headline-lg` (2rem) for primary screen titles to establish immediate context. Use `label-sm` (0.6875rem) in uppercase with 5% letter spacing for secondary metadata to create a "technical blueprint" feel.

---

## 4. Elevation & Depth

We eschew traditional drop shadows for **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` card (#0E0E0E) inside a `surface-container-high` (#2A2A2A) section to create an "inset" look, perfect for data entry fields.
*   **Ambient Shadows:** When an element must float (e.g., a Start Workout button), use a shadow with a 24px blur at 6% opacity. The shadow color should be a tinted version of `on-surface` (#E5E2E1) rather than black, creating a natural glow rather than a muddy smudge.
*   **The "Ghost Border" Fallback:** If accessibility demands a border, use `outline-variant` (#594137) at 15% opacity. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** Gradient from `primary` to `primary-container`. Corner radius: `md` (0.75rem). Text: `title-sm` (Inter, Bold, Uppercase).
*   **Secondary:** `surface-container-highest` background with `on-surface` text. No border.
*   **Tertiary:** Transparent background, `primary` colored text, no container.

### Cards & Lists
*   **Rules:** Forbid divider lines. Use `1.5rem` (Spacing 6) of vertical white space or a shift from `surface` to `surface-container-low` to separate items.
*   **Workout Cards:** Use a `surface-container-high` base. Place the "Barlow Condensed" headline at the top-left and the "Ignition Orange" action icon at the top-right to create an asymmetrical flow.

### Input Fields
*   **Style:** `surface-container-lowest` background with a `sm` (0.25rem) corner radius. 
*   **Focus State:** Do not change the border color. Instead, shift the background to `surface-container-highest` and add a subtle `primary` glow to the icon.

### Fitness Specific: The "Performance Ring"
A custom component for tracking volume or set completion. Use a heavy stroke `secondary-container` ring with a `primary` (orange) progress indicator. The center should display `headline-md` typography.

---

## 6. Do's and Don'ts

### Do
*   **DO** use extreme typographic contrast. A massive `display-lg` number next to a tiny `label-sm` caption creates a professional, data-driven look.
*   **DO** use "Ignition Orange" sparingly. It is a beacon for action, not a background color.
*   **DO** utilize the full `xl` (1.5rem) corner radius for top-level modal sheets to make the app feel "friendly yet strong."

### Don't
*   **DON'T** use 100% white (#FFFFFF). Always use `on-surface` (#E5E2E1) to maintain the premium, high-end dark mode atmosphere.
*   **DON'T** use standard Material dividers. They clutter the UI and break the "Kinetic Architect" flow.
*   **DON'T** use standard icons. Use thick-stroke (2pt) icons with rounded caps to match the "rounded yet strong" brand personality.