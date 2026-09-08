import { LEVEL, ROLE_DEFAULTS } from './constants';

/**
 * بيانات ثابتة لوضع العرض التجريبي (Demo Mode) — نسخة مبسّطة من DemoSeeder.php
 * بنفس الأسماء والحسابات، تُحمَّل في الذاكرة فقط ولا تلمس أي خادم حقيقي.
 * الغرض: عرض المنتج على العميل عبر Vercel دون الحاجة لتشغيل الخادم.
 */

export const DEMO_PASSWORD = 'Madrasati@2026';

export interface DemoUser {
  id: number;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: 'principal' | 'vice_principal' | 'secretary' | 'teacher' | 'student';
  is_active: boolean;
  last_login_at: string | null;
}

export const users: DemoUser[] = [
  { id: 1, name: 'د. عبدالله الراجحي', username: 'principal', email: 'principal@madrasati.sa', phone: '0551234567', role: 'principal', is_active: true, last_login_at: iso(-1) },
  { id: 2, name: 'أ. سعد المطيري', username: 'vice', email: 'vice@madrasati.sa', phone: '0552234567', role: 'vice_principal', is_active: true, last_login_at: iso(-2) },
  { id: 3, name: 'أ. هند العتيبي', username: 'secretary', email: 'secretary@madrasati.sa', phone: '0553234567', role: 'secretary', is_active: true, last_login_at: iso(0) },
  { id: 4, name: 'أ. ماجد الشهري', username: 'teacher.majed', email: 'teacher.majed@madrasati.sa', phone: '0554234567', role: 'teacher', is_active: true, last_login_at: iso(0) },
  { id: 5, name: 'أ. نوف الدوسري', username: 'teacher.nouf', email: 'teacher.nouf@madrasati.sa', phone: '0555234567', role: 'teacher', is_active: true, last_login_at: iso(-3) },
  { id: 6, name: 'أ. خالد الغامدي', username: 'teacher.khalid', email: 'teacher.khalid@madrasati.sa', phone: '0556234567', role: 'teacher', is_active: true, last_login_at: iso(-5) },
  { id: 7, name: 'أ. ريم الحارثي', username: 'teacher.reem', email: 'teacher.reem@madrasati.sa', phone: '0557234567', role: 'teacher', is_active: true, last_login_at: iso(-1) },
  { id: 20, name: 'عبدالرحمن السالم', username: 'S-02601', email: null, phone: null, role: 'student', is_active: true, last_login_at: iso(0) },
];

export const teachers = [
  { id: 1, user_id: 4, employee_no: 'T-1001', specialization: 'الرياضيات', qualification: 'بكالوريوس تربية', hired_on: '2020-08-20' },
  { id: 2, user_id: 5, employee_no: 'T-1002', specialization: 'اللغة الإنجليزية', qualification: 'بكالوريوس تربية', hired_on: '2021-08-15' },
  { id: 3, user_id: 6, employee_no: 'T-1003', specialization: 'العلوم', qualification: 'بكالوريوس علوم', hired_on: '2019-08-10' },
  { id: 4, user_id: 7, employee_no: 'T-1004', specialization: 'اللغة العربية', qualification: 'بكالوريوس آداب', hired_on: '2022-08-01' },
];

export const academicYear = { id: 1, name: '١٤٤٧ هـ / ٢٠٢٦ م', is_current: true };

export const classrooms = [
  { id: 1, academic_year_id: 1, grade_level: 'الثامن', section: 'ب', name: 'الثامن — ب', capacity: 30, homeroom_teacher_id: null as number | null },
  { id: 2, academic_year_id: 1, grade_level: 'التاسع', section: 'أ', name: 'التاسع — أ', capacity: 30, homeroom_teacher_id: 4 },
  { id: 3, academic_year_id: 1, grade_level: 'العاشر', section: 'أ', name: 'العاشر — أ', capacity: 30, homeroom_teacher_id: 1 },
  { id: 4, academic_year_id: 1, grade_level: 'العاشر', section: 'ب', name: 'العاشر — ب', capacity: 30, homeroom_teacher_id: null },
  { id: 5, academic_year_id: 1, grade_level: 'الحادي عشر', section: 'أ', name: 'الحادي عشر — أ', capacity: 30, homeroom_teacher_id: null },
];

