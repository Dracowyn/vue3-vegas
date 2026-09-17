import { describe, expect, it, vi, afterEach } from 'vitest';
import { whenImageReady } from '../src/utils/imageReady';

class ControlledImage {
	complete = false;
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;
	src = '';
}

class SyncCompleteImage {
	complete = true;
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;
	src = '';
}

describe('whenImageReady', () => {
	const OriginalImage = global.Image;

	afterEach(() => {
		global.Image = OriginalImage;
	});

	it('complete 为 true 时同步调用 onReady', () => {
		global.Image = SyncCompleteImage as unknown as typeof Image;
		const onReady = vi.fn();

		whenImageReady('/a.jpg', onReady);

		expect(onReady).toHaveBeenCalledTimes(1);
	});

	it('complete 为 false 时等待 load 事件才调用 onReady', () => {
		let created: ControlledImage | null = null;
		class SpyImage extends ControlledImage {
			constructor() {
				super();
				created = this;
			}
		}
		global.Image = SpyImage as unknown as typeof Image;
		const onReady = vi.fn();

		whenImageReady('/a.jpg', onReady);

		expect(onReady).not.toHaveBeenCalled();
		created?.onload?.();
		expect(onReady).toHaveBeenCalledTimes(1);
	});

	it('error 事件也视为就绪', () => {
		let created: ControlledImage | null = null;
		class SpyImage extends ControlledImage {
			constructor() {
				super();
				created = this;
			}
		}
		global.Image = SpyImage as unknown as typeof Image;
		const onReady = vi.fn();

		whenImageReady('/broken.jpg', onReady);
		created?.onerror?.();

		expect(onReady).toHaveBeenCalledTimes(1);
	});

	it('cancel() 之后 load 事件不再触发 onReady', () => {
		let created: ControlledImage | null = null;
		class SpyImage extends ControlledImage {
			constructor() {
				super();
				created = this;
			}
		}
		global.Image = SpyImage as unknown as typeof Image;
		const onReady = vi.fn();

		const cancel = whenImageReady('/a.jpg', onReady);
		cancel();
		created?.onload?.();

		expect(onReady).not.toHaveBeenCalled();
	});

	it('onReady 只会被调用一次，即使 load 与 error 都被触发', () => {
		let created: ControlledImage | null = null;
		class SpyImage extends ControlledImage {
			constructor() {
				super();
				created = this;
			}
		}
		global.Image = SpyImage as unknown as typeof Image;
		const onReady = vi.fn();

		whenImageReady('/a.jpg', onReady);
		created?.onload?.();
		created?.onerror?.();

		expect(onReady).toHaveBeenCalledTimes(1);
	});
});
