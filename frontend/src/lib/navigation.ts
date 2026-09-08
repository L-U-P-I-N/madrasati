/** ربط مفاتيح الوحدات القادمة من الخادم بمسارات الواجهة. */
export const MODULE_ROUTES: Record<string, string> = {
  students: '/students',
  teachers: '/teachers',
  classrooms: '/classrooms',
  schedule: '/schedule',
  daily_lessons: '/daily-lessons',
  grades: '/grades',
  followup: '/followup',
  student_notes: '/student-notes',
  news: '/news',
  notifications: '/notifications',
  permissions: '/permissions',
  activity_log: '/activity-log',
};

export const GROUP_ORDER = ['الأشخاص', 'التنظيم', 'التدريس', 'التواصل', 'النظام'];

/** قائمة الطالب — لوحته الخاصة لا تمر بمصفوفة صلاحيات الإدارة. */
export const STUDENT_MENU = [
  { href: '/me', label: 'لوحتي', icon: 'home' },
  { href: '/me/grades', label: 'درجاتي', icon: 'chart' },
  { href: '/me/schedule', label: 'جدولي الأسبوعي', icon: 'calendar' },
  { href: '/me/lessons', label: 'الدروس المعطاة', icon: 'clock' },
  { href: '/me/notes', label: 'ملاحظاتي', icon: 'note' },
  { href: '/news', label: 'الأخبار والأنشطة', icon: 'megaphone' },
];
