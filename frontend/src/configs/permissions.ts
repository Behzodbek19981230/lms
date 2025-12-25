export type CenterPermissionKey =
	| 'tests'
	| 'exams'
	| 'test_generation'
	| 'checking'
	| 'telegram_integration'
	| 'attendance'
	| 'attendance_telegram_notifications'
	| 'payments'
	| 'payments_telegram_notifications'
	| 'reports_students'
	| 'reports_tests'
	| 'reports_attendance'
	| 'reports_payments';

export const PERMISSION_LABELS: Record<CenterPermissionKey, string> = {
	tests: 'Test tuzish / testlar',
	exams: 'Imtihon',
	test_generation: 'Test generatsiya',
	checking: 'Tekshirish (scanner)',
	telegram_integration: 'Telegram integratsiya',
	attendance: 'Davomat qilish',
	attendance_telegram_notifications: 'Davomatni bot orqali yuborish',
	payments: "To'lovlarni nazorat qilish",
	payments_telegram_notifications: "To'lovlarni bot orqali yuborish",
	reports_students: "Hisobotlar: studentlar",
	reports_tests: "Hisobotlar: testlar",
	reports_attendance: "Hisobotlar: davomot",
	reports_payments: "Hisobotlar: to'lovlar",
};

export function hasCenterPermission(
	centerPermissions: Record<string, boolean> | undefined | null,
	key: CenterPermissionKey,
): boolean {
	// If permissions not loaded yet, default allow to avoid breaking old centers.
	if (!centerPermissions) return true;
	return centerPermissions[key] !== false;
}