export const subjects = [
  { id: 1, name: 'القرآن الكريم', code: 'QURAN', max_grade: 100 },
  { id: 2, name: 'اللغة العربية', code: 'ARB', max_grade: 100 },
  { id: 3, name: 'الرياضيات', code: 'MATH', max_grade: 100 },
  { id: 4, name: 'العلوم', code: 'SCI', max_grade: 100 },
  { id: 5, name: 'اللغة الإنجليزية', code: 'ENG', max_grade: 100 },
  { id: 6, name: 'الدراسات الاجتماعية', code: 'SOC', max_grade: 100 },
  { id: 7, name: 'الحاسب الآلي', code: 'CS', max_grade: 100 },
];

const T = { MATH: 1, ENG: 2, SCI: 3, ARB: 4 }; // teacher id by subject code
const S = { MATH: 3, ENG: 5, SCI: 4, ARB: 2 }; // subject id by code
const C = { c8b: 1, c9a: 2, c10a: 3, c10b: 4, c11a: 5 };

export const assignments = [
  { id: 1, teacher_id: T.MATH, subject_id: S.MATH, classroom_id: C.c10a },
  { id: 2, teacher_id: T.MATH, subject_id: S.MATH, classroom_id: C.c10b },
  { id: 3, teacher_id: T.MATH, subject_id: S.MATH, classroom_id: C.c11a },
  { id: 4, teacher_id: T.ENG, subject_id: S.ENG, classroom_id: C.c10a },
  { id: 5, teacher_id: T.ENG, subject_id: S.ENG, classroom_id: C.c9a },
  { id: 6, teacher_id: T.ENG, subject_id: S.ENG, classroom_id: C.c8b },
  { id: 7, teacher_id: T.SCI, subject_id: S.SCI, classroom_id: C.c10a },
  { id: 8, teacher_id: T.SCI, subject_id: S.SCI, classroom_id: C.c10b },
  { id: 9, teacher_id: T.SCI, subject_id: S.SCI, classroom_id: C.c9a },
  { id: 10, teacher_id: T.ARB, subject_id: S.ARB, classroom_id: C.c8b },
  { id: 11, teacher_id: T.ARB, subject_id: S.ARB, classroom_id: C.c9a },
  { id: 12, teacher_id: T.ARB, subject_id: S.ARB, classroom_id: C.c10a },
];

const TIMES: Record<number, [string, string]> = {
  1: ['07:00', '07:45'], 2: ['07:50', '08:35'], 3: ['08:40', '09:25'], 4: ['09:45', '10:30'],
  5: ['10:35', '11:20'], 6: ['11:25', '12:10'], 7: ['12:30', '13:15'], 8: ['13:20', '14:05'],
};

export const scheduleSlots = [
  { id: 1, classroom_id: C.c10a, subject_id: S.MATH, teacher_id: T.MATH, day_of_week: 0, period: 1 },
  { id: 2, classroom_id: C.c10a, subject_id: S.ENG, teacher_id: T.ENG, day_of_week: 0, period: 2 },
  { id: 3, classroom_id: C.c10a, subject_id: S.SCI, teacher_id: T.SCI, day_of_week: 0, period: 3 },
  { id: 4, classroom_id: C.c10a, subject_id: S.ARB, teacher_id: T.ARB, day_of_week: 1, period: 1 },
  { id: 5, classroom_id: C.c10a, subject_id: S.MATH, teacher_id: T.MATH, day_of_week: 1, period: 2 },
  { id: 6, classroom_id: C.c10a, subject_id: S.SCI, teacher_id: T.SCI, day_of_week: 2, period: 1 },
  { id: 7, classroom_id: C.c10a, subject_id: S.ENG, teacher_id: T.ENG, day_of_week: 2, period: 2 },
  { id: 8, classroom_id: C.c10b, subject_id: S.MATH, teacher_id: T.MATH, day_of_week: 0, period: 4 },
  { id: 9, classroom_id: C.c10b, subject_id: S.SCI, teacher_id: T.SCI, day_of_week: 1, period: 3 },
  { id: 10, classroom_id: C.c9a, subject_id: S.ARB, teacher_id: T.ARB, day_of_week: 0, period: 5 },
  { id: 11, classroom_id: C.c9a, subject_id: S.ENG, teacher_id: T.ENG, day_of_week: 1, period: 4 },
  { id: 12, classroom_id: C.c9a, subject_id: S.SCI, teacher_id: T.SCI, day_of_week: 2, period: 3 },
  { id: 13, classroom_id: C.c8b, subject_id: S.ENG, teacher_id: T.ENG, day_of_week: 0, period: 6 },
  { id: 14, classroom_id: C.c8b, subject_id: S.ARB, teacher_id: T.ARB, day_of_week: 1, period: 5 },
  { id: 15, classroom_id: C.c11a, subject_id: S.MATH, teacher_id: T.MATH, day_of_week: 2, period: 4 },
].map((s) => ({ ...s, starts_at: TIMES[s.period][0], ends_at: TIMES[s.period][1] }));

