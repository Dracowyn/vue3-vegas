# vue3-vegas

[English](./README.md) | 简体中文

> Vue 3 版的 [Vegas.js](https://github.com/jaysalvat/vegas) —— 全屏幻灯片 / 背景轮播组件

基于原版 Vegas.js 的核心理念，为 Vue 3 重新设计，支持图片、视频幻灯片，内置多种过渡效果、预加载、随机播放等特性。

---

## 特性

- 图片 & 视频幻灯片支持（含不静音视频的声音淡入淡出）
- 27 种内置过渡效果，其中 26 种与原版 Vegas.js 一一对应，另加 `zoomInOut` 扩展效果
- 9 种 Ken Burns 缓慢推拉镜头动画
- `transition` / `animation` 支持 `'random'`（可用 register 注册自定义名并入候选池）与数组形式（从数组中随机抽取）
- 支持通过 CSS 类注册自定义过渡 / Ken Burns 动画，不必局限于内置效果
- 每张幻灯片可独立配置过渡效果、时长、延迟
- 默认背景图，与第一张幻灯片交叉淡入过渡
- 随机播放（shuffle）
- 预加载（图片批量预加载 + 视频预加载）
- 顶部播放进度条（timer）
- 半透明遮罩层（overlay）
- 加载进度指示器
- 页面隐藏时自动暂停，重新可见时恢复
- 手动控制 API：play / pause / toggle / next / previous / goTo，以及 playing() / current() 状态查询
- 完整 TypeScript 类型支持

---

## 安装

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

## 基本用法

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

> 父容器必须有明确的高度，Vegas 会填满父容器的 100% 宽高。

---

## 导出的常量与类型

包导出了全部内置过渡效果与 Ken Burns 动画的名称，以冻结数组的形式。用在后台白名单、下拉菜单或任何需要权威名单但不想直接读文档的地方。

```ts
import { TRANSITION_NAMES, KEN_BURNS_NAMES, isVegasTransitionName, isVegasAnimationName } from 'vue3-vegas'
import type { VegasTransitionName, VegasAnimationName, VegasEffectName } from 'vue3-vegas'

// TRANSITION_NAMES = ['fade', 'fade2', 'blur', ..., 'zoomInOut']（27 个）
// KEN_BURNS_NAMES = ['kenburns', 'kenburnsUp', ..., 'kenburnsDownRight']（9 个）

isVegasTransitionName(userInput)  // userInput: string，收窄成 VegasTransitionName
isVegasAnimationName(userInput)   // 收窄成 VegasAnimationName
```

`TRANSITION_NAMES` 与 `KEN_BURNS_NAMES` 是字符串字面量的只读数组——可以直接传给 `transition` / `animation` 当随机池。要校验任意 `string` 是否属于内置名单，推荐用 `isVegasTransitionName` / `isVegasAnimationName`：返回布尔值并顺带收窄类型，不必再自己应付直接在内置名单上调用 `.includes()` 时的字面量类型限制。

`VegasEffectName<Name>` 就是这些 prop 实际接受的输入类型：内置名、`'random'`，或任意自定义字符串。`transition`、`firstTransition` 和 `animation` 这些 prop 接受内置名（编辑器自动补全）、`'random'`，或通过 `transitionRegister` / `animationRegister` 登记的任意自定义字符串。

---

## Props

### 核心

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `slides` | `SlideProps[]` | — | **必填**。幻灯片列表 |
| `slide` | `number` | `0` | 初始幻灯片索引 |
| `autoplay` | `boolean` | `true` | 是否自动播放 |
| `delay` | `number` | `5000` | 每张幻灯片停留时长（ms） |
| `videoMaxDelay` | `number` | `300000` | `delay: 'video'` 的视频幻灯片最长停留时长（ms），视频卡住时兜底切走 |
| `loop` | `boolean` | `true` | 是否循环播放 |
| `shuffle` | `boolean` | `false` | 是否随机顺序播放 |

### 过渡效果

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `transition` | `string \| string[]` | `'fade'` | 幻灯片切换过渡效果。传数组时每次切换从数组里随机抽一个 |
| `transitionDuration` | `number` | `1000` | 切换动画时长（ms） |
| `firstTransition` | `string \| string[] \| null` | `null` | 第一张幻灯片的进入效果，不设置则使用 `transition` |
| `firstTransitionDuration` | `number \| null` | `null` | 第一张幻灯片进入动画时长（ms），不设置则使用 `transitionDuration` |

**可用过渡效果：**

| 基础名 | 说明 |
|----|------|
| `fade` | 淡入 |
| `blur` | 由模糊转清晰 |
| `flash` | 高亮闪白进入 |
| `negative` | 由负片反相转正常 |
| `burn` | 由高对比高饱和转正常 |
| `slideLeft` | 从右向左滑入 |
| `slideRight` | 从左向右滑入 |
| `slideUp` | 从下向上滑入 |
| `slideDown` | 从上向下滑入 |
| `zoomIn` | 从 0 放大到原尺寸 |
| `zoomOut` | 从 2 倍缩小到原尺寸 |
| `swirlLeft` | 从 2 倍缩小 + 逆时针旋转（`35deg` → `0deg`）进入 |
| `swirlRight` | 从 2 倍缩小 + 顺时针旋转（`-35deg` → `0deg`）进入 |

每个基础名都有一个 `2` 后缀变体（如 `fade2`、`swirlLeft2`）：

- **无后缀**（`fade`）：只有新幻灯片做动画，旧的原地等待被移除。
- **带 `2` 后缀**（`fade2`）：新幻灯片进入的同时，旧的也做反向离场动画。

另有 `zoomInOut`（进入后持续缓慢放大）——这是 vue3-vegas 的自有扩展，不属于原版。

`transition: 'random'` 从全部内置过渡中随机选一个；传数组（如 `['fade', 'slideLeft']`）则只从
数组内随机选一个。`transitionRegister` 见下方 [自定义过渡 / 自定义动画](#自定义过渡--自定义动画)。

### Ken Burns 动画

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `animation` | `string \| string[] \| null` | `null` | Ken Burns 动画名，`null` 表示不启用。传数组时每次切换从数组里随机抽一个 |
| `animationDuration` | `number \| 'auto'` | `'auto'` | 动画时长（ms）。`'auto'` 取该张幻灯片的 `delay`（`delay: 'video'` 时取全局 `delay`） |
| `transitionRegister` | `string[]` | — | 注册自定义过渡名，并入内置池供 `transition: 'random'` 抽取 |
| `animationRegister` | `string[]` | — | 注册自定义动画名，并入内置池供 `animation: 'random'` 抽取 |

可用动画：`kenburns`、`kenburnsUp`、`kenburnsDown`、`kenburnsLeft`、`kenburnsRight`、`kenburnsUpLeft`、`kenburnsUpRight`、`kenburnsDownLeft`、`kenburnsDownRight`。

### 自定义过渡 / 自定义动画

内置效果之外，也可以用 CSS 类自己定义过渡 / 动画——用法与原版 Vegas.js 一致。

**自定义过渡**：用 `transitionRegister` 注册名字，组件会在切换时依次给元素加类名，样式（初始态 /
目标态 / 离场态）全部由你的 CSS 决定：

- 入场元素：先加 `vegas-transition-{name}`，随后（下一帧）加 `vegas-transition-{name}-in` 并设置
  `transition: all {duration}ms`。把 `vegas-transition-{name}` 里的样式当作初始态，
  `vegas-transition-{name}-in` 里的样式当作目标态。
- 离场元素：加 `vegas-transition-{name}-out` 并设置同样的 `transition`。

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

**自定义动画**：用 `animationRegister` 注册名字，内层媒体元素会获得 `vegas-animation-{name}` 类并
设置 `animationDuration`，`@keyframes` 需要你自己在 CSS 里定义：

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

`transition` / `animation` 也都支持数组形式，从数组内随机抽取，可以和 register 搭配一起用：

```vue
<Vegas
	:slides="slides"
	:transition="['fade', 'myFade']"
	:transition-register="['myFade']"
/>
```

### 效果强度调节

组件通过 6 个 CSS 变量来控制效果强度。每个变量都有一个内置的回退值 `var(--vegas-xxx, 默认值)`，所以无论是否有样式注入都能用上默认值——不依赖 JavaScript 样式注入，严格 CSP 环境下也有效。在组件根元素、任意祖先或全局样式表里覆盖它们：

| 变量 | 默认值 | 影响 |
|------|--------|------|
| `--vegas-kenburns-scale` | `1.5` | Ken Burns 起始缩放 |
| `--vegas-kenburns-translate` | `10%` | Ken Burns 平移距离 |
| `--vegas-blur-value` | `32px` | `blur` 过渡的模糊半径 |
| `--vegas-swirl-degree` | `35deg` | `swirl` 过渡的旋转角度 |
| `--vegas-swirl-scale` | `2` | `swirl` 过渡的缩放倍数 |
| `--vegas-zoom-scale` | `2` | `zoomOut` 的起始缩放，以及 `zoomIn2` 旧图离场时的缩放 |

注意：`getComputedStyle()` 在组件根元素上读不到这些变量的值（除非你主动设置过）—— 回退值只在 CSS 计算内生效，不存储在元素上。

给 `<Vegas>` 加个类名即可覆盖：

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

### 默认背景

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `defaultBackground` | `string` | — | 幻灯片开始前显示的背景图 URL；会一直显示到第一张幻灯片的图片加载完（如果有） |
| `defaultBackgroundDuration` | `number` | `3000` | 默认背景最短停留时长（ms）；若首张图片尚未加载完成，会继续等待 |

### 布局

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `cover` | `boolean` | `true` | 图片/视频是否以 `cover` 模式填充容器 |
| `align` | `'left' \| 'center' \| 'right'` | `'center'` | 水平对齐方式 |
| `valign` | `'top' \| 'center' \| 'bottom'` | `'center'` | 垂直对齐方式 |
| `color` | `string \| null` | `null` | 容器背景色（图片加载前显示） |

### UI 功能

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `timer` | `boolean` | `false` | 顶部进度条，显示整体播放进度 |
| `overlay` | `boolean` | `false` | 幻灯片上方半透明遮罩 |
| `overlayColor` | `string` | `'rgba(0,0,0,0.3)'` | 遮罩颜色（任意 CSS 颜色值） |
| `showLoading` | `boolean` | `false` | 预加载时显示加载进度指示器 |
| `loadingText` | `string` | `'Loading...'` | 加载指示器提示文字 |

### 预加载

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `preload` | `boolean` | `false` | 主开关，等价于同时开启 `preloadImage` 与 `preloadVideo` |
| `preloadImage` | `boolean` | `false` | 预加载图片资源 |
| `preloadImageBatch` | `number` | `3` | 图片预加载并发批次数 |
| `preloadVideo` | `boolean` | `false` | 预加载视频资源（后台预热缓存，不阻塞播放） |

> 只有**图片**预加载会卡住播放（`showLoading` 的进度条也只统计图片）。视频走游离
> `<video preload="auto">` 在后台预热 HTTP 缓存，不阻塞首帧，组件卸载时会中断未完成的下载 ——
> 与原版 Vegas.js 的行为一致。

### 图片加载与时序

切到图片幻灯片时，组件会等该图片加载完成（或失败）才开始切换动画。等待期间前一张幻灯片保持显示。若图片已在浏览器缓存里，切换是同步的——与之前的行为完全一致。视频幻灯片立即切换，不等待。首张幻灯片用同样逻辑：若它是图片幻灯片，组件等图片就绪才开始首帧进入动画。

配了 `defaultBackground` 时，默认背景会一直显示到「`defaultBackgroundDuration` 时间已过」**或**「首张图片就绪」中较晚的那个时刻。这个对首张图片的等待与预加载阶段、默认背景时长并行进行—— 不串行叠加时间。

修改 `slides` 数组（增删幻灯片）时会尽量保留当前播放位置，组件继续显示同一张而不是跳回初始幻灯片。若当前下标因删减而越界，会自动钳到最后一张（这种调整不触发 `onWalk`）。启用 `shuffle` 时，增删幻灯片后顺序会重新洗牌，但当前那张不会立刻重复。

### 回调

| Prop | 类型 | 说明 |
|------|------|------|
| `onInit` | `() => void` | 组件挂载时触发一次 |
| `onPlay` | `(index: number, slide: SlideProps) => void` | 开始/恢复播放时触发（页面重新可见时也触发） |
| `onPause` | `(index: number, slide: SlideProps) => void` | 暂停时触发（页面隐藏时也触发） |
| `onWalk` | `(index: number, slide: SlideProps) => void` | 幻灯片切换真正完成时触发 |
| `onEnd` | `(index: number, slide: SlideProps) => void` | `loop: false` 时播完最后一张触发 |

除 `onInit` 外都收到当前（对 `onWalk` 是目标）幻灯片的下标与配置。`slides` 为空时
这几个回调都不触发。

关于 `onEnd`：

- 只由**往后走到头**触发。`previous()` 退到第一张不算播完，不触发（与原版一致）。
- 带的是**仍在显示的那一张**。原版这里传的是越界下标和 `undefined`，属于上游 bug，没有照搬。
- **播完时如果本来正在自动播放**，播放确实停止了，所以 `onPause` 随后也会触发，
  顺序是 `onEnd` → `onPause`；原版只触发 `end`。本来就是暂停状态（比如
  `autoplay: false` 时手动 `next()` 到底）则只有 `onEnd`。
- 播完之后再调 `next()` 会**再次**触发 `onEnd`（与原版一致）。要重播先 `goTo(0)` 再 `play()`。

### 调试

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `debug` | `boolean` | `false` | 开启控制台调试日志 |

---

## SlideProps

每张幻灯片可独立覆盖全局配置：

```ts
interface SlideProps {
  src: string                           // 图片 URL（视频幻灯片也需提供封面 URL）
  color?: string | null                 // 幻灯片背景色，覆盖全局 color
  delay?: number | 'video' | null       // 停留时长（ms），覆盖全局 delay；视频幻灯片可设 'video' 表示播完一遍再切
  align?: 'left' | 'center' | 'right'  // 水平对齐，覆盖全局 align
  valign?: 'top' | 'center' | 'bottom' // 垂直对齐，覆盖全局 valign
  transition?: string | string[] | null // 过渡效果，覆盖全局 transition（支持数组）
  transitionDuration?: number | null    // 过渡时长（ms），覆盖全局 transitionDuration
  animation?: string | string[] | null  // Ken Burns 动画名，覆盖全局 animation（支持数组）
  animationDuration?: number | 'auto' | null // 动画时长（ms），覆盖全局 animationDuration
  cover?: boolean                       // 填充模式，覆盖全局 cover
  video?: string[] | {                  // 数组简写等价于 { src: [...] }
    src: string[]    // 视频文件列表（建议同时提供 .mp4 / .webm）
    muted?: boolean  // 是否静音，默认 true（不静音会被浏览器自动播放策略拦截）
    loop?: boolean   // 是否循环，默认 true；false 时视频结束后自动切换下一张
  }
}
```

---

## 手动控制

通过 `ref` 获取组件实例后可调用以下方法：

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
    <button @click="vegas?.previous()">上一张</button>
    <button @click="vegas?.play()">播放</button>
    <button @click="vegas?.pause()">暂停</button>
    <button @click="vegas?.next()">下一张</button>
  </div>
</template>
```

**VegasHandle 方法：**

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `play()` | `void` | 开始或恢复自动播放 |
| `pause()` | `void` | 暂停自动播放 |
| `toggle()` | `void` | 在播放与暂停之间切换 |
| `playing()` | `boolean` | 是否正在自动播放 |
| `next()` | `boolean` | 请求切换到下一张 |
| `previous()` | `boolean` | 请求切换到上一张 |
| `goTo(index)` | `boolean` | 请求跳转到指定下标（原版 Vegas 的 `jump`） |
| `current()` | `number` | 当前幻灯片在 `slides` 中的下标 |

`next()`、`previous()`、`goTo()` 在下标越界、目标就是当前幻灯片或上一次过渡动画尚未结束时返回 `false`，否则返回 `true` 表示请求被接受。若目标是尚未缓存的图片幻灯片，切换会延后到图片加载完成（或失败）。延后期间，新的导航请求会取代前一个。

`current()` 返回的始终是 `slides` 里的真实下标，`shuffle` 打乱播放顺序时也是如此。仅在切换真正完成时（加载等待后）才会更新。

`playing()` 的变化时机与 `onPlay` 和 `onPause` 一致。

### 圆点导航

`goTo` + `current()` + `onWalk` 组合起来就是一套指示器：

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

> 指示器写在 `<Vegas>` 之后即可。组件根元素带 `isolation: isolate`，内部图层
> （含遮罩、进度条）不会溢出到宿主页面，兄弟节点默认就压在它上面。
>
> `onWalk` 只在切换**真正完成**时触发（含图片加载等待后），首屏渲染不触发，所以 `active` 的初值要和
> `slide` prop 保持一致（默认都是 `0`）。

---

## 示例

### 混合过渡效果

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

### 默认背景 + 首帧过渡

```vue
<Vegas
  default-background="/img/cover.jpg"
  :default-background-duration="2000"
  first-transition="zoomIn"
  :first-transition-duration="2000"
  :slides="slides"
/>
```

默认背景停留 2 秒后，与第一张幻灯片同步交叉淡入，形成自然过渡。

### 视频幻灯片

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

`muted`/`loop` 默认都是 `true`（示例中的 `muted: true` 可省略，这里显式写出只是为了强调）；
`loop: false` 时视频播放完毕后自动切换到下一张。

只需要指定视频源时可以用数组简写，与原版 Vegas.js 一致 —— 等价于 `{ src: [...] }`，`muted`/`loop` 取默认值：

```vue
<Vegas
  :slides="[
    { src: '/img/poster.jpg', video: ['/video/intro.mp4', '/video/intro.webm'] },
  ]"
/>
```

> 源列表为空（`video: []` 或 `video: { src: [] }`）时该张按**图片**幻灯片渲染。没有任何 `<source>` 的
> `<video>` 既放不出画面，也永远不会触发 `ended`，配上 `delay: 'video'` 只能干等到 `videoMaxDelay`
> 才切得走；开启 `debug` 会在控制台告警。原版这里会照渲一个空 `<video>`，没有照搬。

#### 声音淡入淡出

`muted: false` 的视频在切换时不会硬切声音（对齐原版 Vegas.js 的 `_fadeInSound` / `_fadeOutSound`）：

- **进入**的视频音量从 `0` 淡入到满，用时与本次过渡的 `transitionDuration` 一致。
- **离场**的视频音量淡出到 `0`，淡出结束时暂停播放 —— 否则它会一直放到元素被移除为止，和新视频的声音重叠。
- `muted: true`（默认）的视频不会被改动音量，只在离场时暂停。

> 浏览器的自动播放策略会拦截带声音的自动播放。`muted: false` 通常需要用户先与页面产生交互，
> 否则 `play()` 会被拒绝（开启 `debug` 可在控制台看到告警）。

视频幻灯片的停留时长同样由 `delay` 决定，时间一到就切走，不管视频是否播完。想按视频本身的长度播放，把该张的
`delay` 设为 `'video'`：

```vue
<Vegas
  :video-max-delay="120000"
  :slides="[
    { src: '/img/poster.jpg', delay: 'video', video: { src: ['/video/intro.mp4'] } },
    { src: '/img/photo.jpg' },
  ]"
