# Bundle Optimization Report

Date: 2026-05-01

## Current Build Snapshot

From the current production build:

- main TV/client chunk: `dist/assets/index-D3be6xpv.js`
  - `537.72 kB` minified
  - `171.00 kB` gzip
- admin lazy chunk: `dist/assets/AdminPanel-fHFvU-Ek.js`
  - `110.71 kB` minified
  - `31.25 kB` gzip

The Vite chunk-size warning still fires because the main chunk remains above `500 kB`.

## How This Was Profiled

- Route-level lazy loading for `/admin` was already applied before this report.
- A sourcemap build was generated with `npx vite build --sourcemap`.
- The main chunk sourcemap was inspected by aggregating `sourcesContent` size by package/source group.

This is an approximate contribution view, but it is good enough to identify the biggest contributors safely.

## Top Suspected Contributors In The Main TV Bundle

Approximate source-content contribution by group:

- `@firebase/firestore`: `1,015,140`
- `react-dom`: `545,403`
- `react-router`: `363,837`
- `@firebase/util`: `74,648`
- `@firebase/webchannel-wrapper`: `53,135`
- `qrcode.react`: `44,840`
- `@firebase/app`: `44,505`
- `src/components`: `26,773`
- `react`: `18,589`

## Confirmed Findings

### 1. Firebase Firestore SDK is the main contributor

Yes. Firestore and its supporting Firebase packages are the largest suspected source of weight in the TV path.

This is expected because `/tv` now uses realtime Firestore subscriptions, which require the full Firestore client rather than a lighter one-shot client.

### 2. `/admin` code is no longer the main problem

After lazy loading, `/admin` now ships in its own chunk.

That reduced the initial main chunk, but it was not enough to remove the warning.

### 3. No evidence of date-library bloat

There is no imported date library on the TV path.

### 4. No icon-library bloat

There is no imported icon library on the TV path.

### 5. No animation-library bloat

There is no imported animation library on the TV path.

### 6. `qrcode.react` is present but not the main problem

It contributes some weight, but it is much smaller than Firestore, React DOM, and React Router.

## Low-Risk Optimization Options

### Option 1: Keep current behavior and accept the warning for now

This is the safest option.

Reason:

- `/tv` is an always-on public display
- realtime Firestore is a core requirement
- the current bundle warning is non-blocking
- the bundle already improved after splitting `/admin`

### Option 2: Reduce router cost by using a lighter TV-only entry strategy later

Potential direction:

- keep the full router for the app shell
- consider a dedicated `/tv` entry or more isolated routing setup later

Why this is low-to-medium risk instead of immediate:

- it changes application boot structure
- it needs care to avoid breaking refresh/navigation behavior

### Option 3: Revisit QR rendering dependency

Potential direction:

- replace `qrcode.react` with a smaller QR solution
- or pre-generate the QR markup/image outside the TV runtime path

This is smaller impact than Firestore, but still worth considering after bigger contributors.

## Risky Options To Avoid For Now

### 1. Replace Firestore realtime with Firestore Lite

Avoid for now.

Reason:

- Firestore Lite does not support realtime listeners
- that would change `/tv` behavior and break a core requirement

### 2. Aggressive manual chunking

Avoid for now.

Reason:

- it adds maintenance overhead
- it can create fragile or less predictable loading behavior
- the user request explicitly asked not to over-engineer chunking unless clearly useful

### 3. Large TV UI refactors just for bundle size

Avoid for now.

Reason:

- current TV UI itself is not the main size driver
- most weight is in runtime dependencies, especially Firestore

## Recommended Next Optimization

Recommended next step:

- **Do not refactor runtime behavior yet**
- keep the current `/admin` lazy split
- accept the current warning as non-blocking
- if a further reduction is needed later, investigate whether the app can support a more isolated `/tv` boot path with less React Router overhead

If another optimization pass is requested after this, the next safest place to investigate is:

1. router footprint on the TV entry path
2. QR dependency replacement
3. only then, more advanced bundling changes
