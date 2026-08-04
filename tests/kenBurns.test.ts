import { describe, expect, it, beforeEach } from 'vitest';
import { KEN_BURNS_KEYFRAMES_CSS, KEN_BURNS_NAMES } from '../src/composables/kenBurnsPresets';
import { injectKeyframes, KEYFRAMES_STYLE_MARKER } from '../src/utils/injectKeyframes';

describe('kenBurnsPresets', () => {
	it('exposes the 9 原版 Ken Burns 名字', () => {
		expect([...KEN_BURNS_NAMES]).toEqual([
			'kenburns',
			'kenburnsUp', 'kenburnsDown', 'kenburnsLeft', 'kenburnsRight',
			'kenburnsUpLeft', 'kenburnsUpRight', 'kenburnsDownLeft', 'kenburnsDownRight',
		]);
	});

	it('emits one prefixed @keyframes block per name', () => {
		for (const name of KEN_BURNS_NAMES) {
			expect(KEN_BURNS_KEYFRAMES_CSS).toContain(`@keyframes vue3-vegas-${name}`);
		}
		expect(KEN_BURNS_KEYFRAMES_CSS.match(/@keyframes/g)).toHaveLength(9);
	});

	it('scales from the kenburns scale variable down to 1', () => {
		expect(KEN_BURNS_KEYFRAMES_CSS).toContain('scale(var(--vegas-kenburns-scale))');
		expect(KEN_BURNS_KEYFRAMES_CSS).toContain('scale(1)');
	});

	it('pans kenburnsUp positively and kenburnsDown negatively on Y', () => {
		expect(KEN_BURNS_KEYFRAMES_CSS).toContain(
			'translate(0, var(--vegas-kenburns-translate))'
		);
		expect(KEN_BURNS_KEYFRAMES_CSS).toContain(
			'translate(0, calc(-1 * var(--vegas-kenburns-translate)))'
		);
	});
});

describe('injectKeyframes', () => {
	beforeEach(() => {
		document.head.querySelectorAll(`style[${KEYFRAMES_STYLE_MARKER}]`)
			.forEach(node => node.remove());
	});

	it('injects a single marked style element', () => {
		injectKeyframes(KEN_BURNS_KEYFRAMES_CSS);

		const styles = document.head.querySelectorAll(`style[${KEYFRAMES_STYLE_MARKER}]`);
		expect(styles).toHaveLength(1);
		expect(styles[0].textContent).toBe(KEN_BURNS_KEYFRAMES_CSS);
	});

	it('is idempotent across repeated calls', () => {
		injectKeyframes(KEN_BURNS_KEYFRAMES_CSS);
		injectKeyframes(KEN_BURNS_KEYFRAMES_CSS);
		injectKeyframes(KEN_BURNS_KEYFRAMES_CSS);

		expect(document.head.querySelectorAll(`style[${KEYFRAMES_STYLE_MARKER}]`)).toHaveLength(1);
	});
});
