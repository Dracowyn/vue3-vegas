/**
 * 从候选池里随机取名。原版语义：register 是把自定义名**并入**内置池，而不是限定它——
 * 池为空/未提供时就是纯内置池；有内容时是「内置池 + register」的合集。
 */
export const pickRandomName = (
	pool: string[] | undefined,
	fallbackPool: readonly string[]
): string => {
	const candidates = pool && pool.length > 0 ? fallbackPool.concat(pool) : fallbackPool;
	return candidates[Math.floor(Math.random() * candidates.length)];
};

/**
 * 解析效果名，支持原版的 `'random'` 与数组语义：
 * - `'random'`：从「内置池 + register」的合集里随机抽一个。
 * - 数组：从数组本身随机抽一个（不合并 register，原版就是这个语义）。
 *
 * 未知名字（既不在内置名单、也未通过 register 登记）回退到 fallback，
 * 并通过 onUnknown 上报（调用方在 debug 打开时告警）。
 */
export const resolveEffectName = (
	requested: string | string[] | null | undefined,
	register: string[] | undefined,
	allNames: readonly string[],
	fallback: string | null,
	onUnknown?: (name: string) => void
): string | null => {
	if (!requested || (Array.isArray(requested) && requested.length === 0)) return fallback;

	const name = Array.isArray(requested)
		? pickRandomName(undefined, requested)
		: requested === 'random'
			? pickRandomName(register, allNames)
			: requested;

	// 合法 = 内置名单里有，或者 register 显式登记过——自定义名靠 CSS 类生效，
	// 不出现在内置名单里，但登记过的名字本身就是合法输入，不能当成拼写错误上报
	if (allNames.includes(name) || (register?.includes(name) ?? false)) return name;

	onUnknown?.(name);
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
