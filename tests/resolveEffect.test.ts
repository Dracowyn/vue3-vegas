import { describe, expect, it, vi } from 'vitest';
import {
	pickRandomName,
	resolveEffectDuration,
	resolveEffectName,
} from '../src/utils/resolveEffect';

const ALL = ['fade', 'fade2', 'blur', 'zoomIn'] as const;

describe('pickRandomName', () => {
	it('picks from the register pool when it has entries', () => {
		for (let i = 0; i < 50; i++) {
			expect(['blur', 'zoomIn']).toContain(pickRandomName(['blur', 'zoomIn'], ALL));
		}
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

	it('resolves "random" inside the register pool', () => {
		for (let i = 0; i < 50; i++) {
			expect(['blur', 'zoomIn']).toContain(
				resolveEffectName('random', ['blur', 'zoomIn'], ALL, 'fade')
			);
		}
	});

	it('resolves "random" across all names when no register is given', () => {
		expect(ALL).toContain(resolveEffectName('random', undefined, ALL, 'fade'));
	});

	it('falls back and reports on an unknown name', () => {
		const onUnknown = vi.fn();
		expect(resolveEffectName('nope', undefined, ALL, 'fade', onUnknown)).toBe('fade');
		expect(onUnknown).toHaveBeenCalledWith('nope');
	});

	it('does not report for a known name', () => {
		const onUnknown = vi.fn();
		resolveEffectName('blur', undefined, ALL, 'fade', onUnknown);
		expect(onUnknown).not.toHaveBeenCalled();
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
