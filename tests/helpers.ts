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
