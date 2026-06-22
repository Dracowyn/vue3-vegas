# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`vue3-vegas` is a Vue 3 port of [Vegas.js](https://github.com/jaysalvat/vegas) — a full-screen slideshow / background component published as an ESM npm library. The single public export is the `<Vegas>` component (plus its TypeScript types). It supports image & video slides, six built-in transitions, preloading, shuffle, a default-background intro, and an imperative play/pause/next/previous handle.

Package manager is **pnpm**. Code comments and debug logs are written in Chinese; keep that convention when editing.

## Commands

```bash
pnpm install              # install deps
pnpm dev                  # rslib watch-mode rebuild (library dev)
pnpm storybook            # Storybook dev server — primary way to preview/interact with the component
pnpm build                # production build: `rslib build && vue-tsc` (bundles + type-checks + emits .d.ts)
pnpm test                 # run vitest once
pnpm test:watch           # vitest watch mode

# Run a single test file or by name
pnpm vitest run tests/Vegas.test.ts
pnpm vitest run -t "renders the first slide even when autoplay is disabled"
```

There is no separate lint step — `strict` type checking (incl. `noUnusedLocals`/`noUnusedParameters`) runs via `vue-tsc` inside `pnpm build`.

## Build system

Built with **rslib** (Rsbuild/Rspack), configured in [rslib.config.ts](rslib.config.ts). The non-obvious part: `bundle: false` makes the output **preserve the `src/` file structure** instead of bundling into one file, so `src/` organization maps directly to the published package — keep modules small and cohesive. ESM-only; `.vue` compiled via `rsbuild-plugin-unplugin-vue`; `vue-tsc` emits declarations (`tsconfig` is `emitDeclarationOnly`).

## Architecture

`Vegas.vue` is a thin **orchestrator**: it owns props/defaults and the `isTransitioning` lock, then wires together a set of focused composables and presentational subcomponents. Almost all logic lives in [src/composables/](src/composables/); the `src/components/*` files are purely presentational.

Two orthogonal pieces of state drive everything:

### 1. Lifecycle phase — [useVegasLifecycle.ts](src/composables/useVegasLifecycle.ts)
A `phase` ref is the single source of truth for the startup/playback flow:

```
idle → preloading → showingDefaultBackground → firstSlide → playing ⇄ paused
```

The derived helpers (`shouldRenderSlides`, `showDefaultBackground`, `isDefaultBackgroundLeaving`, `isPlaying`, `isFirstTransition`) gate what `Vegas.vue`'s template renders. Key details:
- An incrementing `lifecycleId` cancels stale async sequences when relevant props change mid-flow (each `await` re-checks its captured id).
- The whole sequence starts in `onMounted` only — **never touch `window`/`document` at module/setup top level** (SSR / Nuxt hydration safety).
- `onPlay`/`onPause` callbacks are fired from a `watch(phase, …)` in `Vegas.vue`, not from inside the composable.

### 2. Slide position — [useVegasState.ts](src/composables/useVegasState.ts)
Owns which slide is visible and navigation. It maintains a `slideOrder` permutation array, `currentOrderIndex`, `currentSlide`, and `visibleSlides`. Navigation (`next`/`previous`/`goTo`) walks `slideOrder`, respects `loop`, and **re-shuffles on each loop wrap** (avoiding repeating the slide that just played). `next`/`previous` return a boolean indicating whether a transition actually started; `Vegas.vue` uses that to set the `isTransitioning` lock.

### Transition system — [useAnimationVariants.ts](src/composables/useAnimationVariants.ts)
Uses Vue's `<TransitionGroup :css="false">` with **JS enter/leave hooks** (a deliberate port of React's AnimatePresence approach). Each named variant (`fade`, `slideLeft`, `slideRight`, `zoomIn`, `zoomOut`, `zoomInOut`) is a factory returning `onEnter`/`onLeave` that imperatively set element styles and call `forceReflow` (a `offsetHeight` read — more reliable than `requestAnimationFrame` during hydration). Because TransitionGroup hooks receive the raw DOM element (not props), the per-slide transition **name and duration are passed via `data-transition-name` / `data-transition-duration` attributes** and read back off the element in the hook.

### Supporting composables
- [useAutoplay.ts](src/composables/useAutoplay.ts) — watches `isPlaying`/`isTransitioning`/`currentSlide`; schedules a per-slide `delay` timer that calls `next()`.
- [usePreload.ts](src/composables/usePreload.ts) — batched image preloading (`preloadImageBatch` concurrency) tracked in `loadedImages`/`loadProgress`, plus `<link rel="preload" as="video">` injection (cleaned up on unmount).
- [useVisibilityChange.ts](src/composables/useVisibilityChange.ts) — pauses on tab hide, resumes only if it was playing before.
- [useLogger.ts](src/composables/useLogger.ts) — debug-gated `console` wrappers; returns a no-op logger when `debug` is false.

### Conventions & gotchas
- **Composables receive getter functions** (`() => props.x`), not reactive values, to preserve reactivity across the boundary. Follow this pattern when adding/extending composables.
- `isTransitioning` is a lock held in `Vegas.vue`, auto-released by a `setTimeout(transitionDuration)` watcher. `next`/`previous`/`goTo` short-circuit while it's held to prevent overlapping switches.
- `preLoadImageBatch` is a **deprecated alias** for `preloadImageBatch` (`effectivePreloadImageBatch` resolves both, default 3).
- The parent container must have an explicit height — the component fills 100% width/height of its parent.
- [sanitizeUrl.ts](src/utils/sanitizeUrl.ts) escapes CSS `url()` values to prevent injection — use it for any URL interpolated into CSS.

## Testing

Vitest + `@vue/test-utils` in a `jsdom` environment ([vitest.config.ts](vitest.config.ts), setup in [tests/setup.ts](tests/setup.ts)). Tests rely heavily on **fake timers** (`vi.advanceTimersByTime`) to step the lifecycle/autoplay/transition timers — when adding timing-dependent behavior, drive it with the existing `advanceTimers`/`flushEffects` helpers in [tests/Vegas.test.ts](tests/Vegas.test.ts).
