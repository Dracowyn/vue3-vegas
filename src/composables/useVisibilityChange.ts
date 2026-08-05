import { onMounted, onUnmounted } from 'vue';
import type { Logger } from '../types';

export const useVisibilityChange = (
	// 重新可见时是否应恢复播放：不仅要覆盖「正在播放」，还要覆盖「首帧阶段但
	// autoplay 即将开始播放」这种尚未进入 playing 阶段的场景，否则隐藏发生在
	// 首帧窗口内时会被记成 false，切回标签页后永远不恢复。
	getShouldResume: () => boolean,
	play: () => void,
	pause: () => void,
	log: () => Logger
) => {
	let shouldResume = false;

	const handleVisibilityChange = () => {
		if (document.hidden) {
			shouldResume = getShouldResume();
			log()('页面隐藏，暂停播放幻灯片');
			pause();
		} else if (shouldResume) {
			log()('页面可见，继续播放幻灯片');
			play();
		}
	};

	// Guard document access for SSR — only bind on the client.
	onMounted(() => {
		document.addEventListener('visibilitychange', handleVisibilityChange);
	});

	onUnmounted(() => {
		document.removeEventListener('visibilitychange', handleVisibilityChange);
	});
};
