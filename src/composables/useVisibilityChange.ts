import { onUnmounted } from 'vue';
import type { Logger } from '../types';

export const useVisibilityChange = (
	getIsPlaying: () => boolean,
	play: () => void,
	pause: () => void,
	log: () => Logger
) => {
	let shouldResume = false;

	const handleVisibilityChange = () => {
		if (document.hidden) {
			shouldResume = getIsPlaying();
			log()('页面隐藏，暂停播放幻灯片');
			pause();
		} else if (shouldResume) {
			log()('页面可见，继续播放幻灯片');
			play();
		}
	};

	document.addEventListener('visibilitychange', handleVisibilityChange);

	onUnmounted(() => {
		document.removeEventListener('visibilitychange', handleVisibilityChange);
	});
};
