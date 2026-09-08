import * as seed from './seed';

/**
 * الحالة القابلة للتعديل أثناء الجلسة — نسخة عميقة من البذور تُعاد عند
 * إعادة تحميل الصفحة (لا تُخزَّن في localStorage عمدا) حتى يبقى العرض
 * التجريبي «ثابتا»: أي تعديل يظهر فورا للعميل، لكنه لا يترك أثرا دائما.
 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function freshState() {
  return {
    users: clone(seed.users),
    teachers: clone(seed.teachers),
    students: clone(seed.students),
    classrooms: clone(seed.classrooms),
    subjects: clone(seed.subjects),
    assignments: clone(seed.assignments),
    scheduleSlots: clone(seed.scheduleSlots),
    dailyLessons: clone(seed.dailyLessons),
    grades: clone(seed.grades),
    followupEntries: clone(seed.followupEntries),
    studentNotes: clone(seed.studentNotes),
    news: clone(seed.news),
    notifications: clone(seed.notifications),
    activityLogs: clone(seed.activityLogs),
    permissions: seed.buildInitialPermissions(),
    ids: clone(seed.nextIds),
  };
}

type State = ReturnType<typeof freshState>;

let state: State = freshState();

export function db(): State {
  return state;
}

export function resetDemoData(): void {
  state = freshState();
}

export function nextId(key: keyof State['ids']): number {
  return state.ids[key]++;
}
