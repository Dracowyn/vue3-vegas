# vue3-vegas

> Vue 3 版的 [Vegas.js](https://github.com/jaysalvat/vegas) —— 全屏幻灯片 / 背景轮播组件

基于原版 Vegas.js 的核心理念，为 Vue 3 重新设计，支持图片、视频幻灯片，内置多种过渡效果、预加载、随机播放等特性。

---

## 特性

- 图片 & 视频幻灯片支持
- 26 种内置过渡效果，与原版 Vegas.js 一一对应
- 9 种 Ken Burns 缓慢推拉镜头动画
- `transition` / `animation` 支持 `'random'`，可用 register 限定候选池
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
| `loop` | `boolean` | `true` | 是否循环播放 |
| `shuffle` | `boolean` | `false` | 是否随机顺序播放 |

### 过渡效果

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `transition` | `string` | `'fade'` | 幻灯片切换过渡效果 |
| `transitionDuration` | `number` | `1000` | 切换动画时长（ms） |
| `firstTransition` | `string \| null` | `null` | 第一张幻灯片的进入效果，不设置则使用 `transition` |
| `firstTransitionDuration` | `number` | `3000` | 第一张幻灯片进入动画时长（ms） |

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
| `swirlLeft` | 放大 + 顺时针旋转进入 |
| `swirlRight` | 放大 + 逆时针旋转进入 |

每个基础名都有一个 `2` 后缀变体（如 `fade2`、`swirlLeft2`）：

- **无后缀**（`fade`）：只有新幻灯片做动画，旧的原地等待被移除。
- **带 `2` 后缀**（`fade2`）：新幻灯片进入的同时，旧的也做反向离场动画。

另有 `zoomInOut`（进入后持续缓慢放大）——这是 vue3-vegas 的自有扩展，不属于原版。

### Ken Burns 动画

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `animation` | `string \| null` | `null` | Ken Burns 动画名，`null` 表示不启用 |
| `animationDuration` | `number \| 'auto'` | `'auto'` | 动画时长（ms）。`'auto'` 取该张幻灯片的 `delay` |
| `transitionRegister` | `string[]` | — | 限定 `transition: 'random'` 的候选池 |
| `animationRegister` | `string[]` | — | 限定 `animation: 'random'` 的候选池 |

可用动画：`kenburns`、`kenburnsUp`、`kenburnsDown`、`kenburnsLeft`、`kenburnsRight`、`kenburnsUpLeft`、`kenburnsUpRight`、`kenburnsDownLeft`、`kenburnsDownRight`。

### 效果强度调节

组件在根容器上挂了 6 个 CSS 变量，覆盖它们即可调整效果强度：

| 变量 | 默认值 | 影响 |
|------|--------|------|
| `--vegas-kenburns-scale` | `1.5` | Ken Burns 起始缩放 |
| `--vegas-kenburns-translate` | `10%` | Ken Burns 平移距离 |
| `--vegas-blur-value` | `32px` | `blur` 过渡的模糊半径 |
| `--vegas-swirl-degree` | `35deg` | `swirl` 过渡的旋转角度 |
| `--vegas-swirl-scale` | `2` | `swirl` 过渡的缩放倍数 |
| `--vegas-zoom-scale` | `2` | `zoomIn` / `zoomOut` 的缩放倍数 |

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
| `onPlay` | `() => void` | 开始/恢复播放时触发 |
| `onPause` | `() => void` | 暂停时触发 |
| `onWalk` | `() => void` | 每次切换幻灯片时触发 |

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
  delay?: number | null                 // 停留时长（ms），覆盖全局 delay
  align?: 'left' | 'center' | 'right'  // 水平对齐，覆盖全局 align
  valign?: 'top' | 'center' | 'bottom' // 垂直对齐，覆盖全局 valign
  transition?: string | null            // 过渡效果，覆盖全局 transition
  transitionDuration?: number | null    // 过渡时长（ms），覆盖全局 transitionDuration
  animation?: string | null             // Ken Burns 动画名，覆盖全局 animation
  animationDuration?: number | 'auto' | null // 动画时长（ms），覆盖全局 animationDuration
  cover?: boolean                       // 填充模式，覆盖全局 cover
  video?: {
    src: string[]    // 视频文件列表（建议同时提供 .mp4 / .webm）
    muted?: boolean  // 是否静音
    loop?: boolean   // 是否循环；false 时视频结束后自动切换下一张
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

| 方法 | 说明 |
|------|------|
| `play()` | 开始/恢复自动播放 |
| `pause()` | 暂停自动播放 |
| `next()` | 切换到下一张 |
| `previous()` | 切换到上一张 |

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

`loop: false` 时视频播放完毕后自动切换到下一张。

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

`zoomInOut` 不受影响。想恢复旧的缩放幅度，覆盖 `--vegas-zoom-scale` 即可。
