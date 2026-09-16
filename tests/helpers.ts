import { flushPromises } from '@vue/test-utils';
import { vi } from 'vitest';
import { nextTick } from 'vue';

/** 推进假定时器并把由此产生的响应式副作用冲刷干净 */
export const advanceTimers = async (duration: number) => {
	vi.advanceTimersByTime(duration);
	await flushPromises();
	await nextTick();
};

/** 冲刷挂起的 Promise 与一次 DOM 更新 */
export const flushEffects = async () => {
	await flushPromises();
	await nextTick();
};

interface PreloadCall {
	el: HTMLVideoElement;
	sources: (string | null)[];
}

/**
 * 捕获预加载用的游离 `<video>`。它们不挂进文档，外部唯一能观测到的时机就是 `load()` 调用，
 * 因此在调用现场把元素和它当时挂着的源快照下来（卸载清理时会清空源再 `load()` 中断下载，
 * 那一次快照为空，`preloaded()` 会把它滤掉）。
 */
export const capturePreloadedVideos = () => {
	const calls: PreloadCall[] = [];

	const spy = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(function (this: HTMLMediaElement) {
		calls.push({
			el: this as HTMLVideoElement,
			sources: Array.from(this.querySelectorAll('source')).map(source => source.getAttribute('src')),
		});
	});

	const withSources = () => calls.filter(call => call.sources.length > 0);

	return {
		/** 每次预加载挂上的源 URL 列表，按预加载顺序 */
		preloaded: () => withSources().map(call => call.sources),
		/** 预加载用的 `<video>` 元素本身，用于断言游离状态与卸载后的清理 */
		elements: () => withSources().map(call => call.el),
		restore: () => spy.mockRestore(),
	};
};
