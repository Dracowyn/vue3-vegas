import { ref, watch, onUnmounted } from 'vue';
import type { Logger } from '../types';

export const useVisibilityChange = (
	getIsPlaying: () => boolean,
	play: () => void,
	pause: () => void,
	log: () => Logger
) => {
	const shouldResume = ref(false);

	const handleVisibilityChange = () => {
		if (document.hidden) {
			shouldResume.value = getIsPlaying();
			log()('页面隐藏，暂停播放幻灯片');
			pause();
		} else if (shouldResume.value) {
			log()('页面可见，继续播放幻灯片');
			play();
		}
	};

	document.addEventListener('visibilitychange', handleVisibilityChange);

	// Keep playing state in sync
	watch(getIsPlaying, () => {
		// no-op, just track for visibility handler
	});

	onUnmounted(() => {
		document.removeEventListener('visibilitychange', handleVisibilityChange);
	});
};