export interface DemoStudent {
  id: number;
  user_id: number | null;
  classroom_id: number;
  student_no: string;
  full_name: string;
  guardian_name: string;
  guardian_phone: string;
  status: 'active' | 'pending' | 'withdrawn';
  enrolled_on: string;
  birth_date: string;
  national_id: string | null;
  address: string | null;
}

const studentRows: [string, number, DemoStudent['status']][] = [
  ['عبدالرحمن السالم', C.c10a, 'active'],
  ['لمى الزهراني', C.c10a, 'active'],
  ['يوسف الحربي', C.c8b, 'pending'],
  ['نور القحطاني', C.c11a, 'active'],
  ['فيصل العنزي', C.c10a, 'active'],
  ['جواهر السبيعي', C.c10b, 'active'],
  ['تركي الشمري', C.c9a, 'active'],
  ['رزان البقمي', C.c9a, 'active'],
  ['محمد الدوسري', C.c10b, 'active'],
  ['سارة المالكي', C.c8b, 'active'],
  ['عمر الزهراني', C.c11a, 'active'],
  ['ديمة العسيري', C.c10a, 'active'],
];

export const students: DemoStudent[] = studentRows.map(([full_name, classroom_id, status], index) => ({
  id: index + 1,
  user_id: index === 0 ? 20 : null,
  classroom_id,
  student_no: `S-${String(2601 + index).padStart(5, '0')}`,
  full_name,
  guardian_name: `ولي أمر ${full_name}`,
  guardian_phone: `05${(10000000 + index * 137).toString().padStart(8, '0')}`,
  status,
  enrolled_on: iso(-(200 - index * 10)),
  birth_date: iso(-365 * (13 + (index % 5))),
  national_id: null,
  address: null,
}));

export const grades = (() => {
  const map: Record<string, { teacher: number; subject: number }> = {
    MATH: { teacher: T.MATH, subject: S.MATH },
    ENG: { teacher: T.ENG, subject: S.ENG },
    SCI: { teacher: T.SCI, subject: S.SCI },
    ARB: { teacher: T.ARB, subject: S.ARB },
  };
  const rows: any[] = [];
  let id = 1;

  for (const student of students) {
    if (student.status !== 'active') continue;

    for (const code of Object.keys(map)) {
      const { teacher, subject } = map[code];
      const assigned = assignments.some((a) => a.teacher_id === teacher && a.subject_id === subject && a.classroom_id === student.classroom_id);
      if (!assigned) continue;

      for (const [type, max] of [['أعمال فصلية', 40], ['الاختبار النهائي', 60]] as const) {
        rows.push({
          id: id++,
          student_id: student.id,
          subject_id: subject,
          classroom_id: student.classroom_id,
          teacher_id: teacher,
          term: 'الفصل الأول',
          assessment_type: type,
          score: Math.round(max * (0.65 + ((student.id * 7 + id) % 30) / 100)),
          max_score: max,
          remark: null,
        });
      }
    }
  }

  return rows;
})();

export const followupEntries = [
  {
    id: 1, teacher_id: T.MATH, subject_id: S.MATH, classroom_id: C.c10a, term: 'الفصل الأول', month: 3,
    objectives: '١. إتقان حل المعادلات من الدرجة الثانية بالطرق الثلاث.\n٢. ربط الدالة التربيعية بتمثيلها البياني.\n٣. توظيف المعادلات في مسائل حياتية.',
    planned_lessons: 'الأسبوع الأول: التحليل إلى العوامل.\nالأسبوع الثاني: إكمال المربع.\nالأسبوع الثالث: الصيغة العامة.\nالأسبوع الرابع: مراجعة وتقويم.',
    achievements: 'أُنجزت دروس الأسبوعين الأول والثاني وفق الخطة.',
  },
  {
    id: 2, teacher_id: T.ARB, subject_id: S.ARB, classroom_id: C.c9a, term: 'الفصل الأول', month: 3,
    objectives: '١. تمييز الممنوع من الصرف وعلله.\n٢. تحسين مهارة الإعراب التطبيقي.\n٣. إثراء الحصيلة اللغوية من نصوص المطالعة.',
    planned_lessons: 'الأسبوع الأول: العلم الممنوع من الصرف.\nالأسبوع الثاني: الصفة الممنوعة من الصرف.\nالأسبوع الثالث: صيغة منتهى الجموع.',
    achievements: null,
  },
];

