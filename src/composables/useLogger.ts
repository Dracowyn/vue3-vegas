import { computed } from 'vue';
import type { Logger } from '../types';

const noopLogger: Logger = () => {};

export const useLogger = (debug: () => boolean) => {
	const log = computed<Logger>(() =>
		debug() ? console.log.bind(console) : noopLogger
	);
	const logError = computed<Logger>(() =>
		debug() ? console.error.bind(console) : noopLogger
	);
	const logWarn = computed<Logger>(() =>
		debug() ? console.warn.bind(console) : noopLogger
	);

	return { log, logError, logWarn };
};
