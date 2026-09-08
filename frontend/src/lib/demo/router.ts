import { LEVEL, MODULES, LEVEL_OPTIONS, ROLE_DEFAULTS, STAFF_ROLES } from './constants';
import { HttpError } from './error';
import {
  authProfile, canModule, classroomIdsForTeacher, currentUser, isUnrestricted, logActivity,
  paginate, permissionMatrix, roleLabel, studentRecord, subjectIdsForTeacher, teacherRecord,
  tokenFor, unreadCount, withLabels, broadcastNotification,
} from './helpers';
import { db, nextId } from './store';
import { DEMO_PASSWORD, type DemoUser } from './seed';

type Query = Record<string, string | number | boolean | undefined | null>;

function delay(ms = 220): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireUser(): DemoUser {
  const user = currentUser();
  if (!user) throw new HttpError('يجب تسجيل الدخول.', 401);
  return user;
}

function requirePermission(user: DemoUser, moduleKey: string, ability: string): void {
  if (!canModule(user, moduleKey, ability)) {
    throw new HttpError('غير مصرّح لك بهذا الإجراء.', 403, {});
  }
}

function notFound(): never {
  throw new HttpError('غير موجود.', 404);
}

function todayStr(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** يطابق مسارا يحوي معرّفات رقمية، مثل /students/12 -> ['students', ':id'] مع القيم. */
function segments(path: string): string[] {
  return path.replace(/^\/+|\/+$/g, '').split('/');
}

export async function mockRequest<T>(method: string, path: string, body: unknown, query: Query = {}): Promise<T> {
  await delay();

  const seg = segments(path);
  const q = query ?? {};

  // ── تسجيل الدخول ─────────────────────────────────────────────────────
  if (method === 'POST' && path === '/login') {
    const { username, password } = (body ?? {}) as { username?: string; password?: string };
    const user = db().users.find((u) => u.username === username);

    if (!user || password !== DEMO_PASSWORD) {
      throw new HttpError('اسم المستخدم أو كلمة المرور غير صحيحة.', 422, { username: ['اسم المستخدم أو كلمة المرور غير صحيحة.'] });
    }
    if (!user.is_active) {
      throw new HttpError('هذا الحساب موقوف. راجع إدارة المدرسة.', 422, { username: ['هذا الحساب موقوف. راجع إدارة المدرسة.'] });
    }

    user.last_login_at = new Date().toISOString();
    logActivity(user, 'auth', 'login', `سجّل ${roleLabel(user.role)} «${user.name}» الدخول إلى النظام`);

    return { token: tokenFor(user.id), user: authProfile(user) } as T;
  }

  if (method === 'GET' && path === '/me') {
    return { user: authProfile(requireUser()) } as T;
  }

  if (method === 'POST' && path === '/logout') {
    return { message: 'تم تسجيل الخروج' } as T;
  }

  const user = requireUser();

  // ── لوحة التحكم ──────────────────────────────────────────────────────
  if (method === 'GET' && path === '/dashboard') {
    return dashboard(user) as T;
  }

  // ── الطلاب ───────────────────────────────────────────────────────────
  if (path === '/students' && method === 'GET') { requirePermission(user, 'students', 'view'); return studentsIndex(user, q) as T; }
  if (path === '/students' && method === 'POST') { requirePermission(user, 'students', 'create'); return studentsStore(user, body) as T; }
  if (seg[0] === 'students' && seg.length === 2 && method === 'GET') { requirePermission(user, 'students', 'view'); return studentsShow(user, Number(seg[1])) as T; }
  if (seg[0] === 'students' && seg.length === 2 && method === 'PUT') { requirePermission(user, 'students', 'update'); return studentsUpdate(user, Number(seg[1]), body) as T; }
  if (seg[0] === 'students' && seg.length === 2 && method === 'DELETE') { requirePermission(user, 'students', 'delete'); return studentsDestroy(user, Number(seg[1])) as T; }

  // ── المعلمون ─────────────────────────────────────────────────────────
  if (path === '/teachers' && method === 'GET') { requirePermission(user, 'teachers', 'view'); return teachersIndex(q) as T; }
  if (path === '/teachers' && method === 'POST') { requirePermission(user, 'teachers', 'create'); return teachersStore(user, body) as T; }
  if (seg[0] === 'teachers' && seg.length === 2 && method === 'GET') { requirePermission(user, 'teachers', 'view'); return teachersShow(Number(seg[1])) as T; }
  if (seg[0] === 'teachers' && seg.length === 2 && method === 'PUT') { requirePermission(user, 'teachers', 'update'); return teachersUpdate(user, Number(seg[1]), body) as T; }
  if (seg[0] === 'teachers' && seg.length === 2 && method === 'DELETE') { requirePermission(user, 'teachers', 'delete'); return teachersDestroy(user, Number(seg[1])) as T; }

  // ── الصفوف ───────────────────────────────────────────────────────────
  if (path === '/classrooms' && method === 'GET') { requirePermission(user, 'classrooms', 'view'); return classroomsIndex(user) as T; }
  if (path === '/classrooms/options' && method === 'GET') { requirePermission(user, 'classrooms', 'view'); return classroomOptions() as T; }
  if (path === '/classrooms' && method === 'POST') { requirePermission(user, 'classrooms', 'create'); return classroomsStore(user, body) as T; }
  if (seg[0] === 'classrooms' && seg.length === 2 && method === 'GET') { requirePermission(user, 'classrooms', 'view'); return classroomsShow(Number(seg[1])) as T; }
  if (seg[0] === 'classrooms' && seg.length === 2 && method === 'PUT') { requirePermission(user, 'classrooms', 'update'); return classroomsUpdate(user, Number(seg[1]), body) as T; }
  if (seg[0] === 'classrooms' && seg[2] === 'assignments' && seg.length === 3 && method === 'POST') { requirePermission(user, 'classrooms', 'update'); return assignmentsStore(user, Number(seg[1]), body) as T; }
  if (seg[0] === 'classrooms' && seg[2] === 'assignments' && seg.length === 4 && method === 'DELETE') { requirePermission(user, 'classrooms', 'update'); return assignmentsDestroy(user, Number(seg[1]), Number(seg[3])) as T; }
  if (seg[0] === 'classrooms' && seg.length === 2 && method === 'DELETE') { requirePermission(user, 'classrooms', 'delete'); return classroomsDestroy(user, Number(seg[1])) as T; }

  // ── الجدول الأسبوعي ──────────────────────────────────────────────────
  if (path === '/schedule' && method === 'GET') { requirePermission(user, 'schedule', 'view'); return scheduleIndex(user, q) as T; }
  if (path === '/schedule' && method === 'POST') { requirePermission(user, 'schedule', 'create'); return scheduleStore(user, body) as T; }
  if (seg[0] === 'schedule' && seg.length === 2 && method === 'PUT') { requirePermission(user, 'schedule', 'update'); return scheduleUpdate(user, Number(seg[1]), body) as T; }
  if (seg[0] === 'schedule' && seg.length === 2 && method === 'DELETE') { requirePermission(user, 'schedule', 'delete'); return scheduleDestroy(user, Number(seg[1])) as T; }

  // ── الحصص اليومية ────────────────────────────────────────────────────
  if (path === '/daily-lessons' && method === 'GET') { requirePermission(user, 'daily_lessons', 'view'); return lessonsIndex(user, q) as T; }
  if (path === '/daily-lessons/today' && method === 'GET') { requirePermission(user, 'daily_lessons', 'view'); return lessonsToday(user, q) as T; }
  if (path === '/daily-lessons' && method === 'POST') { requirePermission(user, 'daily_lessons', 'create'); return lessonsStore(user, body) as T; }
  if (seg[0] === 'daily-lessons' && seg.length === 2 && method === 'PUT') { requirePermission(user, 'daily_lessons', 'update'); return lessonsUpdate(user, Number(seg[1]), body) as T; }
  if (seg[0] === 'daily-lessons' && seg.length === 2 && method === 'DELETE') { requirePermission(user, 'daily_lessons', 'delete'); return lessonsDestroy(user, Number(seg[1])) as T; }

  // ── الدرجات ──────────────────────────────────────────────────────────
  if (path === '/grades' && method === 'GET') { requirePermission(user, 'grades', 'view'); return gradesIndex(user, q) as T; }
  if (path === '/grades/sheet' && method === 'GET') { requirePermission(user, 'grades', 'view'); return gradesSheet(user, q) as T; }
  if (path === '/grades/sheet' && method === 'POST') { requirePermission(user, 'grades', 'update'); return gradesSaveSheet(user, body) as T; }
  if (seg[0] === 'grades' && seg.length === 2 && method === 'DELETE') { requirePermission(user, 'grades', 'delete'); return gradesDestroy(user, Number(seg[1])) as T; }

  // ── دفتر المتابعة ────────────────────────────────────────────────────
  if (path === '/followup' && method === 'GET') { requirePermission(user, 'followup', 'view'); return followupIndex(user, q) as T; }
  if (path === '/followup' && method === 'POST') { requirePermission(user, 'followup', 'create'); return followupStore(user, body) as T; }
  if (seg[0] === 'followup' && seg.length === 2 && method === 'PUT') { requirePermission(user, 'followup', 'update'); return followupUpdate(user, Number(seg[1]), body) as T; }
  if (seg[0] === 'followup' && seg.length === 2 && method === 'DELETE') { requirePermission(user, 'followup', 'delete'); return followupDestroy(user, Number(seg[1])) as T; }

  // ── ملاحظات الطلاب ───────────────────────────────────────────────────
  if (path === '/student-notes' && method === 'GET') { requirePermission(user, 'student_notes', 'view'); return notesIndex(user, q) as T; }
  if (path === '/student-notes' && method === 'POST') { requirePermission(user, 'student_notes', 'create'); return notesStore(user, body) as T; }
  if (seg[0] === 'student-notes' && seg.length === 2 && method === 'PUT') { requirePermission(user, 'student_notes', 'update'); return notesUpdate(user, Number(seg[1]), body) as T; }
  if (seg[0] === 'student-notes' && seg.length === 2 && method === 'DELETE') { requirePermission(user, 'student_notes', 'delete'); return notesDestroy(user, Number(seg[1])) as T; }

  // ── الأخبار والأنشطة ─────────────────────────────────────────────────
  if (path === '/news' && method === 'GET') { requirePermission(user, 'news', 'view'); return newsIndex(user, q) as T; }
  if (path === '/news' && method === 'POST') { requirePermission(user, 'news', 'create'); return newsStore(user, body) as T; }
  if (seg[0] === 'news' && seg.length === 2 && method === 'GET') { requirePermission(user, 'news', 'view'); return newsShow(user, Number(seg[1])) as T; }
  if (seg[0] === 'news' && seg.length === 2 && method === 'PUT') { requirePermission(user, 'news', 'update'); return newsUpdate(Number(seg[1]), body) as T; }
  if (seg[0] === 'news' && seg[2] === 'publish' && method === 'POST') { requirePermission(user, 'news', 'create'); return newsPublish(Number(seg[1])) as T; }
  if (seg[0] === 'news' && seg.length === 2 && method === 'DELETE') { requirePermission(user, 'news', 'delete'); return newsDestroy(Number(seg[1])) as T; }

  // ── الإشعارات ────────────────────────────────────────────────────────
  if (path === '/notifications' && method === 'GET') { return notificationsIndex(user, q) as T; }
  if (seg[0] === 'notifications' && seg[2] === 'read' && method === 'POST') { return notificationsMarkRead(user, Number(seg[1])) as T; }
  if (path === '/notifications/read-all' && method === 'POST') { return notificationsMarkAllRead(user) as T; }
  if (path === '/notifications/broadcast' && method === 'POST') { requirePermission(user, 'notifications', 'create'); return notificationsBroadcast(user, body) as T; }

  // ── سجل العمليات ─────────────────────────────────────────────────────
  if (path === '/activity-logs' && method === 'GET') { requirePermission(user, 'activity_log', 'view'); return activityIndex(q) as T; }
  if (path === '/activity-logs/filters' && method === 'GET') { requirePermission(user, 'activity_log', 'view'); return activityFilters() as T; }

  // ── إدارة الصلاحيات ──────────────────────────────────────────────────
  if (path === '/permissions' && method === 'GET') { requirePermission(user, 'permissions', 'view'); return permissionsIndex() as T; }
  if (path === '/permissions/staff' && method === 'POST') { requirePermission(user, 'permissions', 'create'); return permissionsStoreStaff(user, body) as T; }
  if (seg[0] === 'permissions' && seg.length === 2 && method === 'GET') { requirePermission(user, 'permissions', 'view'); return permissionsShow(Number(seg[1])) as T; }
  if (seg[0] === 'permissions' && seg.length === 2 && method === 'PUT') { requirePermission(user, 'permissions', 'update'); return permissionsUpdate(user, Number(seg[1]), body) as T; }
  if (seg[0] === 'permissions' && seg[2] === 'toggle-active' && method === 'POST') { requirePermission(user, 'permissions', 'update'); return permissionsToggleActive(user, Number(seg[1])) as T; }

  // ── لوحة الطالب ──────────────────────────────────────────────────────
  if (path === '/me/dashboard' && method === 'GET') return studentDashboard(user) as T;
  if (path === '/me/grades' && method === 'GET') return studentGrades(user) as T;
  if (path === '/me/schedule' && method === 'GET') return studentSchedule(user) as T;
  if (path === '/me/lessons' && method === 'GET') return studentLessons(user, q) as T;
  if (path === '/me/notes' && method === 'GET') return studentNotesPortal(user) as T;

  notFound();
}

// ─────────────────────────── لوحة التحكم ───────────────────────────────

function dashboard(user: DemoUser) {
  const teacher = teacherRecord(user);

  const stats = teacher ? teacherStats(teacher.id) : staffStats(user);
  const latestNews = [...db().news]
    .filter((n) => n.is_published)
    .sort((a, b) => (b.published_at! > a.published_at! ? 1 : -1))
    .slice(0, 4)
    .map((n) => ({ id: n.id, type: n.type, title: n.title, excerpt: n.excerpt, published_at: n.published_at }));

  const recentActivity = canModule(user, 'activity_log', 'view')
    ? db().activityLogs.slice(0, 8).map((l) => ({ id: l.id, user_name: l.user_name, user_role: l.user_role, description: l.description, created_at: l.created_at }))
    : [];

  return {
    greeting: `مرحبا بعودتك، ${user.name}`,
    role_label: roleLabel(user.role),
    stats,
    latest_news: latestNews,
    recent_activity: recentActivity,
  };
}

function staffStats(user: DemoUser) {
  const cards: { key: string; label: string; value: number; hint: string | null }[] = [];
  const store = db();

  if (canModule(user, 'students')) {
    cards.push({ key: 'students', label: 'إجمالي الطلاب', value: store.students.filter((s) => s.status === 'active').length, hint: `${store.students.filter((s) => s.status === 'pending').length} قيد المراجعة` });
  }
  if (canModule(user, 'teachers')) {
    cards.push({ key: 'teachers', label: 'المعلمون', value: store.teachers.length, hint: null });
  }
  if (canModule(user, 'classrooms')) {
    cards.push({ key: 'classrooms', label: 'الفصول النشطة', value: store.classrooms.length, hint: null });
  }
  if (canModule(user, 'news')) {
    const month = new Date().getMonth();
    cards.push({ key: 'news', label: 'الأخبار هذا الشهر', value: store.news.filter((n) => n.is_published && new Date(n.published_at!).getMonth() === month).length, hint: null });
  }

  return cards;
}

function teacherStats(teacherId: number) {
  const store = db();
  const classroomIds = classroomIdsForTeacher(teacherId);
  const today = todayStr();
  const dow = new Date().getDay();

  return [
    { key: 'my_students', label: 'طلابي', value: store.students.filter((s) => classroomIds.includes(s.classroom_id) && s.status === 'active').length, hint: `${classroomIds.length} فصلا` },
    { key: 'today_periods', label: 'حصص اليوم', value: store.scheduleSlots.filter((s) => s.teacher_id === teacherId && s.day_of_week === dow).length, hint: null },
    { key: 'recorded_today', label: 'الحصص المسجّلة اليوم', value: store.dailyLessons.filter((l) => l.teacher_id === teacherId && l.lesson_date === today).length, hint: null },
    { key: 'subjects', label: 'موادّي', value: subjectIdsForTeacher(teacherId).length, hint: null },
  ];
}

// ─────────────────────────── الطلاب ────────────────────────────────────

function withClassroom<T extends { classroom_id: number | null }>(row: T) {
  const classroom = db().classrooms.find((c) => c.id === row.classroom_id) ?? null;
  return { ...row, classroom: classroom ? { id: classroom.id, name: classroom.name } : null };
}

function studentsIndex(user: DemoUser, q: Query) {
  let rows = db().students.map(withClassroom);

  const teacher = teacherRecord(user);
  if (teacher) {
    const ids = classroomIdsForTeacher(teacher.id);
    rows = rows.filter((s) => s.classroom_id !== null && ids.includes(s.classroom_id));
  }

  if (q.q) {
    const term = String(q.q).toLowerCase();
    rows = rows.filter((s) => s.full_name.toLowerCase().includes(term) || s.student_no.toLowerCase().includes(term) || (s.guardian_name ?? '').toLowerCase().includes(term));
  }
  if (q.classroom_id) rows = rows.filter((s) => s.classroom_id === Number(q.classroom_id));
  if (q.status) rows = rows.filter((s) => s.status === q.status);

  rows = [...rows].sort((a, b) => b.id - a.id);

  return paginate(rows, Number(q.page ?? 1), Number(q.per_page ?? 15));
}

function studentsShow(user: DemoUser, id: number) {
  const student = db().students.find((s) => s.id === id);
  if (!student) notFound();

  const teacher = teacherRecord(user);
  if (teacher && (student.classroom_id === null || !classroomIdsForTeacher(teacher.id).includes(student.classroom_id))) {
    throw new HttpError('هذا الطالب خارج نطاق فصولك.', 403);
  }

  const classroom = db().classrooms.find((c) => c.id === student.classroom_id) ?? null;
  const grades = db().grades.filter((g) => g.student_id === id).map((g) => ({ ...g, subject: subjectMini(g.subject_id) }));
  const notes = db().studentNotes.filter((n) => n.student_id === id).map((n) => ({ ...n, author: userMini(n.author_id) }));

  return { student: { ...student, classroom: classroom ? { id: classroom.id, name: classroom.name } : null, grades, notes } };
}

function studentsStore(user: DemoUser, body: any) {
  const store = db();

  if (!body?.full_name || !body?.student_no) {
    throw new HttpError('البيانات المدخلة غير صحيحة.', 422, {
      ...(body?.full_name ? {} : { full_name: ['اسم الطالب مطلوب.'] }),
      ...(body?.student_no ? {} : { student_no: ['رقم الطالب مطلوب.'] }),
    });
  }
  if (store.students.some((s) => s.student_no === body.student_no)) {
    throw new HttpError('رقم الطالب مستخدم من قبل.', 422, { student_no: ['رقم الطالب مستخدم من قبل.'] });
  }

  const id = nextId('student');
  const userId = nextId('user');
  store.users.push({ id: userId, name: body.full_name, username: body.student_no, email: null, phone: null, role: 'student', is_active: true, last_login_at: null });
  store.permissions[userId] = { ...ROLE_DEFAULTS.student };

  const student = {
    id, user_id: userId, classroom_id: body.classroom_id ?? null, student_no: body.student_no, full_name: body.full_name,
    national_id: body.national_id ?? null, birth_date: body.birth_date ?? null, guardian_name: body.guardian_name ?? null,
    guardian_phone: body.guardian_phone ?? null, status: body.status ?? 'active', enrolled_on: body.enrolled_on ?? null, address: body.address ?? null,
  };
  store.students.push(student);

  logActivity(user, 'students', 'create', `أضاف الطالب «${student.full_name}» برقم ${student.student_no}`);

  return { student: withClassroom(student), message: 'تم حفظ بيانات الطالب بنجاح' };
}

function studentsUpdate(user: DemoUser, id: number, body: any) {
  const store = db();
  const student = store.students.find((s) => s.id === id);
  if (!student) notFound();

  Object.assign(student, {
    student_no: body.student_no ?? student.student_no, full_name: body.full_name ?? student.full_name,
    classroom_id: body.classroom_id ?? null, national_id: body.national_id ?? null, birth_date: body.birth_date ?? null,
    guardian_name: body.guardian_name ?? null, guardian_phone: body.guardian_phone ?? null, status: body.status ?? student.status,
    enrolled_on: body.enrolled_on ?? null, address: body.address ?? null,
  });

  logActivity(user, 'students', 'update', `عدّل بيانات الطالب «${student.full_name}»`);

  return { student: withClassroom(student), message: 'تم حفظ التعديلات' };
}

function studentsDestroy(user: DemoUser, id: number) {
  const store = db();
  const student = store.students.find((s) => s.id === id);
  if (!student) notFound();

  store.students = store.students.filter((s) => s.id !== id);
  logActivity(user, 'students', 'delete', `حذف سجل الطالب «${student.full_name}»`);

  return { message: 'تم حذف سجل الطالب' };
}

// ─────────────────────────── المعلمون ──────────────────────────────────

function userMini(id: number | null) {
  if (id === null) return undefined;
  const u = db().users.find((x) => x.id === id);
  return u ? { id: u.id, name: u.name } : undefined;
}

function subjectMini(id: number) {
  const s = db().subjects.find((x) => x.id === id);
  return s ? { id: s.id, name: s.name } : undefined;
}

function classroomMini(id: number) {
  const c = db().classrooms.find((x) => x.id === id);
  return c ? { id: c.id, name: c.name } : undefined;
}

function teacherWithUser(t: ReturnType<typeof db>['teachers'][number]) {
  const u = db().users.find((x) => x.id === t.user_id)!;
  const assignmentsCount = db().assignments.filter((a) => a.teacher_id === t.id).length;
  return { ...t, assignments_count: assignmentsCount, user: { id: u.id, name: u.name, username: u.username, email: u.email, phone: u.phone, is_active: u.is_active } };
}

function teachersIndex(q: Query) {
  let rows = db().teachers.map(teacherWithUser);

  if (q.q) {
    const term = String(q.q).toLowerCase();
    rows = rows.filter((t) => t.employee_no.toLowerCase().includes(term) || t.user.name.toLowerCase().includes(term));
  }

  rows = [...rows].sort((a, b) => b.id - a.id);
  return paginate(rows, Number(q.page ?? 1), Number(q.per_page ?? 15));
}

function teachersShow(id: number) {
  const teacher = db().teachers.find((t) => t.id === id);
  if (!teacher) notFound();

  const assignments = db().assignments.filter((a) => a.teacher_id === id).map((a) => ({ ...a, subject: subjectMini(a.subject_id), classroom: classroomMini(a.classroom_id) }));

  return { teacher: { ...teacherWithUser(teacher), assignments } };
}

function teachersStore(user: DemoUser, body: any) {
  const store = db();

  if (!body?.name || !body?.username || !body?.employee_no || !body?.password) {
    throw new HttpError('البيانات المدخلة غير صحيحة.', 422, {});
  }
  if (store.users.some((u) => u.username === body.username)) {
    throw new HttpError('اسم المستخدم مستخدم من قبل.', 422, { username: ['اسم المستخدم مستخدم من قبل.'] });
  }
  if (store.teachers.some((t) => t.employee_no === body.employee_no)) {
    throw new HttpError('الرقم الوظيفي مستخدم من قبل.', 422, { employee_no: ['الرقم الوظيفي مستخدم من قبل.'] });
  }

  const userId = nextId('user');
  store.users.push({ id: userId, name: body.name, username: body.username, email: body.email ?? null, phone: body.phone ?? null, role: 'teacher', is_active: true, last_login_at: null });
  store.permissions[userId] = { ...ROLE_DEFAULTS.teacher };

  const teacher = { id: nextId('teacher'), user_id: userId, employee_no: body.employee_no, specialization: body.specialization ?? null, qualification: body.qualification ?? null, hired_on: body.hired_on ?? null };
  store.teachers.push(teacher);

  logActivity(user, 'teachers', 'create', `أضاف المعلم «${body.name}»`);

  return { teacher: teacherWithUser(teacher), message: 'تم حفظ بيانات المعلم بنجاح' };
}

function teachersUpdate(user: DemoUser, id: number, body: any) {
  const store = db();
  const teacher = store.teachers.find((t) => t.id === id);
  if (!teacher) notFound();

  const account = store.users.find((u) => u.id === teacher.user_id)!;
  Object.assign(account, { name: body.name ?? account.name, email: body.email ?? null, phone: body.phone ?? null, is_active: body.is_active ?? true });
  Object.assign(teacher, { employee_no: body.employee_no ?? teacher.employee_no, specialization: body.specialization ?? null, qualification: body.qualification ?? null, hired_on: body.hired_on ?? null });

  logActivity(user, 'teachers', 'update', `عدّل بيانات المعلم «${account.name}»`);

  return { teacher: teacherWithUser(teacher), message: 'تم حفظ التعديلات' };
}

function teachersDestroy(user: DemoUser, id: number) {
  const store = db();
  const teacher = store.teachers.find((t) => t.id === id);
  if (!teacher) notFound();

  const account = store.users.find((u) => u.id === teacher.user_id);
  store.teachers = store.teachers.filter((t) => t.id !== id);
  store.users = store.users.filter((u) => u.id !== teacher.user_id);

  logActivity(user, 'teachers', 'delete', `حذف حساب المعلم «${account?.name}»`);

  return { message: 'تم حذف سجل المعلم' };
}

// ─────────────────────────── الصفوف ────────────────────────────────────

function classroomWithExtras(c: ReturnType<typeof db>['classrooms'][number]) {
  const homeroom = c.homeroom_teacher_id ? db().teachers.find((t) => t.id === c.homeroom_teacher_id) : null;
  const homeroomUser = homeroom ? db().users.find((u) => u.id === homeroom.user_id) : null;
  const studentsCount = db().students.filter((s) => s.classroom_id === c.id).length;

  return {
    ...c,
    students_count: studentsCount,
    homeroom_teacher: homeroom ? { user: homeroomUser ? { id: homeroomUser.id, name: homeroomUser.name } : null } : null,
  };
}

function classroomsIndex(user: DemoUser) {
  let rows = db().classrooms;
  const teacher = teacherRecord(user);
  if (teacher) {
    const ids = classroomIdsForTeacher(teacher.id);
    rows = rows.filter((c) => ids.includes(c.id));
  }

  return [...rows].sort((a, b) => a.grade_level.localeCompare(b.grade_level, 'ar') || a.section.localeCompare(b.section, 'ar')).map(classroomWithExtras);
}

function classroomOptions() {
  return {
    academic_years: [{ id: 1, name: '١٤٤٧ هـ / ٢٠٢٦ م', is_current: true }],
    subjects: db().subjects,
  };
}

function classroomsShow(id: number) {
  const classroom = db().classrooms.find((c) => c.id === id);
  if (!classroom) notFound();

  const students = db().students.filter((s) => s.classroom_id === id).map((s) => ({ id: s.id, classroom_id: s.classroom_id, student_no: s.student_no, full_name: s.full_name, status: s.status }));
  const assignments = db().assignments.filter((a) => a.classroom_id === id).map((a) => ({ ...a, subject: subjectMini(a.subject_id), teacher: teacherWithUserMini(a.teacher_id) }));

  return { classroom: { ...classroom, students, assignments } };
}

function teacherWithUserMini(teacherId: number) {
  const t = db().teachers.find((x) => x.id === teacherId);
  if (!t) return undefined;
  const u = db().users.find((x) => x.id === t.user_id);
  return { id: t.id, user: u ? { id: u.id, name: u.name } : null };
}

function classroomsStore(user: DemoUser, body: any) {
  const store = db();
  if (!body?.grade_level || !body?.section) throw new HttpError('البيانات المدخلة غير صحيحة.', 422, {});

  if (store.classrooms.some((c) => c.grade_level === body.grade_level && c.section === body.section)) {
    throw new HttpError('هذه الشعبة موجودة مسبقا في المرحلة نفسها.', 422, { section: ['هذه الشعبة موجودة مسبقا في المرحلة نفسها.'] });
  }

  const classroom = {
    id: nextId('classroom'), academic_year_id: 1, grade_level: body.grade_level, section: body.section,
    name: `${body.grade_level} — ${body.section}`, capacity: body.capacity ?? 30, homeroom_teacher_id: body.homeroom_teacher_id ?? null,
  };
  store.classrooms.push(classroom);

  logActivity(user, 'classrooms', 'create', `أنشأ الفصل «${classroom.name}»`);

  return { classroom: classroomWithExtras(classroom), message: 'تم إنشاء الفصل بنجاح' };
}

function classroomsUpdate(user: DemoUser, id: number, body: any) {
  const classroom = db().classrooms.find((c) => c.id === id);
  if (!classroom) notFound();

  Object.assign(classroom, {
    grade_level: body.grade_level ?? classroom.grade_level, section: body.section ?? classroom.section,
    name: `${body.grade_level ?? classroom.grade_level} — ${body.section ?? classroom.section}`,
    capacity: body.capacity ?? classroom.capacity, homeroom_teacher_id: body.homeroom_teacher_id ?? null,
  });

  logActivity(user, 'classrooms', 'update', `عدّل بيانات الفصل «${classroom.name}»`);

  return { classroom: classroomWithExtras(classroom), message: 'تم حفظ التعديلات' };
}

function classroomsDestroy(user: DemoUser, id: number) {
  const store = db();
  const classroom = store.classrooms.find((c) => c.id === id);
  if (!classroom) notFound();

  if (store.students.some((s) => s.classroom_id === id)) {
    throw new HttpError('لا يمكن حذف فصل يضم طلابا. انقل الطلاب أولا.', 422);
  }

  store.classrooms = store.classrooms.filter((c) => c.id !== id);
  logActivity(user, 'classrooms', 'delete', `حذف الفصل «${classroom.name}»`);

  return { message: 'تم حذف الفصل' };
}

function assignmentsStore(user: DemoUser, classroomId: number, body: any) {
  const store = db();
  const classroom = store.classrooms.find((c) => c.id === classroomId);
  if (!classroom) notFound();

  let assignment = store.assignments.find((a) => a.classroom_id === classroomId && a.teacher_id === body.teacher_id && a.subject_id === body.subject_id);
  if (!assignment) {
    assignment = { id: nextId('assignment'), classroom_id: classroomId, teacher_id: body.teacher_id, subject_id: body.subject_id };
    store.assignments.push(assignment);
  }

  const subject = subjectMini(assignment.subject_id);
  const teacher = teacherWithUserMini(assignment.teacher_id);
  logActivity(user, 'classrooms', 'update', `أسند مادة «${subject?.name}» للمعلم «${teacher?.user?.name}» في «${classroom.name}»`);

  return { assignment: { ...assignment, subject, teacher }, message: 'تم الإسناد بنجاح' };
}

function assignmentsDestroy(user: DemoUser, classroomId: number, assignmentId: number) {
  const store = db();
  const classroom = store.classrooms.find((c) => c.id === classroomId);
  if (!classroom) notFound();

  store.assignments = store.assignments.filter((a) => a.id !== assignmentId);
  logActivity(user, 'classrooms', 'delete', `ألغى إسنادا في الفصل «${classroom.name}»`);

  return { message: 'تم إلغاء الإسناد' };
}

// ─────────────────────────── الجدول الأسبوعي ───────────────────────────

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

function slotWithExtras(s: ReturnType<typeof db>['scheduleSlots'][number]) {
  return { ...s, classroom: classroomMini(s.classroom_id), subject: subjectMini(s.subject_id), teacher: teacherWithUserMini(s.teacher_id), day_name: DAY_NAMES[s.day_of_week] };
}

function scheduleIndex(user: DemoUser, q: Query) {
  let rows = db().scheduleSlots;
  const teacher = teacherRecord(user);

  if (teacher) rows = rows.filter((s) => s.teacher_id === teacher.id);
  else if (q.classroom_id) rows = rows.filter((s) => s.classroom_id === Number(q.classroom_id));

  rows = [...rows].sort((a, b) => a.day_of_week - b.day_of_week || a.period - b.period);

  return { days: DAY_NAMES, periods: [1, 2, 3, 4, 5, 6, 7, 8], slots: rows.map(slotWithExtras) };
}

function scheduleStore(user: DemoUser, body: any) {
  const store = db();

  if (store.scheduleSlots.some((s) => s.classroom_id === body.classroom_id && s.day_of_week === body.day_of_week && s.period === body.period)) {
    throw new HttpError('هذه الخانة محجوزة مسبقا في جدول الفصل.', 422, { period: ['هذه الخانة محجوزة مسبقا في جدول الفصل.'] });
  }
  if (store.scheduleSlots.some((s) => s.teacher_id === body.teacher_id && s.day_of_week === body.day_of_week && s.period === body.period)) {
    throw new HttpError('المعلم مرتبط بحصة أخرى في اليوم والوقت نفسه.', 422);
  }

  const TIMES: Record<number, [string, string]> = { 1: ['07:00', '07:45'], 2: ['07:50', '08:35'], 3: ['08:40', '09:25'], 4: ['09:45', '10:30'], 5: ['10:35', '11:20'], 6: ['11:25', '12:10'], 7: ['12:30', '13:15'], 8: ['13:20', '14:05'] };
  const slot = { id: nextId('scheduleSlot'), classroom_id: body.classroom_id, subject_id: body.subject_id, teacher_id: body.teacher_id, day_of_week: body.day_of_week, period: body.period, starts_at: TIMES[body.period]?.[0] ?? null, ends_at: TIMES[body.period]?.[1] ?? null };
  store.scheduleSlots.push(slot);

  const c = classroomMini(slot.classroom_id);
  const s = subjectMini(slot.subject_id);
  logActivity(user, 'schedule', 'create', `أضاف حصة «${s?.name}» يوم ${DAY_NAMES[slot.day_of_week]} للفصل «${c?.name}»`);

  return { slot: slotWithExtras(slot), message: 'تمت إضافة الحصة للجدول' };
}

function scheduleUpdate(user: DemoUser, id: number, body: any) {
  const slot = db().scheduleSlots.find((s) => s.id === id);
  if (!slot) notFound();

  Object.assign(slot, { classroom_id: body.classroom_id ?? slot.classroom_id, subject_id: body.subject_id ?? slot.subject_id, teacher_id: body.teacher_id ?? slot.teacher_id, day_of_week: body.day_of_week ?? slot.day_of_week, period: body.period ?? slot.period });

  logActivity(user, 'schedule', 'update', 'عدّل حصة في الجدول الأسبوعي');

  return { slot: slotWithExtras(slot), message: 'تم حفظ التعديلات' };
}

function scheduleDestroy(user: DemoUser, id: number) {
  const store = db();
  store.scheduleSlots = store.scheduleSlots.filter((s) => s.id !== id);
  logActivity(user, 'schedule', 'delete', 'حذف حصة من الجدول الأسبوعي');
  return { message: 'تم حذف الحصة من الجدول' };
}

// ─────────────────────────── الحصص اليومية ─────────────────────────────

function lessonWithExtras(l: ReturnType<typeof db>['dailyLessons'][number]) {
  return { ...l, classroom: classroomMini(l.classroom_id), subject: subjectMini(l.subject_id), teacher: teacherWithUserMini(l.teacher_id) };
}

function lessonsIndex(user: DemoUser, q: Query) {
  let rows = db().dailyLessons;
  const teacher = teacherRecord(user);

  if (teacher) rows = rows.filter((l) => l.teacher_id === teacher.id);
  if (q.date) rows = rows.filter((l) => l.lesson_date === q.date);
  if (q.classroom_id) rows = rows.filter((l) => l.classroom_id === Number(q.classroom_id));

  rows = [...rows].sort((a, b) => (a.lesson_date < b.lesson_date ? 1 : -1) || a.period - b.period);
  return paginate(rows.map(lessonWithExtras), Number(q.page ?? 1), Number(q.per_page ?? 20));
}

function lessonsToday(user: DemoUser, q: Query) {
  const teacher = teacherRecord(user);
  if (!teacher) throw new HttpError('هذه الشاشة مخصّصة للمعلمين.', 403);

  const date = (q.date as string) ?? todayStr();
  const dow = new Date(date).getDay();

  const slots = db().scheduleSlots.filter((s) => s.teacher_id === teacher.id && s.day_of_week === dow).sort((a, b) => a.period - b.period);
  const recorded = db().dailyLessons.filter((l) => l.teacher_id === teacher.id && l.lesson_date === date);

  return {
    date,
    day_name: DAY_NAMES[dow] ?? 'عطلة',
    slots: slots.map((slot) => ({ slot: slotWithExtras(slot), lesson: recorded.find((l) => l.schedule_slot_id === slot.id) ? lessonWithExtras(recorded.find((l) => l.schedule_slot_id === slot.id)!) : null })),
  };
}

function guardTeacherAssignment(user: DemoUser, classroomId: number, subjectId: number) {
  const teacher = teacherRecord(user);
  if (!teacher) return;

  const assigned = db().assignments.some((a) => a.teacher_id === teacher.id && a.classroom_id === classroomId && a.subject_id === subjectId);
  if (!assigned) throw new HttpError('هذه المادة أو الفصل خارج نطاق إسنادك.', 403);
}

function lessonsStore(user: DemoUser, body: any) {
  guardTeacherAssignment(user, body.classroom_id, body.subject_id);

  const teacher = teacherRecord(user);
  const lesson = {
    id: nextId('dailyLesson'), schedule_slot_id: body.schedule_slot_id ?? null, classroom_id: body.classroom_id, subject_id: body.subject_id,
    teacher_id: teacher?.id ?? body.teacher_id, lesson_date: body.lesson_date, period: body.period, title: body.title, content: body.content, homework: body.homework ?? null,
  };
  db().dailyLessons.push(lesson);

  logActivity(user, 'daily_lessons', 'create', `سجّل حصة «${subjectMini(lesson.subject_id)?.name}» بتاريخ ${lesson.lesson_date}`);

  return { lesson: lessonWithExtras(lesson), message: 'تم تسجيل الحصة بنجاح' };
}

function lessonsUpdate(user: DemoUser, id: number, body: any) {
  const lesson = db().dailyLessons.find((l) => l.id === id);
  if (!lesson) notFound();

  guardTeacherAssignment(user, body.classroom_id ?? lesson.classroom_id, body.subject_id ?? lesson.subject_id);
  Object.assign(lesson, { title: body.title ?? lesson.title, content: body.content ?? lesson.content, homework: body.homework ?? null, lesson_date: body.lesson_date ?? lesson.lesson_date, period: body.period ?? lesson.period });

  logActivity(user, 'daily_lessons', 'update', `عدّل سجل حصة بتاريخ ${lesson.lesson_date}`);

  return { lesson: lessonWithExtras(lesson), message: 'تم حفظ التعديلات' };
}

function lessonsDestroy(user: DemoUser, id: number) {
  db().dailyLessons = db().dailyLessons.filter((l) => l.id !== id);
  logActivity(user, 'daily_lessons', 'delete', 'حذف سجل حصة يومية');
  return { message: 'تم حذف سجل الحصة' };
}

// ─────────────────────────── الدرجات ───────────────────────────────────

function gradeWithExtras(g: ReturnType<typeof db>['grades'][number]) {
  const student = db().students.find((s) => s.id === g.student_id);
  return { ...g, student: student ? { id: student.id, full_name: student.full_name, student_no: student.student_no } : undefined, subject: subjectMini(g.subject_id), classroom: classroomMini(g.classroom_id) };
}

function gradesIndex(user: DemoUser, q: Query) {
  let rows = db().grades;
  const teacher = teacherRecord(user);

  if (teacher) rows = rows.filter((g) => g.teacher_id === teacher.id);
  if (q.classroom_id) rows = rows.filter((g) => g.classroom_id === Number(q.classroom_id));
  if (q.subject_id) rows = rows.filter((g) => g.subject_id === Number(q.subject_id));
  if (q.term) rows = rows.filter((g) => g.term === q.term);

  rows = [...rows].sort((a, b) => b.id - a.id);
  return paginate(rows.map(gradeWithExtras), Number(q.page ?? 1), Number(q.per_page ?? 25));
}

function gradesSheet(user: DemoUser, q: Query) {
  guardTeacherAssignment(user, Number(q.classroom_id), Number(q.subject_id));

  const students = db().students.filter((s) => s.classroom_id === Number(q.classroom_id) && s.status === 'active').sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
  const existing = db().grades.filter((g) => g.classroom_id === Number(q.classroom_id) && g.subject_id === Number(q.subject_id) && g.term === q.term && g.assessment_type === q.assessment_type);

  return {
    rows: students.map((s) => ({ student: { id: s.id, student_no: s.student_no, full_name: s.full_name }, grade: existing.find((g) => g.student_id === s.id) ?? null })),
  };
}

function gradesSaveSheet(user: DemoUser, body: any) {
  guardTeacherAssignment(user, body.classroom_id, body.subject_id);

  const store = db();
  const teacher = teacherRecord(user);
  let saved = 0;

  for (const row of body.scores ?? []) {
    if (row.score > body.max_score) throw new HttpError('الدرجة أكبر من الدرجة العظمى.', 422);

    const existing = store.grades.find((g) => g.student_id === row.student_id && g.subject_id === body.subject_id && g.classroom_id === body.classroom_id && g.term === body.term && g.assessment_type === body.assessment_type);

    if (existing) {
      Object.assign(existing, { score: row.score, max_score: body.max_score, remark: row.remark ?? null, teacher_id: teacher?.id ?? existing.teacher_id });
    } else {
      store.grades.push({ id: nextId('grade'), student_id: row.student_id, subject_id: body.subject_id, classroom_id: body.classroom_id, teacher_id: teacher?.id ?? body.teacher_id, term: body.term, assessment_type: body.assessment_type, score: row.score, max_score: body.max_score, remark: row.remark ?? null });
    }
    saved++;
  }

  logActivity(user, 'grades', 'update', `رصد درجات «${body.assessment_type}» لعدد ${saved} طالبا`);

  return { message: `تم حفظ درجات ${saved} طالبا بنجاح` };
}

function gradesDestroy(user: DemoUser, id: number) {
  db().grades = db().grades.filter((g) => g.id !== id);
  logActivity(user, 'grades', 'delete', 'حذف سجل درجة');
  return { message: 'تم حذف الدرجة' };
}

// ─────────────────────────── دفتر المتابعة ─────────────────────────────

function followupWithExtras(f: ReturnType<typeof db>['followupEntries'][number]) {
  return { ...f, subject: subjectMini(f.subject_id), classroom: classroomMini(f.classroom_id), teacher: teacherWithUserMini(f.teacher_id) };
}

function followupIndex(user: DemoUser, q: Query) {
  let rows = db().followupEntries;
  const teacher = teacherRecord(user);

  if (teacher) rows = rows.filter((f) => f.teacher_id === teacher.id);
  if (q.classroom_id) rows = rows.filter((f) => f.classroom_id === Number(q.classroom_id));
  if (q.month) rows = rows.filter((f) => f.month === Number(q.month));

  rows = [...rows].sort((a, b) => b.month - a.month);
  return paginate(rows.map(followupWithExtras), Number(q.page ?? 1), Number(q.per_page ?? 20));
}

function followupStore(user: DemoUser, body: any) {
  const teacher = teacherRecord(user);
  const entry = { id: nextId('followup'), teacher_id: teacher?.id ?? body.teacher_id, subject_id: body.subject_id, classroom_id: body.classroom_id, term: body.term, month: body.month, objectives: body.objectives, planned_lessons: body.planned_lessons, achievements: body.achievements ?? null };
  db().followupEntries.push(entry);

  logActivity(user, 'followup', 'create', `أضاف خطة دفتر متابعة لمادة «${subjectMini(entry.subject_id)?.name}»`);

  return { entry: followupWithExtras(entry), message: 'تم حفظ خطة المتابعة' };
}

function followupUpdate(user: DemoUser, id: number, body: any) {
  const entry = db().followupEntries.find((f) => f.id === id);
  if (!entry) notFound();

  Object.assign(entry, { objectives: body.objectives ?? entry.objectives, planned_lessons: body.planned_lessons ?? entry.planned_lessons, achievements: body.achievements ?? null, term: body.term ?? entry.term, month: body.month ?? entry.month });

  logActivity(user, 'followup', 'update', 'عدّل خطة في دفتر المتابعة');

  return { entry: followupWithExtras(entry), message: 'تم حفظ التعديلات' };
}

function followupDestroy(user: DemoUser, id: number) {
  db().followupEntries = db().followupEntries.filter((f) => f.id !== id);
  logActivity(user, 'followup', 'delete', 'حذف خطة من دفتر المتابعة');
  return { message: 'تم حذف الخطة' };
}

// ─────────────────────────── ملاحظات الطلاب ────────────────────────────

function noteWithExtras(n: ReturnType<typeof db>['studentNotes'][number]) {
  const student = db().students.find((s) => s.id === n.student_id);
  return { ...n, student: student ? { id: student.id, full_name: student.full_name, student_no: student.student_no, classroom_id: student.classroom_id } : undefined, author: userMini(n.author_id), subject: n.subject_id ? subjectMini(n.subject_id) : null };
}

function notesIndex(user: DemoUser, q: Query) {
  let rows = db().studentNotes;
  const teacher = teacherRecord(user);

  if (teacher) {
    const ids = classroomIdsForTeacher(teacher.id);
    rows = rows.filter((n) => { const s = db().students.find((x) => x.id === n.student_id); return s && ids.includes(s.classroom_id); });
  }
  if (q.student_id) rows = rows.filter((n) => n.student_id === Number(q.student_id));
  if (q.type) rows = rows.filter((n) => n.type === q.type);

  rows = [...rows].sort((a, b) => (b.noted_on > a.noted_on ? 1 : -1));
  return paginate(rows.map(noteWithExtras), Number(q.page ?? 1), Number(q.per_page ?? 20));
}

function guardNoteScope(user: DemoUser, studentId: number) {
  const teacher = teacherRecord(user);
  if (!teacher) return;

  const student = db().students.find((s) => s.id === studentId);
  const ids = classroomIdsForTeacher(teacher.id);
  if (!student || !ids.includes(student.classroom_id!)) throw new HttpError('هذا الطالب خارج نطاق فصولك.', 403);
}

function notesStore(user: DemoUser, body: any) {
  guardNoteScope(user, body.student_id);

  const note = { id: nextId('studentNote'), student_id: body.student_id, author_id: user.id, subject_id: body.subject_id ?? null, type: body.type, title: body.title, body: body.body, noted_on: body.noted_on };
  db().studentNotes.push(note);

  const student = db().students.find((s) => s.id === note.student_id);
  logActivity(user, 'student_notes', 'create', `أضاف ملاحظة ${note.type === 'positive' ? 'إيجابية' : 'سلبية'} على الطالب «${student?.full_name}»`);

  return { note: noteWithExtras(note), message: 'تم حفظ الملاحظة' };
}

function notesUpdate(user: DemoUser, id: number, body: any) {
  const note = db().studentNotes.find((n) => n.id === id);
  if (!note) notFound();

  guardNoteScope(user, body.student_id ?? note.student_id);
  Object.assign(note, { type: body.type ?? note.type, title: body.title ?? note.title, body: body.body ?? note.body, noted_on: body.noted_on ?? note.noted_on, subject_id: body.subject_id ?? null });

  logActivity(user, 'student_notes', 'update', 'عدّل ملاحظة على طالب');

  return { note: noteWithExtras(note), message: 'تم حفظ التعديلات' };
}

function notesDestroy(user: DemoUser, id: number) {
  db().studentNotes = db().studentNotes.filter((n) => n.id !== id);
  logActivity(user, 'student_notes', 'delete', 'حذف ملاحظة عن طالب');
  return { message: 'تم حذف الملاحظة' };
}

// ─────────────────────────── الأخبار والأنشطة ──────────────────────────

function newsWithAuthor(n: ReturnType<typeof db>['news'][number]) {
  return { ...n, author: userMini(n.author_id), created_at: n.published_at ?? new Date().toISOString() };
}

function typeLabel(type: string) {
  return type === 'activity' ? 'نشاط مدرسي' : 'خبر مدرسي';
}

function newsIndex(user: DemoUser, q: Query) {
  let rows = db().news;
  if (!canModule(user, 'news', 'update')) rows = rows.filter((n) => n.is_published);
  if (q.type) rows = rows.filter((n) => n.type === q.type);

  rows = [...rows].sort((a, b) => ((b.published_at ?? '') > (a.published_at ?? '') ? 1 : -1));
  return paginate(rows.map(newsWithAuthor), Number(q.page ?? 1), Number(q.per_page ?? 12));
}

function newsShow(user: DemoUser, id: number) {
  const item = db().news.find((n) => n.id === id);
  if (!item || (!item.is_published && !canModule(user, 'news', 'update'))) notFound();
  return { news: newsWithAuthor(item!) };
}

function newsStore(user: DemoUser, body: any) {
  const publish = Boolean(body.publish);
  const item = { id: nextId('news'), author_id: user.id, type: body.type ?? 'news', title: body.title, excerpt: body.excerpt ?? null, body: body.body, is_published: publish, published_at: publish ? new Date().toISOString() : null };
  db().news.push(item);

  logActivity(user, 'news', publish ? 'publish' : 'create', `${publish ? 'نشر' : 'حفظ مسودة'} ${typeLabel(item.type)} بعنوان «${item.title}»`);

  const notified = publish ? broadcastNotification(item.type === 'activity' ? 'activity.published' : 'news.published', `${typeLabel(item.type)}: ${item.title}`, item.excerpt, `/news/${item.id}`) : 0;

  return { news: newsWithAuthor(item), notified, message: publish ? `تم النشر بنجاح، وأُرسل إشعار إلى ${notified} مستخدما` : 'تم حفظ المسودة' };
}

function newsUpdate(id: number, body: any) {
  const item = db().news.find((n) => n.id === id);
  if (!item) notFound();

  Object.assign(item, { title: body.title ?? item.title, excerpt: body.excerpt ?? null, body: body.body ?? item.body, type: body.type ?? item.type });

  return { news: newsWithAuthor(item), message: 'تم حفظ التعديلات' };
}

function newsPublish(id: number) {
  const item = db().news.find((n) => n.id === id);
  if (!item) notFound();
  if (item.is_published) throw new HttpError('هذا الخبر منشور مسبقا.', 422);

  item.is_published = true;
  item.published_at = new Date().toISOString();

  const notified = broadcastNotification(item.type === 'activity' ? 'activity.published' : 'news.published', `${typeLabel(item.type)}: ${item.title}`, item.excerpt, `/news/${item.id}`);

  return { news: newsWithAuthor(item), notified, message: `تم النشر، وأُرسل إشعار إلى ${notified} مستخدما` };
}

function newsDestroy(id: number) {
  db().news = db().news.filter((n) => n.id !== id);
  return { message: 'تم حذف الخبر' };
}

// ─────────────────────────── الإشعارات ─────────────────────────────────

function notificationsIndex(user: DemoUser, q: Query) {
  let rows = db().notifications.filter((n) => n.user_id === user.id);
  if (q.unread_only) rows = rows.filter((n) => !n.read_at);

  return { unread: unreadCount(user.id), notifications: rows.slice(0, Number(q.limit ?? 20)) };
}

function notificationsMarkRead(user: DemoUser, id: number) {
  const n = db().notifications.find((x) => x.id === id && x.user_id === user.id);
  if (!n) notFound();
  n.read_at = new Date().toISOString();
  return { unread: unreadCount(user.id) };
}

function notificationsMarkAllRead(user: DemoUser) {
  const now = new Date().toISOString();
  for (const n of db().notifications) if (n.user_id === user.id && !n.read_at) n.read_at = now;
  return { unread: 0, message: 'تم تعليم الكل كمقروء' };
}

function notificationsBroadcast(user: DemoUser, body: any) {
  const count = broadcastNotification('system', body.title, body.body ?? null, body.link ?? null);
  logActivity(user, 'notifications', 'create', `أرسل إشعارا عاما «${body.title}» إلى ${count} مستخدما`);
  return { notified: count, message: `تم إرسال الإشعار إلى ${count} مستخدما` };
}

// ─────────────────────────── سجل العمليات ──────────────────────────────

function activityIndex(q: Query) {
  let rows = db().activityLogs;

  if (q.module) rows = rows.filter((l) => l.module === q.module);
  if (q.action) rows = rows.filter((l) => l.action === q.action);
  if (q.q) rows = rows.filter((l) => l.description.includes(String(q.q)));

  rows = [...rows].sort((a, b) => b.id - a.id);
  const page = paginate(rows.map(withLabels), Number(q.page ?? 1), Number(q.per_page ?? 30));
  return page;
}

function activityFilters() {
  return {
    modules: MODULES,
    actions: [
      { key: 'create', label: 'إضافة' }, { key: 'update', label: 'تعديل' }, { key: 'delete', label: 'حذف' },
      { key: 'publish', label: 'نشر' }, { key: 'login', label: 'تسجيل دخول' }, { key: 'permissions', label: 'تعديل صلاحيات' },
    ],
  };
}

// ─────────────────────────── إدارة الصلاحيات ───────────────────────────

function permissionsIndex() {
  const rows = db().users
    .filter((u) => ['vice_principal', 'secretary', 'teacher'].includes(u.role))
    .sort((a, b) => a.role.localeCompare(b.role))
    .map((u) => ({
      id: u.id, name: u.name, username: u.username, role: u.role, role_label: roleLabel(u.role), is_active: u.is_active, last_login_at: u.last_login_at,
      active_modules_count: Object.values(db().permissions[u.id] ?? {}).filter((v) => v > LEVEL.NONE).length,
    }));

  return { users: rows, modules: MODULES, levels: LEVEL_OPTIONS };
}

function permissionsShow(id: number) {
  const target = db().users.find((u) => u.id === id);
  if (!target) notFound();
  if (['principal', 'super_admin'].includes(target.role)) throw new HttpError('صلاحيات هذا الدور كاملة بطبيعته ولا تُعدّل.', 422);

  const levels = db().permissions[id] ?? {};

  return {
    user: { id: target.id, name: target.name, username: target.username, role: target.role, role_label: roleLabel(target.role), is_active: target.is_active },
    modules: MODULES,
    levels: LEVEL_OPTIONS,
    permissions: Object.fromEntries(MODULES.map((m) => [m.key, levels[m.key] ?? LEVEL.NONE])),
  };
}

function permissionsUpdate(user: DemoUser, id: number, body: any) {
  const target = db().users.find((u) => u.id === id);
  if (!target) notFound();
  if (['principal', 'super_admin'].includes(target.role)) throw new HttpError('لا يمكن تعديل صلاحيات هذا الدور.', 422);

  const before = { ...(db().permissions[id] ?? {}) };
  let changed = 0;

  for (const [mod, level] of Object.entries(body.permissions ?? {})) {
    if (!MODULES.some((m) => m.key === mod)) continue;
    if ((before[mod] ?? 0) !== level) changed++;
    db().permissions[id] = { ...db().permissions[id], [mod]: Number(level) };
  }

  if (changed > 0) logActivity(user, 'permissions', 'permissions', `عدّل صلاحيات ${roleLabel(target.role)} «${target.name}» على ${changed} وحدة`);

  return { message: 'تم حفظ الصلاحيات، وستسري فور دخول المستخدم التالي', changed };
}

function permissionsStoreStaff(user: DemoUser, body: any) {
  const store = db();
  if (store.users.some((u) => u.username === body.username)) throw new HttpError('اسم المستخدم مستخدم من قبل.', 422, { username: ['اسم المستخدم مستخدم من قبل.'] });
  if (!STAFF_ROLES.includes(body.role)) throw new HttpError('دور غير صحيح.', 422, { role: ['دور غير صحيح.'] });

  const id = nextId('user');
  store.users.push({ id, name: body.name, username: body.username, email: body.email ?? null, phone: body.phone ?? null, role: body.role, is_active: true, last_login_at: null });
  store.permissions[id] = { ...ROLE_DEFAULTS[body.role] };

  logActivity(user, 'permissions', 'create', `أنشأ حساب ${roleLabel(body.role)} «${body.name}» بالصلاحيات الافتراضية`);

  return { user: { id, name: body.name, username: body.username, role: body.role }, message: 'تم إنشاء الحساب بالصلاحيات الافتراضية للدور' };
}

function permissionsToggleActive(user: DemoUser, id: number) {
  const target = db().users.find((u) => u.id === id);
  if (!target) notFound();
  if (target.id === user.id) throw new HttpError('لا يمكنك إيقاف حسابك.', 422);
  if (['principal', 'super_admin'].includes(target.role)) throw new HttpError('لا يمكن إيقاف حساب مدير المدرسة من هنا.', 422);

  target.is_active = !target.is_active;
  logActivity(user, 'permissions', 'update', `${target.is_active ? 'فعّل' : 'أوقف'} حساب «${target.name}»`);

  return { is_active: target.is_active, message: target.is_active ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب' };
}

// ─────────────────────────── لوحة الطالب ───────────────────────────────

function requireStudent(user: DemoUser) {
  const student = studentRecord(user);
  if (!student) throw new HttpError('هذه اللوحة مخصّصة للطلاب.', 403);
  return student;
}

function studentDashboard(user: DemoUser) {
  const student = requireStudent(user);
  const classroom = db().classrooms.find((c) => c.id === student.classroom_id);
  const myGrades = db().grades.filter((g) => g.student_id === student.id);
  const average = myGrades.length ? myGrades.reduce((sum, g) => sum + (g.score / g.max_score) * 100, 0) / myGrades.length : null;
  const subjectsCount = new Set(myGrades.map((g) => g.subject_id)).size;
  const notesCount = db().studentNotes.filter((n) => n.student_id === student.id).length;
  const todayLessons = db().dailyLessons.filter((l) => l.classroom_id === student.classroom_id && l.lesson_date === todayStr()).length;

  return {
    student: { id: student.id, student_no: student.student_no, full_name: student.full_name, status: student.status },
    classroom: classroom?.name ?? null,
    stats: [
      { key: 'average', label: 'المعدل العام', value: average !== null ? `${average.toFixed(1)}%` : '—' },
      { key: 'subjects', label: 'الموادّ', value: subjectsCount },
      { key: 'notes', label: 'ملاحظاتي', value: notesCount },
      { key: 'today_lessons', label: 'دروس اليوم', value: todayLessons },
    ],
    latest_news: [...db().news].filter((n) => n.is_published).sort((a, b) => (b.published_at! > a.published_at! ? 1 : -1)).slice(0, 4).map((n) => ({ id: n.id, type: n.type, title: n.title, excerpt: n.excerpt, published_at: n.published_at })),
  };
}

function studentGrades(user: DemoUser) {
  const student = requireStudent(user);
  const rows = db().grades.filter((g) => g.student_id === student.id);
  const bySubject: Record<string, any> = {};

  for (const g of rows) {
    const name = subjectMini(g.subject_id)?.name ?? 'مادة';
    bySubject[name] ??= { items: [], total: 0, out_of: 0 };
    bySubject[name].items.push({ term: g.term, assessment_type: g.assessment_type, score: g.score, max_score: g.max_score, percentage: Math.round((g.score / g.max_score) * 1000) / 10 });
    bySubject[name].total += g.score;
    bySubject[name].out_of += g.max_score;
  }

  return { by_subject: bySubject };
}

function studentSchedule(user: DemoUser) {
  const student = requireStudent(user);
  const rows = db().scheduleSlots.filter((s) => s.classroom_id === student.classroom_id).sort((a, b) => a.day_of_week - b.day_of_week || a.period - b.period);
  return { days: DAY_NAMES, periods: [1, 2, 3, 4, 5, 6, 7, 8], slots: rows.map(slotWithExtras) };
}

function studentLessons(user: DemoUser, q: Query) {
  const student = requireStudent(user);
  let rows = db().dailyLessons.filter((l) => l.classroom_id === student.classroom_id);

  if (q.date) rows = rows.filter((l) => l.lesson_date === q.date);

  rows = [...rows].sort((a, b) => (b.lesson_date > a.lesson_date ? 1 : -1) || a.period - b.period);
  return { lessons: rows.map(lessonWithExtras) };
}

function studentNotesPortal(user: DemoUser) {
  const student = requireStudent(user);
  const rows = db().studentNotes.filter((n) => n.student_id === student.id).map(noteWithExtras).sort((a, b) => (b.noted_on > a.noted_on ? 1 : -1));

  return { positive: rows.filter((n) => n.type === 'positive'), negative: rows.filter((n) => n.type === 'negative') };
}
