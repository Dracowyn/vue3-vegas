import { describe, expect, it, vi } from 'vitest';
import {
	pickRandomName,
	resolveEffectDuration,
	resolveEffectName,
} from '../src/utils/resolveEffect';

const ALL = ['fade', 'fade2', 'blur', 'zoomIn'] as const;

describe('pickRandomName', () => {
	it('merges the register pool into the fallback pool instead of replacing it', () => {
		// 原版语义：register 是扩充候选池，不是限定它——内置名与自定义名都要能抽到
		const seen = new Set<string>();
		for (let i = 0; i < 200; i++) {
			seen.add(pickRandomName(['myFade'], ALL));
		}
		expect(seen.has('myFade')).toBe(true);
		expect([...seen].some(name => (ALL as readonly string[]).includes(name))).toBe(true);
	});

	it('falls back to the full pool when the register is empty or missing', () => {
		expect(ALL).toContain(pickRandomName([], ALL));
		expect(ALL).toContain(pickRandomName(undefined, ALL));
	});
});

describe('resolveEffectName', () => {
	it('returns the fallback for null / undefined / empty', () => {
		expect(resolveEffectName(null, undefined, ALL, 'fade')).toBe('fade');
		expect(resolveEffectName(undefined, undefined, ALL, 'fade')).toBe('fade');
		expect(resolveEffectName('', undefined, ALL, null)).toBe(null);
	});

	it('passes through a known name', () => {
		expect(resolveEffectName('blur', undefined, ALL, 'fade')).toBe('blur');
	});

	it('resolves "random" to a name from the built-in pool merged with the register', () => {
		for (let i = 0; i < 50; i++) {
			const picked = resolveEffectName('random', ['myFade'], ALL, 'fade');
			expect([...ALL, 'myFade']).toContain(picked);
		}
	});

	it('resolves "random" across all names when no register is given', () => {
		expect(ALL).toContain(resolveEffectName('random', undefined, ALL, 'fade'));
	});

	it('can pick a registered custom name via "random" — proves register is merged in, not just validated', () => {
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
		try {
			// 候选池是 [...ALL, 'myFade']，0.999 命中最后一个即 'myFade'
			expect(resolveEffectName('random', ['myFade'], ALL, 'fade')).toBe('myFade');
		} finally {
			randomSpy.mockRestore();
		}
	});

	it('lets a registered custom name pass validation directly, without going through "random"', () => {
		const onUnknown = vi.fn();
		expect(resolveEffectName('myFade', ['myFade'], ALL, 'fade', onUnknown)).toBe('myFade');
		expect(onUnknown).not.toHaveBeenCalled();
	});

	it('falls back and reports on a name that is neither built-in nor registered', () => {
		const onUnknown = vi.fn();
		expect(resolveEffectName('nope', ['myFade'], ALL, 'fade', onUnknown)).toBe('fade');
		expect(onUnknown).toHaveBeenCalledWith('nope');
	});

	it('drops an unknown name when the fallback is null', () => {
		expect(resolveEffectName('nope', undefined, ALL, null)).toBe(null);
	});

	it('does not report for a known name', () => {
		const onUnknown = vi.fn();
		resolveEffectName('blur', undefined, ALL, 'fade', onUnknown);
		expect(onUnknown).not.toHaveBeenCalled();
	});

	describe('array form', () => {
		it('picks a random name out of the array itself, ignoring the register', () => {
			for (let i = 0; i < 50; i++) {
				expect(['blur', 'zoomIn']).toContain(
					resolveEffectName(['blur', 'zoomIn'], undefined, ALL, 'fade')
				);
			}
		});

		it('still validates the picked name, allowing a registered custom name', () => {
			expect(resolveEffectName(['myFade'], ['myFade'], ALL, 'fade')).toBe('myFade');
		});

		it('falls back and reports when the picked name is neither built-in nor registered', () => {
			const onUnknown = vi.fn();
			expect(resolveEffectName(['nope'], undefined, ALL, 'fade', onUnknown)).toBe('fade');
			expect(onUnknown).toHaveBeenCalledWith('nope');
		});

		it('treats an empty array like an absent value and returns the fallback', () => {
			expect(resolveEffectName([], undefined, ALL, 'fade')).toBe('fade');
		});
	});
});

describe('resolveEffectDuration', () => {
	it('maps "auto" to the provided auto value', () => {
		expect(resolveEffectDuration('auto', 4000, 1000)).toBe(4000);
	});

	it('passes numbers through, including 0', () => {
		expect(resolveEffectDuration(2500, 4000, 1000)).toBe(2500);
		expect(resolveEffectDuration(0, 4000, 1000)).toBe(0);
	});

	it('uses the fallback for null / undefined', () => {
		expect(resolveEffectDuration(null, 4000, 1000)).toBe(1000);
		expect(resolveEffectDuration(undefined, 4000, 1000)).toBe(1000);
	});
});
