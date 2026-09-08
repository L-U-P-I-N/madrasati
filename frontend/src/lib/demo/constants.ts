/**
 * نسخة طبق الأصل من app/Support/{Modules,PermissionLevel,Role}.php ومصفوفة
 * الصلاحيات الافتراضية في PermissionController — لتبقى الواجهة التجريبية
 * (وضع العرض الثابت) متطابقة تماما مع سلوك الخادم الحقيقي حين يُوصل لاحقا.
 */

export const MODULES = [
  { key: 'students', label: 'إدارة الطلاب', icon: 'users', group: 'الأشخاص' },
  { key: 'teachers', label: 'إدارة المعلمين', icon: 'academic', group: 'الأشخاص' },
  { key: 'classrooms', label: 'إدارة الصفوف', icon: 'building', group: 'التنظيم' },
  { key: 'schedule', label: 'الجدول الأسبوعي', icon: 'calendar', group: 'التنظيم' },
  { key: 'daily_lessons', label: 'الحصص اليومية', icon: 'clock', group: 'التدريس' },
  { key: 'grades', label: 'إدارة الدرجات', icon: 'chart', group: 'التدريس' },
  { key: 'followup', label: 'دفتر المتابعة', icon: 'book', group: 'التدريس' },
  { key: 'student_notes', label: 'ملاحظات الطلاب', icon: 'note', group: 'التدريس' },
  { key: 'news', label: 'الأخبار والأنشطة', icon: 'megaphone', group: 'التواصل' },
  { key: 'notifications', label: 'إدارة الإشعارات', icon: 'bell', group: 'التواصل' },
  { key: 'permissions', label: 'إدارة الصلاحيات', icon: 'shield', group: 'النظام' },
  { key: 'activity_log', label: 'سجل العمليات', icon: 'history', group: 'النظام' },
] as const;

export type ModuleKey = (typeof MODULES)[number]['key'];

export const MODULE_KEYS = MODULES.map((m) => m.key) as ModuleKey[];

export function moduleLabel(key: string): string {
  return MODULES.find((m) => m.key === key)?.label ?? key;
}

export const LEVEL = { NONE: 0, VIEW: 1, CREATE: 2, EDIT: 3, FULL: 4 } as const;

export const LEVEL_OPTIONS = [
  { value: LEVEL.NONE, label: 'بدون صلاحية' },
  { value: LEVEL.VIEW, label: 'عرض فقط' },
  { value: LEVEL.CREATE, label: 'إضافة وعرض' },
  { value: LEVEL.EDIT, label: 'إضافة وتعديل وعرض' },
  { value: LEVEL.FULL, label: 'صلاحية كاملة' },
];

const ABILITY_LEVEL: Record<string, number> = {
  view: LEVEL.VIEW,
  create: LEVEL.CREATE,
  update: LEVEL.EDIT,
  delete: LEVEL.FULL,
};

export function requiredFor(ability: string): number {
  return ABILITY_LEVEL[ability] ?? LEVEL.FULL;
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'مدير النظام',
  principal: 'مدير المدرسة',
  vice_principal: 'نائب المدير',
  secretary: 'السكرتير / الإداري',
  teacher: 'المعلم',
  student: 'الطالب',
};

export const UNRESTRICTED_ROLES = ['super_admin', 'principal'];
export const STAFF_ROLES = ['vice_principal', 'secretary'];

/** مصفوفة الصلاحيات الافتراضية لكل دور — طبق الأصل من PermissionController::defaults(). */
export const ROLE_DEFAULTS: Record<string, Record<string, number>> = {
  vice_principal: {
    students: LEVEL.EDIT,
    teachers: LEVEL.EDIT,
    grades: LEVEL.VIEW,
    classrooms: LEVEL.EDIT,
    daily_lessons: LEVEL.VIEW,
    schedule: LEVEL.EDIT,
    followup: LEVEL.VIEW,
    news: LEVEL.EDIT,
    student_notes: LEVEL.EDIT,
    permissions: LEVEL.NONE,
    activity_log: LEVEL.VIEW,
    notifications: LEVEL.CREATE,
  },
  secretary: {
    students: LEVEL.CREATE,
    teachers: LEVEL.VIEW,
    grades: LEVEL.NONE,
    classrooms: LEVEL.VIEW,
    daily_lessons: LEVEL.NONE,
    schedule: LEVEL.VIEW,
    followup: LEVEL.NONE,
    news: LEVEL.CREATE,
    student_notes: LEVEL.VIEW,
    permissions: LEVEL.NONE,
    activity_log: LEVEL.NONE,
    notifications: LEVEL.NONE,
  },
  teacher: {
    students: LEVEL.VIEW,
    teachers: LEVEL.NONE,
    grades: LEVEL.EDIT,
    classrooms: LEVEL.VIEW,
    daily_lessons: LEVEL.EDIT,
    schedule: LEVEL.VIEW,
    followup: LEVEL.EDIT,
    news: LEVEL.VIEW,
    student_notes: LEVEL.EDIT,
    permissions: LEVEL.NONE,
    activity_log: LEVEL.NONE,
    notifications: LEVEL.VIEW,
  },
  student: {
    news: LEVEL.VIEW,
    notifications: LEVEL.VIEW,
  },
};

export const GROUP_ORDER = ['الأشخاص', 'التنظيم', 'التدريس', 'التواصل', 'النظام'];
