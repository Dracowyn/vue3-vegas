# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`vue3-vegas` is a Vue 3 port of [Vegas.js](https://github.com/jaysalvat/vegas) — a full-screen slideshow / background component published as an ESM npm library. The single public export is the `<Vegas>` component (plus its TypeScript types). It supports image & video slides, 27 built-in transitions plus 9 Ken Burns animations (both selectable via `'random'`), preloading, shuffle, a default-background intro, and an imperative play/pause/next/previous handle.

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
Uses Vue's `<TransitionGroup :css="false">` with **JS enter/leave hooks**. The effects
themselves live as pure data in [transitionPresets.ts](src/composables/transitionPresets.ts):
13 base presets (`from` / `to` / `out`), each derived into a `X` variant (incoming slide
only) and a `X2` variant (incoming enters while outgoing leaves), plus the vue3-vegas-only
`zoomInOut` — 27 names total, ported verbatim from the original `vegas.css`.
`useAnimationVariants` is a generic executor: `getHandlers(name, enterDurationMs)` reads the
preset and imperatively applies styles, calling `forceReflow` (an `offsetHeight` read — more
reliable than `requestAnimationFrame` during hydration) between the `from` and `to` states.

The per-slide transition **name and duration reach the enter hook via
`data-transition-name` / `data-transition-duration`** attributes, since TransitionGroup hooks
receive the raw DOM element rather than props. The **leave** hook instead reads
`currentTransitionName` off a ref — the leaving element still carries the *previous* slide's
attributes, but Vegas semantics say enter and leave share the *incoming* slide's transition.

Ken Burns animations are separate: 9 `@keyframes` blocks
([kenBurnsPresets.ts](src/composables/kenBurnsPresets.ts)) injected once into `document.head`
by [injectKeyframes.ts](src/utils/injectKeyframes.ts) from `onMounted`. They are applied to
the **inner** `img`/`video` inside `VegasSlideRenderer`, not the outer wrapper, so their
`transform` does not fight the transition's `transform`.

The `currentAnimationName` ref is only re-resolved when the `animationKey` computed changes
(slide index + *requested* animation name + register pool). This keeps `'random'` from
re-rolling on `phase` changes — which would restart a running Ken Burns from its 0% frame —
while still letting `animation` / `animationRegister` / `slides[i].animation` take effect
live. Never key that guard on the slide index alone.

### Stacking and injected root styles
[constants/layers.ts](src/constants/layers.ts) owns the single `z-index` scale
(`slideLeaving 0 < slideEntering 1 < overlay 2 < timer 3 < loader 10`). All layers are
siblings of one non-isolating root container, so the entering slide's `z-index: 1` — set by
the enter hook and deliberately *kept* after the animation settles — would hide the overlay
and timer if those did not sit above it. Add any new layer here, never with a literal.

The six tuning CSS custom properties live in
[constants/rootStyles.ts](src/constants/rootStyles.ts) and are injected via
`injectRootStyles` from the same `onMounted`, scoped to `:where(.vue3-vegas-root)` (a class
bound on the root element). They must **not** be inline styles: inline declarations beat any
selector, so users could not override them. `:where()` drops the specificity to 0 so any user
rule wins. This is safe ordering-wise because slides only render from the `firstSlide` phase,
which is reached after every `onMounted` in the tree has run.

### Supporting composables
- [useAutoplay.ts](src/composables/useAutoplay.ts) — watches `isPlaying`/`isTransitioning`/`currentSlide`; schedules a per-slide `delay` timer that calls `next()`. The effective delay is resolved in `Vegas.vue` (`getSlideDelay`): a video slide with `delay: 'video'` uses `videoMaxDelay` as a fallback timer, and `VegasSlideRenderer` advances early on `ended` (or when the last `<source>` errors) via the `advanceOnEnded` prop. Animation `'auto'` duration uses `getSlideBaseDelay`, never the fallback cap.
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

Vitest + `@vue/test-utils` in a `jsdom` environment ([vitest.config.ts](vitest.config.ts), setup in [tests/setup.ts](tests/setup.ts)). Tests rely heavily on **fake timers** (`vi.advanceTimersByTime`) to step the lifecycle/autoplay/transition timers — when adding timing-dependent behavior, drive it with the shared `advanceTimers`/`flushEffects` helpers in [tests/helpers.ts](tests/helpers.ts).

`@vue/test-utils` stubs `<TransitionGroup>` by default, so the JS enter/leave hooks do **not**
run in most specs. [tests/transitionHooks.test.ts](tests/transitionHooks.test.ts) opts out per
mount (`global.stubs: { transition: false, 'transition-group': false }`) to assert what the
hooks actually write to the element. Keep that opt-out local — flipping it in
[tests/setup.ts](tests/setup.ts) would perturb every other spec.