export const studentNotes = [
  { id: 1, student_id: 1, author_id: 4, subject_id: S.MATH, type: 'positive' as const, title: 'مشاركة متميزة', body: 'أظهر الطالب تفاعلا لافتا في حصة الرياضيات وحلّ تمرينا إضافيا أمام زملائه.', noted_on: iso(-3) },
  { id: 2, student_id: 2, author_id: 5, subject_id: S.ENG, type: 'positive' as const, title: 'التزام بالواجبات', body: 'سلّمت الطالبة جميع واجبات الشهر في وقتها وبإتقان واضح.', noted_on: iso(-5) },
  { id: 3, student_id: 5, author_id: 4, subject_id: null, type: 'negative' as const, title: 'تأخر متكرر', body: 'تكرر تأخر الطالب عن الحصة الأولى ثلاث مرات هذا الأسبوع.', noted_on: iso(-1) },
  { id: 4, student_id: 7, author_id: 7, subject_id: S.ARB, type: 'positive' as const, title: 'تحسن ملحوظ', body: 'ارتفع مستوى الطالب في الإعراب التطبيقي مقارنة بالشهر الماضي.', noted_on: iso(-6) },
];

export const dailyLessons = [
  { id: 1, schedule_slot_id: 1, classroom_id: C.c10a, subject_id: S.MATH, teacher_id: T.MATH, lesson_date: iso(0), period: 1, title: 'المعادلات من الدرجة الثانية', content: 'شرح صيغة الحل العام مع خمسة أمثلة تطبيقية على السبورة، وحل تمارين الكتاب ٣ إلى ٧.', homework: 'تمارين الصفحة ٨٤' },
  { id: 2, schedule_slot_id: 2, classroom_id: C.c10a, subject_id: S.ENG, teacher_id: T.ENG, lesson_date: iso(0), period: 2, title: 'Present Perfect Tense', content: 'مراجعة التصريف الثالث للأفعال الشائعة، وتدريب شفهي على الفرق بين since و for.', homework: 'Workbook page 32' },
  { id: 3, schedule_slot_id: 3, classroom_id: C.c10a, subject_id: S.SCI, teacher_id: T.SCI, lesson_date: iso(-1), period: 3, title: 'التركيب الضوئي', content: 'تجربة عملية في المختبر لإثبات إنتاج الأكسجين، ومناقشة العوامل المؤثرة في معدل البناء الضوئي.', homework: null },
  { id: 4, schedule_slot_id: 10, classroom_id: C.c9a, subject_id: S.ARB, teacher_id: T.ARB, lesson_date: iso(-1), period: 5, title: 'الممنوع من الصرف', content: 'شرح العلل التسع مع استخراج أمثلة من نص القراءة، وتدريب إعرابي جماعي.', homework: 'حفظ الأبيات من ١ إلى ٦' },
];

export interface DemoNews {
  id: number;
  author_id: number;
  type: 'news' | 'activity';
  title: string;
  excerpt: string | null;
  body: string;
  is_published: boolean;
  published_at: string | null;
}

export const news: DemoNews[] = [
  { id: 1, author_id: 1, type: 'news', title: 'بدء التسجيل في برنامج الموهبة للفصل الثاني', excerpt: 'يفتح باب الترشيح لطلاب المرحلتين المتوسطة والثانوية حتى نهاية الشهر.', body: 'تعلن إدارة المدرسة عن فتح باب الترشيح لبرنامج رعاية الموهوبين للفصل الدراسي الثاني.\n\nتُقدَّم الطلبات لدى المرشد الطلابي، ويشترط ألا يقل المعدل التراكمي عن ٩٠٪، مع تزكية من معلم المادة.', is_published: true, published_at: iso(-6) },
  { id: 2, author_id: 2, type: 'activity', title: 'اليوم الرياضي السنوي', excerpt: 'فعاليات رياضية لجميع المراحل يوم الأربعاء القادم في ساحة المدرسة.', body: 'ينظّم قسم النشاط اليوم الرياضي السنوي يوم الأربعاء من الساعة الثامنة حتى الحادية عشرة.\n\nتشمل الفعاليات مسابقات الجري والقوى والكرة الطائرة، وتُكرَّم الفرق الفائزة في الطابور الصباحي التالي.', is_published: true, published_at: iso(-3) },
  { id: 3, author_id: 1, type: 'news', title: 'جدول الاختبارات النهائية للفصل الأول', excerpt: 'اعتُمد الجدول ويمكن للطلاب الاطلاع عليه من لوحاتهم الشخصية.', body: 'اعتمدت الإدارة جدول الاختبارات النهائية للفصل الدراسي الأول.\n\nتبدأ الاختبارات في الأسبوع الأخير من الشهر، ويُرجى من الطلاب مراجعة الجدول من خلال قسم «جدولي الأسبوعي» في حساباتهم.', is_published: true, published_at: iso(0) },
];

