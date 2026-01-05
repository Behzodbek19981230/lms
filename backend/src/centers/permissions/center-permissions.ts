export enum CenterPermissionKey {
  TESTS = 'tests', // test tuzish / testlar bilan ishlash
  EXAMS = 'exams', // imtihon
  TEST_GENERATION = 'test_generation', // test generatsiya
  CHECKING = 'checking', // tekshirish (scanner / checking UI)
  TELEGRAM_INTEGRATION = 'telegram_integration', // telegram management
  ATTENDANCE = 'attendance', // davomat qilish
  ATTENDANCE_TELEGRAM_NOTIFICATIONS = 'attendance_telegram_notifications', // bot orqali yuborish
  TASKS = 'tasks', // vazifalar
  TASKS_TELEGRAM_NOTIFICATIONS = 'tasks_telegram_notifications', // bot orqali yuborish
  PAYMENTS = 'payments', // to'lovlarni nazorat qilish
  PAYMENTS_TELEGRAM_NOTIFICATIONS = 'payments_telegram_notifications', // bot orqali yuborish
  REPORTS_STUDENTS = 'reports_students',
  REPORTS_TESTS = 'reports_tests',
  REPORTS_ATTENDANCE = 'reports_attendance',
  REPORTS_PAYMENTS = 'reports_payments',
}

export type CenterPermissions = Partial<Record<CenterPermissionKey, boolean>>;

export const DEFAULT_CENTER_PERMISSIONS: Record<CenterPermissionKey, boolean> =
  {
    [CenterPermissionKey.TESTS]: true,
    [CenterPermissionKey.EXAMS]: true,
    [CenterPermissionKey.TEST_GENERATION]: true,
    [CenterPermissionKey.CHECKING]: true,
    [CenterPermissionKey.TELEGRAM_INTEGRATION]: true,
    [CenterPermissionKey.ATTENDANCE]: true,
    [CenterPermissionKey.ATTENDANCE_TELEGRAM_NOTIFICATIONS]: true,
    [CenterPermissionKey.TASKS]: true,
    [CenterPermissionKey.TASKS_TELEGRAM_NOTIFICATIONS]: true,
    [CenterPermissionKey.PAYMENTS]: true,
    [CenterPermissionKey.PAYMENTS_TELEGRAM_NOTIFICATIONS]: true,
    [CenterPermissionKey.REPORTS_STUDENTS]: true,
    [CenterPermissionKey.REPORTS_TESTS]: true,
    [CenterPermissionKey.REPORTS_ATTENDANCE]: true,
    [CenterPermissionKey.REPORTS_PAYMENTS]: true,
  };

export function getEffectiveCenterPermissions(
  permissions?: CenterPermissions | null,
) {
  return {
    ...DEFAULT_CENTER_PERMISSIONS,
    ...(permissions || {}),
  };
}
