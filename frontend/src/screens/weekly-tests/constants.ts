export const WEEKLY_TEST_TAG = 'WEEKLY_TEST';

export function buildWeeklyDescription(fromIso: string, toIso: string) {
	return `${WEEKLY_TEST_TAG}|from=${fromIso}|to=${toIso}`;
}

export function isWeeklyDescription(description: string | null | undefined) {
	return (description || '').includes(WEEKLY_TEST_TAG);
}