/** إشعار لكل مستخدم عن كل خبر منشور — يطابق سلوك Notifier::newsPublished الحقيقي. */
export const notifications = (() => {
  const rows: any[] = [];
  let id = 1;

  for (const item of news) {
    for (const user of users) {
      rows.push({
        id: id++,
        user_id: user.id,
        type: item.type === 'activity' ? 'activity.published' : 'news.published',
        title: `${item.type === 'activity' ? 'نشاط مدرسي' : 'خبر مدرسي'}: ${item.title}`,
        body: item.excerpt,
        link: `/news/${item.id}`,
        read_at: user.id === 20 && item.id !== 3 ? iso(-1) : null, // الطالب قرأ خبرين وترك واحدا جديدا
        created_at: item.published_at,
      });
    }
  }

  return rows;
})();

export interface DemoActivityLog {
  id: number;
  user_id: number | null;
  user_name: string;
  user_role: string;
  module: string;
  action: string;
  description: string;
  changes: Record<string, unknown> | null;
  created_at: string;
}

export const activityLogs: DemoActivityLog[] = [
  { id: 1, user_id: 1, user_name: 'د. عبدالله الراجحي', user_role: 'principal', module: 'auth', action: 'login', description: 'سجّل مدير المدرسة «د. عبدالله الراجحي» الدخول إلى النظام', changes: null, created_at: iso(-1) },
  { id: 2, user_id: 2, user_name: 'أ. سعد المطيري', user_role: 'vice_principal', module: 'students', action: 'update', description: 'عدّل بيانات الطالب «فيصل العنزي»', changes: { الحالة: { before: 'pending', after: 'active' } }, created_at: iso(-2) },
  { id: 3, user_id: 3, user_name: 'أ. هند العتيبي', user_role: 'secretary', module: 'students', action: 'create', description: 'أضاف الطالب «يوسف الحربي» برقم S-02603', changes: null, created_at: iso(-3) },
  { id: 4, user_id: 4, user_name: 'أ. ماجد الشهري', user_role: 'teacher', module: 'grades', action: 'update', description: 'رصد درجات «أعمال فصلية» لعدد ٥ طلاب', changes: null, created_at: iso(-1) },
  { id: 5, user_id: 1, user_name: 'د. عبدالله الراجحي', user_role: 'principal', module: 'news', action: 'publish', description: 'نشر خبر مدرسي «جدول الاختبارات النهائية للفصل الأول»', changes: null, created_at: iso(0) },
  { id: 6, user_id: 1, user_name: 'د. عبدالله الراجحي', user_role: 'principal', module: 'permissions', action: 'permissions', description: 'عدّل صلاحيات نائب المدير «أ. سعد المطيري» على ٣ وحدات', changes: null, created_at: iso(-4) },
];

/** تُستخدم لتوليد معرّفات جديدة عند الإضافة أثناء الجلسة. */
export const nextIds = {
  user: 21,
  teacher: 5,
  student: 13,
  classroom: 6,
  scheduleSlot: 16,
  dailyLesson: 5,
  grade: grades.length + 1,
  followup: 3,
  studentNote: 5,
  news: 4,
  notification: notifications.length + 1,
  activityLog: 7,
  assignment: 13,
};

/** صلاحيات المستخدم — تُبنى من الافتراضي حسب الدور، وتُخزَّن قابلة للتعديل. */
export function buildInitialPermissions(): Record<number, Record<string, number>> {
  const table: Record<number, Record<string, number>> = {};

  for (const user of users) {
    const defaults = ROLE_DEFAULTS[user.role] ?? {};
    table[user.id] = {};

    for (const mod of Object.keys(defaults)) {
      table[user.id][mod] = defaults[mod];
    }
  }

  return table;
}

function iso(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString();
}

export { LEVEL };
