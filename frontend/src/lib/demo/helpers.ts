import { GROUP_ORDER, LEVEL, MODULES, ROLE_LABELS, UNRESTRICTED_ROLES, moduleLabel } from './constants';
import { db } from './store';
import type { DemoUser } from './seed';

const TOKEN_PREFIX = 'demo-token-';
const TOKEN_KEY = 'madrasati_token';

export function tokenFor(userId: number): string {
  return `${TOKEN_PREFIX}${userId}`;
}

/**
 * قراءة مباشرة من localStorage بدل الاستيراد من ../api، تفاديا لأي دورة
 * استيراد بين api.ts (الذي يستدعي طبقة الديمو) وهذه الطبقة نفسها.
 */
function readToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function userIdFromToken(token: string | null): number | null {
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null;
  const id = Number(token.slice(TOKEN_PREFIX.length));
  return Number.isFinite(id) ? id : null;
}

/** المستخدم "المسجّل دخوله" حاليا في وضع العرض — يُقرأ من الرمز في localStorage. */
export function currentUser(): DemoUser | null {
  const id = userIdFromToken(readToken());
  if (id === null) return null;
  return db().users.find((u) => u.id === id) ?? null;
}

export function isUnrestricted(user: DemoUser): boolean {
  return UNRESTRICTED_ROLES.includes(user.role);
}

export function levelFor(user: DemoUser, moduleKey: string): number {
  if (isUnrestricted(user)) return LEVEL.FULL;
  return db().permissions[user.id]?.[moduleKey] ?? LEVEL.NONE;
}

const ABILITY_LEVEL: Record<string, number> = { view: LEVEL.VIEW, create: LEVEL.CREATE, update: LEVEL.EDIT, delete: LEVEL.FULL };

export function canModule(user: DemoUser, moduleKey: string, ability: string = 'view'): boolean {
  return levelFor(user, moduleKey) >= (ABILITY_LEVEL[ability] ?? LEVEL.FULL);
}

export function permissionMatrix(user: DemoUser) {
  const matrix: Record<string, { level: number; view: boolean; create: boolean; update: boolean; delete: boolean }> = {};

  for (const mod of MODULES) {
    const level = levelFor(user, mod.key);
    matrix[mod.key] = { level, view: level >= LEVEL.VIEW, create: level >= LEVEL.CREATE, update: level >= LEVEL.EDIT, delete: level >= LEVEL.FULL };
  }

  return matrix;
}

export function menuFor(user: DemoUser) {
  const matrix = permissionMatrix(user);
  return MODULES.filter((m) => matrix[m.key].level > LEVEL.NONE);
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function teacherRecord(user: DemoUser) {
  return db().teachers.find((t) => t.user_id === user.id) ?? null;
}

export function studentRecord(user: DemoUser) {
  return db().students.find((s) => s.user_id === user.id) ?? null;
}

export function classroomIdsForTeacher(teacherId: number): number[] {
  return [...new Set(db().assignments.filter((a) => a.teacher_id === teacherId).map((a) => a.classroom_id))];
}

export function subjectIdsForTeacher(teacherId: number): number[] {
  return [...new Set(db().assignments.filter((a) => a.teacher_id === teacherId).map((a) => a.subject_id))];
}

export function unreadCount(userId: number): number {
  return db().notifications.filter((n) => n.user_id === userId && !n.read_at).length;
}

export function authProfile(user: DemoUser) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    role_label: roleLabel(user.role),
    avatar: null,
    is_active: user.is_active,
    teacher_id: teacherRecord(user)?.id ?? null,
    student_id: studentRecord(user)?.id ?? null,
    permissions: permissionMatrix(user),
    menu: menuFor(user),
    unread_notifications: unreadCount(user.id),
  };
}

export function paginate<T>(rows: T[], page = 1, perPage = 15) {
  const total = rows.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), lastPage);
  const start = (current - 1) * perPage;

  return {
    data: rows.slice(start, start + perPage),
    current_page: current,
    last_page: lastPage,
    per_page: perPage,
    total,
  };
}

export function logActivity(user: DemoUser | null, moduleKey: string, action: string, description: string, changes: Record<string, unknown> | null = null) {
  const store = db();
  store.activityLogs.unshift({
    id: store.ids.activityLog++,
    user_id: user?.id ?? null,
    user_name: user?.name ?? 'النظام',
    user_role: user?.role ?? 'system',
    module: moduleKey,
    action,
    description,
    changes,
    created_at: new Date().toISOString(),
  });
}

export function withLabels<T extends { module: string; user_role: string }>(log: T) {
  return { ...log, module_label: moduleLabel(log.module), role_label: roleLabel(log.user_role) };
}

export function broadcastNotification(type: string, title: string, body: string | null, link: string | null): number {
  const store = db();
  const now = new Date().toISOString();
  let count = 0;

  for (const user of store.users) {
    if (!user.is_active) continue;
    store.notifications.unshift({ id: store.ids.notification++, user_id: user.id, type, title, body, link, read_at: null, created_at: now });
    count++;
  }

  return count;
}

export { GROUP_ORDER };
