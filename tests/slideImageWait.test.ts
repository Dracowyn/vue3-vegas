import { describe, expect, it } from 'vitest';
import { getSlideImageWaitSrc } from '../src/utils/slideImageWait';
import type { SlideProps } from '../src/types';

describe('getSlideImageWaitSrc', () => {
	it('普通图片幻灯片返回其 src', () => {
		const slide: SlideProps = { src: '/a.jpg' };
		expect(getSlideImageWaitSrc(slide)).toBe('/a.jpg');
	});

	it('视频幻灯片（有源）不用等，返回 null', () => {
		const slide: SlideProps = { src: '/poster.jpg', video: { src: ['/a.mp4'] } };
		expect(getSlideImageWaitSrc(slide)).toBeNull();
	});

	it('空源视频按图片处理，仍要等 src', () => {
		const slide: SlideProps = { src: '/poster.jpg', video: { src: [] } };
		expect(getSlideImageWaitSrc(slide)).toBe('/poster.jpg');
	});

	it('src 为空字符串时不用等，返回 null', () => {
		const slide: SlideProps = { src: '' };
		expect(getSlideImageWaitSrc(slide)).toBeNull();
	});

	it('幻灯片不存在（下标越界）时返回 null', () => {
		expect(getSlideImageWaitSrc(undefined)).toBeNull();
	});
});
