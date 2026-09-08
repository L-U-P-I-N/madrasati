export type PermissionLevel = 0 | 1 | 2 | 3 | 4;

export interface ModuleAbilities {
  level: PermissionLevel;
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface MenuItem {
  key: string;
  label: string;
  icon: string;
  group: string;
}

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email: string | null;
  role: 'super_admin' | 'principal' | 'vice_principal' | 'secretary' | 'teacher' | 'student';
  role_label: string;
  avatar: string | null;
  is_active: boolean;
  teacher_id: number | null;
  student_id: number | null;
  permissions: Record<string, ModuleAbilities>;
  menu: MenuItem[];
  unread_notifications: number;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Classroom {
  id: number;
  name: string;
  grade_level: string;
  section: string;
  capacity: number;
  students_count?: number;
  academic_year_id: number;
  homeroom_teacher_id: number | null;
}

export interface Student {
  id: number;
  student_no: string;
  full_name: string;
  classroom_id: number | null;
  classroom?: Classroom | null;
  national_id: string | null;
  birth_date: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  status: 'active' | 'pending' | 'withdrawn';
  enrolled_on: string | null;
  address: string | null;
}

export interface Teacher {
  id: number;
  employee_no: string;
  specialization: string | null;
  qualification: string | null;
  hired_on: string | null;
  assignments_count?: number;
  user: { id: number; name: string; username: string; email: string | null; phone: string | null; is_active: boolean };
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  max_grade: number;
}

export interface ScheduleSlot {
  id: number;
  classroom_id: number;
  subject_id: number;
  teacher_id: number;
  day_of_week: number;
  period: number;
  starts_at: string | null;
  ends_at: string | null;
  classroom?: { id: number; name: string };
  subject?: { id: number; name: string };
  teacher?: { id: number; user: { id: number; name: string } };
}

export interface DailyLesson {
  id: number;
  classroom_id: number;
  subject_id: number;
  teacher_id: number;
  schedule_slot_id: number | null;
  lesson_date: string;
  period: number;
  title: string;
  content: string;
  homework: string | null;
  classroom?: { id: number; name: string };
  subject?: { id: number; name: string };
  teacher?: { id: number; user: { id: number; name: string } };
}

export interface Grade {
  id: number;
  student_id: number;
  subject_id: number;
  classroom_id: number;
  term: string;
  assessment_type: string;
  score: string | number;
  max_score: string | number;
  remark: string | null;
  student?: { id: number; full_name: string; student_no: string };
  subject?: { id: number; name: string };
  classroom?: { id: number; name: string };
}

export interface FollowupEntry {
  id: number;
  teacher_id: number;
  subject_id: number;
  classroom_id: number;
  term: string;
  month: number;
  objectives: string;
  planned_lessons: string;
  achievements: string | null;
  subject?: { id: number; name: string };
  classroom?: { id: number; name: string };
  teacher?: { id: number; user: { id: number; name: string } };
}

export interface StudentNote {
  id: number;
  student_id: number;
  subject_id: number | null;
  type: 'positive' | 'negative';
  title: string;
  body: string;
  noted_on: string;
  student?: { id: number; full_name: string; student_no: string };
  author?: { id: number; name: string };
  subject?: { id: number; name: string } | null;
}

export interface NewsItem {
  id: number;
  type: 'news' | 'activity';
  title: string;
  excerpt: string | null;
  body: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  author?: { id: number; name: string };
}

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface ActivityLogItem {
  id: number;
  user_name: string;
  user_role: string;
  role_label?: string;
  module: string;
  module_label?: string;
  action: string;
  description: string;
  changes: Record<string, { before: unknown; after: unknown }> | null;
  created_at: string;
}

export interface StatCard {
  key: string;
  label: string;
  value: number | string;
  hint?: string | null;
}