/>
```

- 视频完整播一遍后切到下一张，此时忽略 `video.loop`（循环的视频永远不会结束）。
- 视频卡在缓冲、迟迟播不完时，停留满 `videoMaxDelay`（默认 5 分钟）兜底切走；所有视频源都加载失败、或播放途中出致命错误时直接切走。
- 只有一张幻灯片时没有可切换的目标，照 `video.loop` 播放。
- 进入播放状态时组件会主动调用 `play()`，不只依赖 `autoplay` 属性，大码率视频在慢网络下也能边下边播。

### 随机播放 + 预加载

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

## 开发

开发环境需要 Node.js `^22.22.2`、`^24.15.0` 或 `>=26`（jsdom 30 与 vitest 5 的要求）。

```bash
# 安装依赖
pnpm install

# 启动 Storybook 预览
pnpm storybook

# 构建
pnpm build

# 运行测试
pnpm test
```

---

## 致谢

本项目基于 [Vegas.js](https://github.com/jaysalvat/vegas) 的核心理念，为 Vue 3 重新实现。

---

## License

MIT

---

## 从 0.2.x 升级到 0.4.0 及以上

0.3.0 没有发布到 npm，下面的变化都随 0.4.0 一起到达。

### 过渡效果

过渡效果严格对齐了原版 Vegas.js 的语义，有三处观感变化：

1. **`fade`、`slideLeft`、`slideRight`、`zoomIn`、`zoomOut` 不再让旧幻灯片做离场动画。**
   想保留 0.2.x 的双向效果，把名字改成带 `2` 后缀的版本即可，例如 `fade` → `fade2`。
2. **`zoomIn` 的缩放幅度**由 `scale(0.5) → scale(1)` 改为原版的 `scale(0) → scale(1)`。
3. **`zoomOut` 的缩放幅度**由 `scale(1.25) → scale(1)` 改为原版的 `scale(2) → scale(1)`。

`zoomInOut` 不受影响。

关于 `--vegas-zoom-scale` 的适用范围，注意两点：

- **`zoomOut` 可以调**：它的起始缩放就是这个变量，`--vegas-zoom-scale: 1.25` 即可回到 0.2.x 的观感。
- **`zoomIn` 调不了**：`zoomIn` 的起点是硬编码的 `scale(0)`，这个变量只出现在它的离场状态里（即只对 `zoomIn2` 的旧图生效），无法用来恢复 0.2.x 的 `scale(0.5)`。想要更柔和的放大，请改用 `zoomInOut` 或自行包一层 CSS。

### 默认值

- **`firstTransitionDuration` 默认值由 `3000` 改为 `null`**，缺省时回退到 `transitionDuration`（默认 `1000`），
  第一张的进入动画从 3 秒变成 1 秒。想保留旧节奏，显式传 `:first-transition-duration="3000"`。
- **视频的 `muted` / `loop` 默认值改为 `true`**，与原版 Vegas.js 一致。0.2.x 里不写这两项时，视频既不静音
  （常被浏览器自动播放策略拦下），也不循环，放完就切到下一张；现在默认静音循环，只按 `delay` 切走。
  想保留「放完就切」，给该张设 `loop: false`，或（0.5.0 起）设 `delay: 'video'`。

---

## 0.5.0 之后的行为变化（未发布）

- **CSS 变量现在用回退值而不是注入样式。** `getComputedStyle()` 在根元素上读不到这些变量（除非你主动设置）—— 回退值只在 CSS 计算内生效。在根容器或任意祖先设置变量仍然照常工作。

- **`next()` / `previous()` / `goTo()` 现在返回 `true` 表示「请求被接受」。** 目标是尚未缓存的图片幻灯片时，切换延后到图片加载完成。`current()` 和 `onWalk` 仅在切换真正完成时更新。

- **启动完成后修改 `transitionDuration` / `firstTransitionDuration` / `defaultBackgroundDuration` / `preload` / `defaultBackground` 不再重启启动流程。** 改动仅影响后续切换。启动流程进行中时修改仍会触发重新启动。

- **增删 `slides` 现在保留播放位置。** 组件继续显示同一张幻灯片而非跳回初始位置。若当前下标越界则自动钳到最后一张，不触发 `onWalk`。修改 `slide` 或 `shuffle` 仍然重新初始化。
