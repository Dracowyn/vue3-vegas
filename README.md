# vue3-vegas

English | [简体中文](https://github.com/Dracowyn/vue3-vegas/blob/master/README.zh.md)

> [Vegas.js](https://github.com/jaysalvat/vegas) for Vue 3 — a full-screen slideshow / background component

A Vue 3 rewrite of the original Vegas.js, with image and video slides, built-in transitions, preloading and shuffle.

---

## Features

- Image & video slides (with sound fade-in / fade-out for unmuted videos)
- 27 built-in transitions: 26 match the original Vegas.js one-to-one, plus the extra `zoomInOut`
- 9 Ken Burns animations (slow zoom and pan)
- `transition` / `animation` accept `'random'` (custom names added through the register props join the random pool) or an array (one entry is picked at random)
- Custom transitions / Ken Burns animations defined as CSS classes
- Per-slide transition, duration and delay
- Default background image that cross-fades into the first slide
- Shuffle
- Preloading (batched image preloading + video preloading)
- Progress bar at the top (timer)
- Semi-transparent overlay
- Loading progress indicator
- Pauses automatically when the page is hidden, resumes when it becomes visible again
- Imperative API: play / pause / toggle / next / previous / goTo, plus playing() / current() state queries
- Full TypeScript types

---

## Installation

**npm**

```bash
npm install vue3-vegas
```

**yarn**

```bash
yarn add vue3-vegas
```

**pnpm**

```bash
pnpm add vue3-vegas
```

---

## Basic usage

```vue
<script setup lang="ts">
import { Vegas } from 'vue3-vegas'
</script>

<template>
  <div style="height: 100vh">
    <Vegas
      :slides="[
        { src: 'https://example.com/photo1.jpg' },
        { src: 'https://example.com/photo2.jpg' },
        { src: 'https://example.com/photo3.jpg' },
      ]"
    />
  </div>
</template>
```

> The parent container must have an explicit height. Vegas fills 100% of its parent's width and height.

---

## Props

### Core

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `slides` | `SlideProps[]` | — | **Required.** The list of slides |
| `slide` | `number` | `0` | Index of the initial slide |
| `autoplay` | `boolean` | `true` | Whether to play automatically |
| `delay` | `number` | `5000` | How long each slide stays on screen (ms) |
| `videoMaxDelay` | `number` | `300000` | Maximum time (ms) a video slide with `delay: 'video'` stays on screen, so a stalled video can't hold up the slideshow |
| `loop` | `boolean` | `true` | Whether to loop |
| `shuffle` | `boolean` | `false` | Whether to play the slides in random order |

### Transitions

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `transition` | `string \| string[]` | `'fade'` | Transition used when switching slides. With an array, one entry is picked at random on each switch |
| `transitionDuration` | `number` | `1000` | Transition duration (ms) |
| `firstTransition` | `string \| string[] \| null` | `null` | Entrance effect of the first slide; falls back to `transition` when not set |
| `firstTransitionDuration` | `number \| null` | `null` | Entrance duration of the first slide (ms); falls back to `transitionDuration` when not set |

**Available transitions:**

| Base name | Description |
|-----------|-------------|
| `fade` | Fades in |
| `blur` | From blurred to sharp |
| `flash` | Enters with a bright white flash |
| `negative` | From an inverted negative to normal |
| `burn` | From high contrast and saturation to normal |
| `slideLeft` | Slides in from right to left |
| `slideRight` | Slides in from left to right |
| `slideUp` | Slides in from bottom to top |
| `slideDown` | Slides in from top to bottom |
| `zoomIn` | Scales up from 0 to full size |
| `zoomOut` | Scales down from 2× to full size |
| `swirlLeft` | Enters scaling down from 2× while rotating counter-clockwise (`35deg` → `0deg`) |
| `swirlRight` | Enters scaling down from 2× while rotating clockwise (`-35deg` → `0deg`) |

Every base name has a variant with a `2` suffix (e.g. `fade2`, `swirlLeft2`):

- **No suffix** (`fade`): Only the incoming slide animates; the outgoing one stays in place until it is removed.
- **`2` suffix** (`fade2`): While the new slide enters, the old one plays the reverse animation to leave.

There is also `zoomInOut` (keeps zooming in slowly after entering). It is a vue3-vegas extension and not part of the original.

`transition: 'random'` picks from all built-in transitions; an array (e.g. `['fade', 'slideLeft']`) picks
only from that array. For `transitionRegister`, see [Custom transitions / animations](#custom-transitions--animations) below.

### Ken Burns animations

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `animation` | `string \| string[] \| null` | `null` | Ken Burns animation name; `null` disables it. With an array, one entry is picked at random on each switch |
| `animationDuration` | `number \| 'auto'` | `'auto'` | Animation duration (ms). `'auto'` uses the slide's `delay` (the global `delay` when the slide uses `delay: 'video'`) |
| `transitionRegister` | `string[]` | — | Registers custom transition names and adds them to the built-in pool used by `transition: 'random'` |
| `animationRegister` | `string[]` | — | Registers custom animation names and adds them to the built-in pool used by `animation: 'random'` |

Available animations: `kenburns`, `kenburnsUp`, `kenburnsDown`, `kenburnsLeft`, `kenburnsRight`, `kenburnsUpLeft`, `kenburnsUpRight`, `kenburnsDownLeft`, `kenburnsDownRight`.

### Custom transitions / animations

You can also define your own transitions and animations with CSS classes, the same way as in the original Vegas.js.

**Custom transitions**: Register a name with `transitionRegister`. During a switch the component adds class names to the
elements in sequence, and all the styles (initial, target and leaving state) come from your CSS:

- The entering element first gets `vegas-transition-{name}`, then (on the next frame) `vegas-transition-{name}-in` along with
  `transition: all {duration}ms`. Treat the styles in `vegas-transition-{name}` as the initial state and the styles in
  `vegas-transition-{name}-in` as the target state.
- The leaving element gets `vegas-transition-{name}-out` with the same `transition`.

```vue
<template>
	<Vegas
		:slides="slides"
		transition="myFade"
		:transition-register="['myFade']"
	/>
</template>

<style>
.vegas-transition-myFade {
	opacity: 0;
	filter: grayscale(1);
}
.vegas-transition-myFade-in {
	opacity: 1;
	filter: grayscale(0);
}
.vegas-transition-myFade-out {
	opacity: 0;
}
</style>
```

**Custom animations**: Register a name with `animationRegister`. The inner media element gets the `vegas-animation-{name}` class
and its `animationDuration` is set; you define the `@keyframes` in your own CSS:

```vue
<template>
	<Vegas
		:slides="slides"
		animation="myZoom"
		:animation-register="['myZoom']"
	/>
</template>

<style>
.vegas-animation-myZoom {
	animation-name: myZoom;
	animation-timing-function: ease-out;
	animation-fill-mode: forwards;
}
@keyframes myZoom {
	from { transform: scale(1); }
	to { transform: scale(1.3); }
}
</style>
```

`transition` / `animation` also accept arrays, picking one entry at random, and can be combined with the register props:

```vue
<Vegas
	:slides="slides"
	:transition="['fade', 'myFade']"
	:transition-register="['myFade']"
/>
```

### Tuning effect intensity

The component exposes 6 CSS variables on its root container. Override them to adjust how strong the effects are:

| Variable | Default | Affects |
|----------|---------|---------|
| `--vegas-kenburns-scale` | `1.5` | Starting scale of Ken Burns |
| `--vegas-kenburns-translate` | `10%` | Pan distance of Ken Burns |
| `--vegas-blur-value` | `32px` | Blur radius of the `blur` transition |
| `--vegas-swirl-degree` | `35deg` | Rotation angle of the `swirl` transitions |
| `--vegas-swirl-scale` | `2` | Scale factor of the `swirl` transitions |
| `--vegas-zoom-scale` | `2` | Starting scale of `zoomOut`, and the scale of the outgoing image in `zoomIn2` |

These defaults are injected with zero-specificity rules, so any selector overrides them. For example, add a class to `<Vegas>`:

```vue
<template>
	<Vegas class="soft-effects" :slides="slides" transition="zoomOut" />
</template>

<style>
.soft-effects {
	--vegas-zoom-scale: 1.25;
	--vegas-kenburns-scale: 1.2;
}
</style>
```

### Default background

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultBackground` | `string` | — | URL of a background image shown before the slides start |
| `defaultBackgroundDuration` | `number` | `3000` | How long the default background stays (ms) before it cross-fades into the first slide |

### Layout

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cover` | `boolean` | `true` | Whether images / videos fill the container in `cover` mode |
| `align` | `'left' \| 'center' \| 'right'` | `'center'` | Horizontal alignment |
| `valign` | `'top' \| 'center' \| 'bottom'` | `'center'` | Vertical alignment |
| `color` | `string \| null` | `null` | Container background color (shown before the image loads) |

### UI

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `timer` | `boolean` | `false` | Progress bar at the top showing progress through the whole slideshow |
| `overlay` | `boolean` | `false` | Semi-transparent overlay above the slides |
| `overlayColor` | `string` | `'rgba(0,0,0,0.3)'` | Overlay color (any CSS color value) |
| `showLoading` | `boolean` | `false` | Shows a loading progress indicator while preloading |
| `loadingText` | `string` | `'Loading...'` | Text of the loading indicator |

### Preloading

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `preload` | `boolean` | `false` | Master switch, equivalent to enabling both `preloadImage` and `preloadVideo` |
| `preloadImage` | `boolean` | `false` | Preloads images |
| `preloadImageBatch` | `number` | `3` | How many images are preloaded concurrently in each batch |
| `preloadVideo` | `boolean` | `false` | Preloads videos (warms the cache in the background without blocking playback) |

> Only **image** preloading holds up playback (the `showLoading` progress indicator also counts images only). Videos
> warm the HTTP cache in the background through detached `<video preload="auto">` elements, so they don't block the
> first frame, and unfinished downloads are aborted when the component unmounts. The original Vegas.js behaves the same way.

### Callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onInit` | `() => void` | Fires once when the component mounts |
| `onPlay` | `(index: number, slide: SlideProps) => void` | Fires when playback starts or resumes |
| `onPause` | `(index: number, slide: SlideProps) => void` | Fires when playback pauses |
| `onWalk` | `(index: number, slide: SlideProps) => void` | Fires on every slide switch |
| `onEnd` | `(index: number, slide: SlideProps) => void` | Fires after the last slide has played when `loop: false` |

All callbacks except `onInit` receive the index and config of the current slide (for `onWalk`, the target slide).
None of them fire when `slides` is empty.

About `onEnd`:

- It fires only when moving **forward** past the end. Going back to the first slide with `previous()` doesn't count
  as finishing and doesn't fire it (same as the original).
- It passes the slide that is still showing. The original passes an out-of-range index and `undefined` here,
  an upstream bug vue3-vegas doesn't copy.
- **If autoplay was running when the end is reached**, playback stops, so `onPause` fires right after,
  in the order `onEnd` → `onPause`; the original only fires `end`. If it was already paused (for example with
  `autoplay: false` and `next()` called manually up to the end), only `onEnd` fires.
- Calling `next()` again after the end fires `onEnd` again (same as the original). To replay, call `goTo(0)` and then `play()`.

### Debugging

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `debug` | `boolean` | `false` | Enables debug logging in the console |

---

## SlideProps

Each slide can override the global settings:

```ts
interface SlideProps {
  src: string                           // Image URL (video slides also need one, used as the poster)
  color?: string | null                 // Slide background color, overrides global color
  delay?: number | 'video' | null       // Time on screen (ms), overrides global delay; video slides can use 'video' to play through once before switching
  align?: 'left' | 'center' | 'right'  // Horizontal alignment, overrides global align
  valign?: 'top' | 'center' | 'bottom' // Vertical alignment, overrides global valign
  transition?: string | string[] | null // Transition, overrides global transition (arrays supported)
  transitionDuration?: number | null    // Transition duration (ms), overrides global transitionDuration
  animation?: string | string[] | null  // Ken Burns animation name, overrides global animation (arrays supported)
  animationDuration?: number | 'auto' | null // Animation duration (ms), overrides global animationDuration
  cover?: boolean                       // Fill mode, overrides global cover
  video?: string[] | {                  // The array shorthand is equivalent to { src: [...] }
    src: string[]    // Video files (providing both .mp4 and .webm is recommended)
    muted?: boolean  // Whether it is muted, defaults to true (unmuted autoplay gets blocked by browser autoplay policies)
    loop?: boolean   // Whether it loops, defaults to true; when false, switches to the next slide after the video ends
  }
}
```

---

## Manual control

Get the component instance through a `ref` and call these methods:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Vegas } from 'vue3-vegas'
import type { VegasHandle } from 'vue3-vegas'

const vegas = ref<VegasHandle | null>(null)
</script>

<template>
  <div style="height: 100vh">
    <Vegas ref="vegas" :slides="slides" :autoplay="false" />
    <button @click="vegas?.previous()">Previous</button>
    <button @click="vegas?.play()">Play</button>
    <button @click="vegas?.pause()">Pause</button>
    <button @click="vegas?.next()">Next</button>
  </div>
</template>
```

**VegasHandle methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `play()` | `void` | Starts / resumes autoplay |
| `pause()` | `void` | Pauses autoplay |
| `toggle()` | `void` | Toggles between playing and paused |
| `playing()` | `boolean` | Whether autoplay is running; changes at the same moments `onPlay` / `onPause` fire |
| `next()` | `boolean` | Switches to the next slide |
| `previous()` | `boolean` | Switches to the previous slide |
| `goTo(index)` | `boolean` | Jumps to the given index (`jump` in the original Vegas) |
| `current()` | `number` | Index of the current slide in `slides` |

`next` / `previous` / `goTo` return whether a switch actually started. They do nothing and return `false` when the index
is out of range, the target is already the current slide, or the previous transition hasn't finished yet. All three
happen when navigation buttons are clicked in quick succession.

`current()` always returns the real index in `slides`, even when `shuffle` changes the playback order.

### Dot navigation

`goTo`, `current()` and `onWalk` are enough to build a dot indicator:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Vegas } from 'vue3-vegas'
import type { VegasHandle, SlideProps } from 'vue3-vegas'

const slides: SlideProps[] = [
  { src: '/img/1.jpg' },
  { src: '/img/2.jpg' },
  { src: '/img/3.jpg' },
]

const vegas = ref<VegasHandle | null>(null)
const active = ref(0)
</script>

<template>
  <div style="height: 100vh; position: relative">
    <Vegas
      ref="vegas"
      :slides="slides"
      :delay="5000"
      :on-walk="(index) => (active = index)"
    />
    <nav style="position: absolute; bottom: 24px; left: 50%; z-index: 5">
      <button
        v-for="(slide, index) in slides"
        :key="slide.src"
        style="width: 22px; height: 3px; margin: 0 4px; border: 0"
        :style="{ background: index === active ? '#fff' : 'rgba(255,255,255,.4)' }"
        @click="vegas?.goTo(index)"
      />
    </nav>
  </div>
</template>
```

> Placing the indicator after `<Vegas>` is enough. The component's root element has `isolation: isolate`, so its internal
> layers (including the overlay and the progress bar) don't leak into the host page, and siblings stack on top of it by default.
>
> `onWalk` fires on switches, not on the initial render, so the initial value of `active` must match the
> `slide` prop (both default to `0`).

---

## Examples

### Mixed transitions

```vue
<Vegas
  :slides="[
    { src: '/img/1.jpg', transition: 'fade' },
    { src: '/img/2.jpg', transition: 'slideLeft' },
    { src: '/img/3.jpg', transition: 'zoomIn' },
  ]"
  :transition-duration="1200"
  :delay="4000"
  :timer="true"
  :overlay="true"
/>
```

### Default background + first-slide transition

```vue
<Vegas
  default-background="/img/cover.jpg"
  :default-background-duration="2000"
  first-transition="zoomIn"
  :first-transition-duration="2000"
  :slides="slides"
/>
```

The default background stays for 2 seconds, then cross-fades into the first slide.

### Video slides

```vue
<Vegas
  :slides="[
    {
      src: '/img/poster.jpg',
      video: {
        src: ['/video/intro.mp4', '/video/intro.webm'],
        muted: true,
        loop: false,
      },
    },
    { src: '/img/photo.jpg', transition: 'fade' },
  ]"
/>
```

`muted` / `loop` both default to `true`, so `muted: true` above could be omitted; it is spelled out for clarity.
With `loop: false`, the component switches to the next slide once the video finishes.

When you only need to set the video sources, use the array shorthand from the original Vegas.js. It is equivalent to `{ src: [...] }`, with `muted` / `loop` at their defaults:

```vue
<Vegas
  :slides="[
    { src: '/img/poster.jpg', video: ['/video/intro.mp4', '/video/intro.webm'] },
  ]"
/>
```

> When the source list is empty (`video: []` or `video: { src: [] }`), the slide renders as an **image** slide. A
> `<video>` with no `<source>` shows nothing and never fires `ended`, so with `delay: 'video'` it could only switch away
> once `videoMaxDelay` runs out; enabling `debug` logs a warning in the console. The original renders an empty `<video>`
> here; vue3-vegas doesn't.

#### Sound fade-in / fade-out

When a switch involves a video with `muted: false`, its sound fades in or out (ported from `_fadeInSound` / `_fadeOutSound` in the original Vegas.js):

- The **entering** video fades its volume from `0` up to full, taking as long as this switch's `transitionDuration`.
- The **leaving** video fades its volume down to `0` and pauses when the fade ends. Without the pause it would keep playing until the element is removed, over the new video's sound.
- Videos with `muted: true` (the default) keep their volume untouched and are only paused when leaving.

> Browser autoplay policies block autoplay with sound. `muted: false` usually needs the user to interact with the page
> first, otherwise `play()` is rejected (enable `debug` to see the warning in the console).

A video slide also switches when its `delay` runs out, whether or not the video has finished. To play for the length
of the video itself, set that slide's `delay` to `'video'`:

```vue
<Vegas
  :video-max-delay="120000"
  :slides="[
    { src: '/img/poster.jpg', delay: 'video', video: { src: ['/video/intro.mp4'] } },
    { src: '/img/photo.jpg' },
  ]"
/>
```

- The video plays through once and then switches to the next slide; `video.loop` is ignored here (a looping video never ends).
- If the video is stuck buffering and doesn't finish, it switches away after `videoMaxDelay` (5 minutes by default); if every video source fails to load, or a fatal error occurs during playback, it switches away immediately.
- With only one slide there is nothing to switch to, so it plays according to `video.loop`.
- On entering the playing state the component calls `play()` itself instead of relying only on the `autoplay` attribute, so high-bitrate videos can start playing while still downloading on slow networks.

### Shuffle + preloading

```vue
<Vegas
  :slides="slides"
  :shuffle="true"
  :preload="true"
  :preload-image="true"
  :show-loading="true"
  loading-text="Loading..."
/>
```

---

## Development

Development requires Node.js `^22.22.2`, `^24.15.0` or `>=26` (required by jsdom 30 and vitest 5).

```bash
# Install dependencies
pnpm install

# Start the Storybook preview
pnpm storybook

# Build
pnpm build

# Run tests
pnpm test
```

---

## Acknowledgements

This project reimplements the core ideas of [Vegas.js](https://github.com/jaysalvat/vegas) for Vue 3.

---

## License

MIT

---

## Upgrading from 0.2.x to 0.4.0 or later

0.3.0 was never published to npm; all of the changes below arrived with 0.4.0.

### Transitions

Transitions now follow the semantics of the original Vegas.js exactly, which brings three visible changes:

1. **`fade`, `slideLeft`, `slideRight`, `zoomIn` and `zoomOut` no longer animate the outgoing slide.**
   To keep the two-way effect from 0.2.x, switch to the name with the `2` suffix, e.g. `fade` → `fade2`.
2. **The scale range of `zoomIn`** changed from `scale(0.5) → scale(1)` to the original's `scale(0) → scale(1)`.
3. **The scale range of `zoomOut`** changed from `scale(1.25) → scale(1)` to the original's `scale(2) → scale(1)`.

`zoomInOut` is unaffected.

`--vegas-zoom-scale` can undo only one of the two zoom changes:

- **`zoomOut` can be tuned.** Its starting scale is this variable, so `--vegas-zoom-scale: 1.25` brings back the 0.2.x look.
- **`zoomIn` cannot.** It starts from a hard-coded `scale(0)`. The variable only appears in its leaving state (so it only affects the outgoing image in `zoomIn2`) and can't restore the 0.2.x `scale(0.5)`. For a softer zoom-in, use `zoomInOut` or wrap it in your own CSS.

### Defaults

- **The `firstTransitionDuration` default changed from `3000` to `null`**; when unset it falls back to `transitionDuration` (default `1000`),
  so the first slide's entrance goes from 3 seconds to 1 second. To keep the old pace, pass `:first-transition-duration="3000"` explicitly.
- **Video `muted` / `loop` now default to `true`**, matching the original Vegas.js. In 0.2.x, leaving them out meant a video was
  neither muted (so browser autoplay policies often blocked it) nor looping, and switched to the next slide once it ended. Now videos
  are muted and loop by default, and switch only when `delay` runs out. To keep "switch when it ends", set `loop: false` on that slide, or (since 0.5.0) set `delay: 'video'`.
