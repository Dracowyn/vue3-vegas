import { afterEach, vi } from 'vitest';

Object.defineProperty(HTMLMediaElement.prototype, 'play', {
	configurable: true,
	value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
	configurable: true,
	value: vi.fn(),
});

afterEach(() => {
	document.head.innerHTML = '';
	document.body.innerHTML = '';
	vi.clearAllMocks();
});
