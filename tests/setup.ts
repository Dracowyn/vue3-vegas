import { afterEach, vi } from 'vitest';

// jsdom 不会真的加载图片：`new Image()` 之后 `complete` 恒为 `false`，也永远不会
// 触发 load / error 事件。切换幻灯片前要等目标图片就绪（见 src/utils/imageReady.ts），
// 不处理的话所有走 next()/goTo() 的测试都会因为等不到 load/error 而挂死。
// 这里装一个默认假 `Image`：`complete` 恒为 `true`、不派发任何事件，模拟「目标图片已
// 缓存」，让 whenImageReady 走同步快路径——对绝大多数不关心图片加载时机的测试来说，
// 行为与引入图片就绪门槛之前完全一致。
// 需要驱动真正的等待行为的测试（tests/imageGate.test.ts）会自行替换 global.Image 为
// 可控实现，用完再还原；tests/Vegas.test.ts 里预加载用的 FakeImage 同理，互不影响。
class DefaultCachedImage {
	complete = true;
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;
	src = '';
}

global.Image = DefaultCachedImage as unknown as typeof Image;

Object.defineProperty(HTMLMediaElement.prototype, 'play', {
	configurable: true,
	value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
	configurable: true,
	value: vi.fn(),
});

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
	configurable: true,
	value: vi.fn(),
});

afterEach(() => {
	document.head.innerHTML = '';
	document.body.innerHTML = '';
	vi.clearAllMocks();
});
