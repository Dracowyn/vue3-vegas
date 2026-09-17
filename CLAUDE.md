# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`vue3-vegas` is a Vue 3 port of [Vegas.js](https://github.com/jaysalvat/vegas) — a full-screen slideshow / background component published as an ESM npm library. Public exports: the `<Vegas>` component, its TypeScript types, and the lists of built-in effect names (`TRANSITION_NAMES`, `KEN_BURNS_NAMES`) and their type aliases. It supports image & video slides, 27 built-in transitions plus 9 Ken Burns animations (both selectable via `'random'`), preloading, shuffle, a default-background intro, and an imperative play/pause/next/previous handle.

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

**TypeScript is deliberately held at 6.x — do not bump it to 7.** TS 7 (the Go port) no longer ships the classic JS compiler API (`typescript/lib/tsc` is not exported), so `vue-tsc` crashes with `ERR_PACKAGE_PATH_NOT_EXPORTED` and `pnpm build` fails ([vuejs/language-tools#5381](https://github.com/vuejs/language-tools/issues/5381)). Its `>=5.0.0` peer range does not warn about this. Upgrade other deps with `pnpm update --latest '!typescript'` until an official vue-tsc release supports TS 7. `vite` is an explicit devDependency because vitest 5 made it a required peer.

## Architecture

`Vegas.vue` is a thin **orchestrator**: it owns props/defaults and the `isTransitioning` lock, then wires together a set of focused composables and presentational subcomponents. Almost all logic lives in [src/composables/](src/composables/); the `src/components/*` files are purely presentational. Effect definitions and non-reactive handlers live in [src/effects/](src/effects/).

Two orthogonal pieces of state drive everything:

### 1. Lifecycle phase — [useVegasLifecycle.ts](src/composables/useVegasLifecycle.ts)
A `phase` ref is the single source of truth for the startup/playback flow:

```
idle → preloading → showingDefaultBackground → firstSlide → playing ⇄ paused
```

The derived helpers (`shouldRenderSlides`, `showDefaultBackground`, `isDefaultBackgroundLeaving`, `isPlaying`, `isFirstTransition`) gate what `Vegas.vue`'s template renders. Key details:
- An incrementing `lifecycleId` cancels stale async sequences when relevant props change mid-flow (each `await` re-checks its captured id).
- The whole sequence starts in `onMounted` only — **never touch `window`/`document` at module/setup top level** (SSR / Nuxt hydration safety).
- Once the phase reaches `playing` or `paused`, it never re-enters the startup sequence (`preloading` → `showingDefaultBackground` → `firstSlide`); the watch at the bottom of the composable returns early. The new values still apply to later transitions; they just don't re-run startup. Changes *during* the startup sequence do restart it. The guard exists because `firstTransitionDuration` falls back to `transitionDuration`, so without it a mid-playback change to `transitionDuration` unmounted every slide, re-showed the default background and fired `onPlay` a second time.
- The first slide's image readiness check (`whenImageReady`) begins in parallel with preload and default-background phases, not serially after them, to avoid compounding wait times.
- `onPlay`/`onPause` callbacks are fired from a `watch(phase, …)` in `Vegas.vue`, not from inside the composable.

### 2. Slide position — [useVegasState.ts](src/composables/useVegasState.ts)
Owns which slide is visible and navigation. It maintains a `slideOrder` permutation array, `currentOrderIndex`, `currentSlide`, and `visibleSlides`. Navigation is split into two phases:
- **Plan** (`next`/`previous`/`goTo`): validates the request, cancels any prior pending request, and initiates a wait for the target slide's image to be ready (if it's an image slide; video slides commit immediately). Returns a boolean indicating whether the request was accepted.
- **Commit** (`commit()`, run once the image is ready, or immediately for video slides): the **only** place that writes position state. It updates `slideOrder` / `currentOrderIndex` / `visibleSlides` / `currentSlide`, fires `onWalk`, then calls `onCommit`, which is how `Vegas.vue` raises the transition lock. When `img.complete` is already true the commit happens **synchronously inside the `next()` call** — that is upstream's `_goto` semantics and most specs depend on it (`current()` is updated by the time `next()` returns). A failed image (`error`) commits too, so one broken URL cannot stall the show.

Navigation respects `loop` and **re-shuffles on each loop wrap** (avoiding repeating the slide that just played), but re-shuffle decisions are only written into `slideOrder` at commit time, so cancelled navigation plans leave no side effects. A new navigation request supersedes a pending one, and nothing holds the transition lock while waiting, so a slow image never makes the controls unresponsive.

Two separate watches rebuild state, on purpose. A `slide` / `shuffle` change re-initialises everything. A change in `slides.length` alone (lazy-loaded or paginated slides) keeps `currentSlide`: the order is rebuilt around it (under `shuffle`, re-shuffled with the current slide moved to index 0 so it is not repeated), and an index that fell out of range is clamped to the last slide without firing `onWalk`.

Either rebuild can land while a navigation is pending. The pending request must then be **re-issued against the rebuilt state (`pendingRetry`), never just cancelled**. If it is dropped, autoplay stalls for good: the timer that called `next()` is already spent, and none of `useAutoplay`'s watch sources (`isPlaying`, `isTransitioning`, `currentSlide`, the delay) changed, so nothing schedules another one. Only a request superseded by a newer navigation is dropped without a retry.

Replacing `slides` with a same-length array triggers neither rebuild, so when the awaited image settles, both gates (navigation and first slide) re-check that the target still wants the same `src` and start over if it does not. That restart is **capped at `MAX_STALE_IMAGE_RETRIES`, after which the current content is let through**. Do not remove the cap as dead code: `slides` is user input, and a `src` getter that returns a new value on every read never converges — the navigation side recurses synchronously into a stack overflow, the first-slide side spins in microtasks and starves the event loop. Pinned by [tests/imageGateConvergence.test.ts](tests/imageGateConvergence.test.ts).

### Transition system — [transitionHandlers.ts](src/effects/transitionHandlers.ts) and [transitionPresets.ts](src/effects/transitionPresets.ts)
Uses Vue's `<TransitionGroup :css="false">` with **JS enter/leave hooks**. The effect presets
live as pure data: 13 base presets (`from` / `to` / `out`), each derived into a `X` variant (incoming
slide only) and a `X2` variant (incoming enters while outgoing leaves), plus the vue3-vegas-only
`zoomInOut` — 27 names total, ported verbatim from the original `vegas.css`.
`getTransitionHandlers(name, durationMs)` is a pure function that reads the preset (or custom CSS class fallback)
and returns handler objects for the enter and leave hooks. Built-in presets imperatively apply styles,
calling `forceReflow` (an `offsetHeight` read — more reliable than `requestAnimationFrame` during hydration)
between the `from` and `to` states.

The per-slide transition **name and duration reach the enter hook via
`data-transition-name` / `data-transition-duration`** attributes, since TransitionGroup hooks
receive the raw DOM element rather than props. The **leave** hook instead reads
`currentTransitionName` off a ref — the leaving element still carries the *previous* slide's
attributes, but Vegas semantics say enter and leave share the *incoming* slide's transition.

Ken Burns animations are separate: 9 `@keyframes` blocks
([kenBurnsPresets.ts](src/effects/kenBurnsPresets.ts)) injected once into `document.head`
by [injectKeyframes.ts](src/utils/injectKeyframes.ts) from `onMounted`. They are applied to
the **inner** `img`/`video` inside `VegasSlideRenderer`, not the outer wrapper, so their
`transform` does not fight the transition's `transform`.

The `currentAnimationName` ref is only re-resolved when the `animationKey` computed changes
(slide index + *requested* animation name + register pool). This keeps `'random'` from
re-rolling on `phase` changes — which would restart a running Ken Burns from its 0% frame —
while still letting `animation` / `animationRegister` / `slides[i].animation` take effect
live. Never key that guard on the slide index alone.

### Stacking and CSS tuning variables
[constants/layers.ts](src/constants/layers.ts) owns the single `z-index` scale
(`defaultBackground 0 = slideLeaving 0 < slideEntering 1 < overlay 2 < timer 3 < loader 10`).
The root container sets `isolation: isolate`, so this scale is confined to the component and
never leaks into the host page's stacking. Inside it, though, all layers are siblings with no
intermediate stacking context, so the entering slide's `z-index: 1` — set by the enter hook and
deliberately *kept* after the animation settles — would hide the overlay and timer if those did
not sit above it. Add any new layer here, never with a literal.

The six tuning CSS custom properties (e.g. `--vegas-kenburns-scale`, `--vegas-blur-value`) and their defaults
are defined in [constants/cssVariables.ts](src/constants/cssVariables.ts). Presets consume them via the
`cssVar()` helper, which generates `var(--name, default)` forms with inline fallbacks — eliminating the need
for injected stylesheets and working even in strict CSP environments or if the element leaves the component's
scope. Users override them by setting the CSS custom property on `.vue3-vegas-root` or any ancestor; the
fallback only applies if the variable is not set. [constants/rootStyles.ts](src/constants/rootStyles.ts) no
longer injects styles at runtime.

### Supporting composables
- [useAutoplay.ts](src/composables/useAutoplay.ts) — watches `isPlaying`/`isTransitioning`/`currentSlide`/delay; schedules a per-slide `delay` timer that calls `next()`. The effective delay is resolved in `Vegas.vue` (`getSlideDelay`): a video slide with `delay: 'video'` uses `videoMaxDelay` as a fallback timer. Animation `'auto'` duration uses `getSlideBaseDelay`, never the fallback cap.
- [usePreload.ts](src/composables/usePreload.ts) — batched image preloading (`preloadImageBatch` concurrency) tracked in `loadProgress`, plus video preloading. The video half warms the HTTP cache with **detached `<video preload="auto">` elements** (the array of them must stay referenced or GC can abort the download; `releasePreloadVideos` empties the sources and re-`load()`s to cancel in-flight downloads on unmount). This mirrors upstream's `_video()`. Do **not** "simplify" it back to `<link rel="preload" as="video">` — `as="video"` is not a supported preload destination in Chrome or Safari and is no longer listed by MDN, so those links are silently ignored and the feature becomes a no-op. Only images gate startup; videos download in the background, as upstream does.
- [useVisibilityChange.ts](src/composables/useVisibilityChange.ts) — pauses on tab hide, resumes only if it was playing before.
- [useVideoAdvance.ts](src/composables/useVideoAdvance.ts) — **orchestration layer** for video lifecycle. `VegasSlideRenderer` merely reports events (`video-ended`, `video-failed` with slide index); this composable decides whether and when to actually transition to the next slide. It only acts on events from the current slide, checking `getAdvanceOnEnded()` and `getVideoLoop()` to determine whether the event should trigger an immediate advance (if `phase === 'playing'`) or a deferred one (pending the phase change to `'playing'`). The two triggers are deliberately asymmetric: `video-ended` advances a play-until-ended slide or one with `loop: false`; `video-failed` advances only a play-until-ended slide. The index check is done here rather than trusting that Vue drops `emit` from an unmounted (leaving) renderer. Its watcher uses **`flush: 'post'`, which is load-bearing**: a short video can end during the first-slide transition, and the deferred `next()` must run after the `watch(phase)` in `Vegas.vue` that fires `onPlay`. With `flush: 'sync'` the navigation commits inside the `phase.value = 'playing'` assignment and callbacks arrive as `onWalk(1)` → `onPlay(1)` instead of `onPlay(0)` → `onWalk(1)`; reordering the `watch()` calls does not fix it. Pinned by the callback-order spec in [tests/videoDelay.test.ts](tests/videoDelay.test.ts).
- [useLogger.ts](src/composables/useLogger.ts) — debug-gated `console` wrappers; returns a no-op logger when `debug` is false.

### Conventions & gotchas
- **Composables receive a single options object** with getter functions (`getXxx: () => props.x`), not reactive values, to preserve reactivity across the boundary and prevent parameter order mistakes. Each composable exports a `UseXxxOptions` interface. Follow this pattern when adding/extending composables.
- `isTransitioning` is a lock raised by the `onCommit` callback when a navigation is truly submitted (after its image is ready, if applicable), and auto-released by a `setTimeout(transitionDuration)` watcher. Navigation requests short-circuit during the lock to prevent overlapping switches, but the lock does not apply during the image-wait phase — a user can request a new navigation while an image is still loading.
- `preLoadImageBatch` is a **deprecated alias** for `preloadImageBatch` (`effectivePreloadImageBatch` resolves both, default 3).
- The parent container must have an explicit height — the component fills 100% width/height of its parent.
- [sanitizeUrl.ts](src/utils/sanitizeUrl.ts) escapes CSS `url()` values to prevent injection — use it for any URL interpolated into CSS.
- `slide.video` accepts the original's two shapes (`['a.mp4']` shorthand or `{ src, muted, loop }`). Always read it through [`resolveSlideVideo`](src/utils/videoSource.ts) rather than touching `slide.video.src` directly — it also returns `null` for an **empty** source list, which is what makes such a slide fall back to `<img>`. Anything that asks "is this a video slide?" must go through it too, or the two answers drift: `playsUntilEnded` in `Vegas.vue` would hand a sourceless slide the `videoMaxDelay` fallback timer (5 min of dead air) while the renderer shows an image.
- **When to wait for an image**: Use [getSlideImageWaitSrc](src/utils/slideImageWait.ts) to determine whether a navigation needs to wait for the slide's image to load before committing. It returns the URL if the slide is an image (not video, not empty), or `null` otherwise. Both navigation (`useVegasState`) and the first slide's entry (`useVegasLifecycle`) use this shared gate. Under the hood it calls `resolveSlideVideo` to detect video slides using the same logic as the renderer, so "is this a video slide?" stays consistent across boundaries. The actual wait is implemented by [whenImageReady](src/utils/imageReady.ts), which mirrors Vegas.js: `img.complete` (cache hit) triggers the callback synchronously; otherwise it waits for `load` or `error`.
- **Built-in effect names are a public contract.** `TRANSITION_NAMES` / `KEN_BURNS_NAMES` are exported from the package entry (frozen), and `VegasTransitionName` / `VegasAnimationName` are derived from the `satisfies`-typed preset tables in [src/effects/](src/effects/) — never hand-copy the 27 / 9 names. Downstream backends whitelist against these lists, and a value missing from a whitelist fails silently (it falls back to `fade`), so adding, renaming or removing an effect is a change that must be called out in the release notes. [tests/publicExports.test.ts](tests/publicExports.test.ts) pins the exact names and their order. `isVegasTransitionName` / `isVegasAnimationName` are exported alongside the lists as the whitelist-check entry point, narrowing a `string` to the respective type.
- The README is bilingual: English [README.md](README.md) (the only one npm and GitHub render) and Chinese [README.zh.md](README.zh.md). Any change to props, defaults, API or behavior notes goes into **both files in the same commit**, section for section. The English one links to the Chinese by absolute GitHub URL so the switch also works on the npm package page; keep it absolute. (npm packs every `README*` file regardless of `files`, so `README.zh.md` ships in the tarball too.)
- Unmuted video sound is cross-faded across the transition ([videoSound.ts](src/utils/videoSound.ts), porting the original's `_fadeInSound`/`_fadeOutSound`). The **enter** side lives in `VegasSlideRenderer`'s `onMounted` (it owns `videoRef`); the **leave** side must stay in `Vegas.vue`'s `handleSlideLeave`, which digs the `<video>` out of the detached element with `querySelector` — a leaving slide is off the `TransitionGroup` list and gets no further prop updates, so nothing else would ever `pause()` it.

## Testing

Vitest + `@vue/test-utils` in a `jsdom` environment ([vitest.config.ts](vitest.config.ts), setup in [tests/setup.ts](tests/setup.ts)). Tests rely heavily on **fake timers** (`vi.advanceTimersByTime`) to step the lifecycle/autoplay/transition timers — when adding timing-dependent behavior, drive it with the shared `advanceTimers`/`flushEffects` helpers in [tests/helpers.ts](tests/helpers.ts).

**Image readiness in jsdom**: `jsdom` does not actually load images — `new Image()` followed by `img.src = url` leaves `complete` permanently `false` and never fires `load` / `error`. Since navigation waits for target images via [whenImageReady](src/utils/imageReady.ts), every test that calls `next()` / `goTo()` would hang indefinitely. [tests/setup.ts](tests/setup.ts) installs a default mock `Image` class with `complete = true` to short-circuit the wait and simulate cache hits, allowing most tests to work synchronously. Tests that need to drive the actual wait behavior (e.g. [tests/imageGate.test.ts](tests/imageGate.test.ts)) replace `global.Image` with a controllable implementation and restore it afterward — they must not leave the override in place, as it would break other specs.

`@vue/test-utils` stubs `<TransitionGroup>` by default, so the JS enter/leave hooks do **not**
run in most specs. [tests/transitionHooks.test.ts](tests/transitionHooks.test.ts) opts out per
mount (`global.stubs: { transition: false, 'transition-group': false }`) to assert what the
hooks actually write to the element. Keep that opt-out local — flipping it in
[tests/setup.ts](tests/setup.ts) would perturb every other spec.
