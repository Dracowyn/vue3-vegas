/**
 * 判断（或等待）一张图片是否「就绪」——对齐原版 Vegas.js `_goto` 的语义：
 * `img = new Image(); img.src = src; if (img.complete) go(); else img.onload = go;`
 *
 * 「就绪」包含加载成功与加载失败两种情况：失败也要放行，否则一张坏图会让整个
 * 幻灯片切换永远卡住。`complete` 为 `true`（多半是浏览器缓存命中）时**同步**调用
 * `onReady`——这是上游的语义，调用方（导航的「同步快路径」）依赖这一点。
 *
 * 不做任何与 Vue 相关的事，方便单测；调用方通过返回的 `cancel()` 摘掉监听，
 * 防止组件卸载或该次请求被新的导航取代后仍然触发 `onReady`。
 */
export const whenImageReady = (src: string, onReady: () => void): (() => void) => {
	const img = new Image();
	let done = false;

	const finish = () => {
		if (done) return;
		done = true;
		img.onload = null;
		img.onerror = null;
		onReady();
	};

	img.onload = finish;
	img.onerror = finish;
	img.src = src;

	// 赋值 src 之后才检查:一些环境（含测试里的假实现）可能在赋值期间就同步触发
	// onload/onerror，finish 内的 done 标记保证不会因此重复调用 onReady
	if (img.complete) finish();

	return () => {
		if (done) return;
		done = true;
		img.onload = null;
		img.onerror = null;
	};
};
