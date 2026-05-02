# TV Layout Visual Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the existing `/tv` screen into a clock-first, calm public display without changing features, logic, Firebase usage, or the data model.

**Architecture:** Keep the existing route and component boundaries. Adjust Tailwind classes and minimal markup inside the existing TV layout components only.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS.

---

### Task 1: Set Clock-First Layout Proportions

**Files:**
- Modify: `src/components/tv/TvDisplayLayout.tsx`

- [ ] **Step 1: Update grid columns**

Use explicit percentages so the left panel is exactly `12%`, the right panel is `27%`, and the center takes the remaining space.

```tsx
<div className="mx-auto grid h-screen max-w-[1920px] grid-cols-[12%_1fr_27%] gap-4 px-6 py-6 2xl:gap-7 2xl:px-9 2xl:py-9">
```

- [ ] **Step 2: Reduce panel chrome**

Use light borders, no shadow-heavy cards, and keep the center column spaced without adding new sections.

### Task 2: Compress Left Identity Panel

**Files:**
- Modify: `src/components/tv/MosqueHeaderPanel.tsx`

- [ ] **Step 1: Remove icon and extra content**

Render only `ICMG`, `Bexley`, and a very low-emphasis subtitle if needed. Center vertically.

```tsx
<section className="flex h-full flex-col items-center justify-center text-center">
  <p>ICMG</p>
  <p>Bexley</p>
</section>
```

### Task 3: Make Clock Dominant And Dates Secondary

**Files:**
- Modify: `src/components/tv/ClockPanel.tsx`

- [ ] **Step 1: Increase clock size by about 30%**

Change `9rem` to around `11.75rem` and `11.5rem` to around `15rem`, with bold weight.

- [ ] **Step 2: Remove heavy date cards**

Place Gregorian and Hijri text below the clock as low-contrast secondary text with about 40% of the clock scale.

### Task 4: Quiet Ayah, Prayer, And Bottom Panels

**Files:**
- Modify: `src/components/tv/DailyContentPanel.tsx`
- Modify: `src/components/tv/PrayerTimesPanel.tsx`
- Modify: `src/components/tv/DonationPanel.tsx`
- Modify: `src/components/tv/AnnouncementBar.tsx`

- [ ] **Step 1: Reduce ayah padding and type**

Use lighter background, no strong border, about 25% less padding, and slightly smaller Arabic and translation text.

- [ ] **Step 2: Simplify prayer heading and rows**

Remove `Today`, reduce heading prominence, use light row separation, and keep prayer times readable.

- [ ] **Step 3: Increase donation amount**

Increase the donation amount from `5xl/6xl` to around `6xl/7xl`, and make labels smaller and secondary.

- [ ] **Step 4: Keep announcements minimal**

Reduce label importance and keep text readable without heavy card treatment.

### Task 5: Verify

**Files:**
- Output: `tv-layout-1920x1080.png`
- Output: `tv-layout-1366x768.png`

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: exit code `0`.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: exit code `0`.

- [ ] **Step 3: Capture screenshots**

Start Vite if needed and capture `/tv` at `1920x1080` and `1366x768`.
