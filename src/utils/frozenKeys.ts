/**
 * 从一个字面量对象里取出 key 集合，冻结成运行时数组，并把类型收窄成 `keyof T & string`
 * （而不是 `Object.keys` 原本返回的宽泛 `string[]`）。
 *
 * 这里的类型断言之所以安全：调用方传入的 `obj` 必须是一个 key 已经是精确字面量联合的对象
 * （通常是用 `satisfies Record<string, ...>` 标注、而不是 `: Record<string, ...>` 标注的
 * 表——后者会让 key 类型退化成 `string`）。这样 `Object.keys(obj)` 在运行时返回的字符串
 * 集合，与 `keyof T` 这个类型层面的字面量联合，内容永远一一对应；断言只是把 TS 类型系统
 * 本身无法从 `Object.keys` 的签名推出的这层等价关系重新对齐，不会引入运行时与类型不符的
 * 风险。
 */
export const frozenKeys = <T extends Record<string, unknown>>(
	obj: T
): readonly (keyof T & string)[] => Object.freeze(Object.keys(obj)) as readonly (keyof T & string)[];
