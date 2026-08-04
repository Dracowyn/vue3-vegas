/** 从 register 池里随机取名；池为空或未提供时退回全量名单 */
export const pickRandomName = (
	pool: string[] | undefined,
	fallbackPool: readonly string[]
): string => {
	const candidates = pool && pool.length > 0 ? pool : fallbackPool;
	return candidates[Math.floor(Math.random() * candidates.length)];
};

/**
 * 解析效果名，支持原版的 `'random'` 语义。
 * 未知名字回退到 fallback，并通过 onUnknown 上报（调用方在 debug 打开时告警）。
 */
export const resolveEffectName = (
	requested: string | null | undefined,
	register: string[] | undefined,
	allNames: readonly string[],
	fallback: string | null,
	onUnknown?: (name: string) => void
): string | null => {
	if (!requested) return fallback;
	if (requested === 'random') return pickRandomName(register, allNames);
	if (allNames.includes(requested)) return requested;

	onUnknown?.(requested);
	return fallback;
};

/** 解析时长。`'auto'` 取 autoValue（原版语义：等于该张幻灯片的有效 delay） */
export const resolveEffectDuration = (
	requested: number | 'auto' | null | undefined,
	autoValue: number,
	fallback: number
): number => {
	if (requested === 'auto') return autoValue;
	if (typeof requested === 'number') return requested;
	return fallback;
};
