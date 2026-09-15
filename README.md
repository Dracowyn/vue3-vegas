# vue3-vegas

> Vue 3 版的 [Vegas.js](https://github.com/jaysalvat/vegas) —— 全屏幻灯片 / 背景轮播组件

基于原版 Vegas.js 的核心理念，为 Vue 3 重新设计，支持图片、视频幻灯片，内置多种过渡效果、预加载、随机播放等特性。

---

## 特性

- 图片 & 视频幻灯片支持
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
- 手动控制 API：play / pause / next / previous
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

组件在根容器上挂了 6 个 CSS 变量，覆盖它们即可调整效果强度：

| 变量 | 默认值 | 影响 |
|------|--------|------|
| `--vegas-kenburns-scale` | `1.5` | Ken Burns 起始缩放 |
| `--vegas-kenburns-translate` | `10%` | Ken Burns 平移距离 |
| `--vegas-blur-value` | `32px` | `blur` 过渡的模糊半径 |
| `--vegas-swirl-degree` | `35deg` | `swirl` 过渡的旋转角度 |
| `--vegas-swirl-scale` | `2` | `swirl` 过渡的缩放倍数 |
| `--vegas-zoom-scale` | `2` | `zoomOut` 的起始缩放，以及 `zoomIn2` 旧图离场时的缩放 |

这些默认值以特异度为 0 的规则注入，任意选择器都能覆盖——给 `<Vegas>` 加个类名即可：

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
| `defaultBackground` | `string` | — | 幻灯片开始前显示的背景图 URL |
| `defaultBackgroundDuration` | `number` | `3000` | 默认背景停留时长（ms），结束后与第一张幻灯片交叉淡入 |

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
| `preload` | `boolean` | `false` | 播放前等待所有资源预加载完成 |
| `preloadImage` | `boolean` | `false` | 预加载图片资源 |
| `preloadImageBatch` | `number` | `3` | 图片预加载并发批次数 |
| `preloadVideo` | `boolean` | `false` | 预加载视频资源 |

### 回调

| Prop | 类型 | 说明 |
|------|------|------|
| `onInit` | `() => void` | 组件挂载时触发一次 |
| `onPlay` | `(index: number, slide: SlideProps) => void` | 开始/恢复播放时触发 |
| `onPause` | `(index: number, slide: SlideProps) => void` | 暂停时触发 |
| `onWalk` | `(index: number, slide: SlideProps) => void` | 每次切换幻灯片时触发 |
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
  video?: {
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
| `play()` | `void` | 开始/恢复自动播放 |
| `pause()` | `void` | 暂停自动播放 |
| `toggle()` | `void` | 在播放与暂停之间切换 |
| `playing()` | `boolean` | 是否正在自动播放，与 `onPlay` / `onPause` 的时机一致 |
| `next()` | `boolean` | 切换到下一张 |
| `previous()` | `boolean` | 切换到上一张 |
| `goTo(index)` | `boolean` | 跳转到指定下标（原版 Vegas 的 `jump`） |
| `current()` | `number` | 当前幻灯片在 `slides` 中的下标 |

`next` / `previous` / `goTo` 返回是否真的开始了切换。下标越界、目标就是当前幻灯片、
或上一次切换动画尚未结束时，它们不做任何事并返回 `false` —— 这三种情况在快速连点
导航按钮时都会出现。

`current()` 返回的始终是 `slides` 里的真实下标，`shuffle` 打乱播放顺序时也是如此。

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
> `onWalk` 只在**切换**时触发，首屏渲染不触发，所以 `active` 的初值要和
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

## 从 0.2.x 升级到 0.3.0

0.3.0 让过渡效果严格对齐原版 Vegas.js 的语义，有三处观感变化：

1. **`fade`、`slideLeft`、`slideRight`、`zoomIn`、`zoomOut` 不再让旧幻灯片做离场动画。**
   想保留 0.2.x 的双向效果，把名字改成带 `2` 后缀的版本即可，例如 `fade` → `fade2`。
2. **`zoomIn` 的缩放幅度**由 `scale(0.5) → scale(1)` 改为原版的 `scale(0) → scale(1)`。
3. **`zoomOut` 的缩放幅度**由 `scale(1.25) → scale(1)` 改为原版的 `scale(2) → scale(1)`。

`zoomInOut` 不受影响。

关于 `--vegas-zoom-scale` 的适用范围，注意两点：

- **`zoomOut` 可以调**：它的起始缩放就是这个变量，`--vegas-zoom-scale: 1.25` 即可回到 0.2.x 的观感。
- **`zoomIn` 调不了**：`zoomIn` 的起点是硬编码的 `scale(0)`，这个变量只出现在它的离场状态里（即只对 `zoomIn2` 的旧图生效），无法用来恢复 0.2.x 的 `scale(0.5)`。想要更柔和的放大，请改用 `zoomInOut` 或自行包一层 CSS。
