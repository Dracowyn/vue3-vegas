/**
 * `Array.isArray` 收窄 `string | readonly string[]` 这类联合类型时有个已知怪癖：它的类型
 * 谓词是 `arg is any[]`（可变数组），TS 判断能否在 else 分支里排除某个联合成员靠的是
 * 「该成员是否可赋值给谓词类型」，而 `readonly string[]` 不能反向赋值给可变的 `any[]`，
 * 于是 else 分支里 `readonly string[]` 不会被排除，仍然留在联合类型里，导致后续当作
 * `string` 使用时报错。这里用一个显式指向 `readonly string[]` 的守卫替代
 * `Array.isArray`，让 true / false 两个分支都能正确收窄。
 */
export const isStringArray = (value: unknown): value is readonly string[] => Array.isArray(value);
