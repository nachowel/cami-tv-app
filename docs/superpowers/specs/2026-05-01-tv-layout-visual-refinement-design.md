## TV Layout Visual Refinement Design

Date: 2026-05-01
Route: `/tv`
Scope: Visual refinement only. No new features, no countdown logic, no Firebase, no data model changes.

### Goal

Refine the existing TV display so it reads as a calm public display rather than a dashboard or web app. The clock must become the dominant element at first glance, while prayer times, ayah content, branding, donation, and announcements remain legible but clearly secondary.

### Constraints

- Maintain compatibility at `1920x1080` and `1366x768`
- No overlapping content
- No changes to component responsibilities or data shape
- No new panels, interactions, or runtime logic
- Use whitespace, scale, and contrast instead of heavy cards, borders, or shadows

### Layout Structure

- Left panel width: fixed visual target of `12%`, never exceeding `14%`
- Right panel width: visual target between `26%` and `28%`
- Center column occupies the remaining width and becomes the primary focus zone
- Existing three-column structure remains, but column proportions and panel styling are refined to shift attention toward the center

### Left Panel

Purpose: preserve identity with minimal footprint.

- Remove the circular icon
- Keep only `ICMG` and `Bexley` as the primary identity text
- Optional low-emphasis subtitle is allowed only if it improves balance without adding noise
- Center content vertically within the rail
- Avoid heavy boxed styling; the rail should feel light and quiet

### Clock Block

Purpose: establish the strongest visual anchor on the screen.

- Remove any label above the clock
- Increase clock size by approximately `30%` from the current presentation
- Use bold or semibold weight
- Preserve strong contrast and clean spacing so the time is readable from distance
- Reduce surrounding visual competition rather than adding decoration

### Date Treatment

Purpose: support the clock without competing with it.

- Keep date information directly below the clock
- Reduce date scale to roughly `40%` of clock scale
- Use lower contrast than the clock
- Remove heavy card styling; date content should feel integrated and lightweight

### Ayah Panel

Purpose: remain supportive content rather than a focal card.

- Reduce padding by approximately `25%`
- Use a lighter background treatment or remove visible card framing
- Reduce text size slightly for both Arabic and translation
- Maintain clear reading order, but ensure the panel does not compete with the clock

### Right Panel: Prayer Times

Purpose: preserve readability while reducing panel weight.

- Remove `Today`
- Reduce heading prominence for prayer times
- Simplify rows by reducing border weight and visual density
- Keep spacing between rows clear and consistent
- Maintain strong time legibility while keeping the overall panel secondary to the clock

### Bottom Bar

Purpose: keep supporting information visible without breaking the calm hierarchy.

- Donation amount increases by approximately `20%`
- Donation label becomes smaller and more secondary
- Announcement presentation remains minimal and readable
- Bottom row should align visually with the lighter overall treatment of the screen

### Styling Direction

- Reduce shadows and border contrast throughout
- Favor subtle tonal separation over boxed dashboard cards
- Tighten spacing where panels currently feel oversized, especially in the left rail and ayah panel
- Preserve a calm, editorial composition with clear hierarchy:
  1. Clock
  2. Date
  3. Prayer times and donation amount
  4. Ayah and announcements
  5. Branding

### Testing And Verification

- Capture updated screenshots at `1920x1080` and `1366x768`
- Run typecheck/build after styling changes
- Verify no overlap, truncation regressions, or spacing collisions at both target resolutions

### Implementation Notes

- Prefer adjusting existing Tailwind layout proportions and panel classes
- Avoid introducing new components unless necessary for markup simplification within the existing structure
- Keep the refinement within existing `/tv` route components
