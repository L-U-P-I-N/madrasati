'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { dualDate, num } from '@/lib/format';
import { Badge, Card, Empty, Field, Loading, Modal, PageHead, Unauthorized } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { Classroom, DailyLesson, Paginated, ScheduleSlot } from '@/lib/types';

interface TodayData {
  date: string;
  day_name: string;
  slots: { slot: ScheduleSlot; lesson: DailyLesson | null }[];
}

interface LessonForm {
  id?: number;
  schedule_slot_id: number | null;
  classroom_id: number;
  subject_id: number;
  period: number;
  lesson_date: string;
  title: string;
  content: string;
  homework: string;
}

export default function DailyLessonsPage() {
  const { abilities, user } = useAuth();
  const can = abilities('daily_lessons');
  const isTeacher = Boolean(user?.teacher_id);

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [classroomId, setClassroomId] = useState('');

  const todayData = useApi<TodayData>(isTeacher && can.view ? '/daily-lessons/today' : null, { date });
  const history = useApi<Paginated<DailyLesson>>(can.view ? '/daily-lessons' : null, { classroom_id: classroomId });
  const classrooms = useApi<Classroom[]>(!isTeacher && can.view ? '/classrooms' : null);

  const [editing, setEditing] = useState<LessonForm | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');

  if (!can.view) return <Unauthorized />;

  function openFor(entry: TodayData['slots'][number]) {
    setError(null);
    setEditing({
      id: entry.lesson?.id,
      schedule_slot_id: entry.slot.id,
      classroom_id: entry.slot.classroom_id,
      subject_id: entry.slot.subject_id,
      period: entry.slot.period,
      lesson_date: date,
      title: entry.lesson?.title ?? '',
      content: entry.lesson?.content ?? '',
      homework: entry.lesson?.homework ?? '',
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;

    setBusy(true);
    setError(null);

    try {
      if (editing.id) await api.put(`/daily-lessons/${editing.id}`, editing);
      else await api.post('/daily-lessons', editing);

      setFlash('تم تسجيل الحصة، وستظهر في قسم «الدروس المعطاة» للطالب فورا');
      setEditing(null);
      await Promise.all([todayData.reload(), history.reload()]);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('تعذّر الحفظ.', 0));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        title="الحصص اليومية"
        subtitle={isTeacher ? 'سجّل ما تم تدريسه في كل حصة من حصص يومك.' : 'سجل ما دُرّس فعليا في الحصص، للاطلاع والمراجعة.'}
      />

      {flash && <div className="alert alert--success">{flash}</div>}

      {isTeacher && (
        <>
          <div className="filters">
            <Field label="التاريخ">
              <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>
          </div>

          <Card title={`جدول ${todayData.data?.day_name ?? 'اليوم'} — ${dualDate(date)}`}>
            {todayData.loading ? (
              <Loading rows={3} />
            ) : (todayData.data?.slots.length ?? 0) === 0 ? (
              <Empty title="لا توجد حصص لك في هذا اليوم" />
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>الحصة</th>
                      <th>الفصل</th>
                      <th>المادة</th>
                      <th>الحالة</th>
                      <th>ما تم تدريسه</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {todayData.data!.slots.map((entry) => (
                      <tr key={entry.slot.id}>
                        <td>{num(entry.slot.period)}</td>
                        <td>{entry.slot.classroom?.name}</td>
                        <td>{entry.slot.subject?.name}</td>
                        <td>
                          <Badge tone={entry.lesson ? 'success' : 'warning'}>
                            {entry.lesson ? 'مسجّلة' : 'غير مسجّلة'}
                          </Badge>
                        </td>
                        <td style={{ maxWidth: 340, color: 'var(--text-2)', fontSize: 13 }}>
                          {entry.lesson ? entry.lesson.title : '—'}
                        </td>
                        <td>
                          {(entry.lesson ? can.update : can.create) && (
                            <button type="button" className="btn btn--secondary btn--sm" onClick={() => openFor(entry)}>
                              {entry.lesson ? 'تعديل السجل' : 'تسجيل الحصة'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div style={{ height: 'var(--space-6)' }} />
        </>
      )}

      {!isTeacher && (
        <div className="filters">
          <Field label="الفصل">
            <select className="select" value={classroomId} onChange={(event) => setClassroomId(event.target.value)}>
              <option value="">كل الفصول</option>
              {(classrooms.data ?? []).map((classroom) => (
                <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
              ))}
            </select>
          </Field>
        </div>
      )}

      <Card title="سجل الحصص">
        {history.loading ? (
          <Loading rows={4} />
        ) : !history.data || history.data.data.length === 0 ? (
          <Empty title="لا توجد حصص مسجّلة" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الحصة</th>
                  <th>الفصل</th>
                  <th>المادة</th>
                  <th>الدرس</th>
                  <th>المعلم</th>
                </tr>
              </thead>
              <tbody>
                {history.data.data.map((lesson) => (
                  <tr key={lesson.id}>
                    <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{dualDate(lesson.lesson_date)}</td>
                    <td>{num(lesson.period)}</td>
                    <td>{lesson.classroom?.name}</td>
                    <td>{lesson.subject?.name}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{lesson.title}</div>
                      <div className="person__sub" style={{ maxWidth: 420 }}>{lesson.content}</div>
                    </td>
                    <td>{lesson.teacher?.user.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <Modal
          title={editing.id ? 'تعديل سجل الحصة' : 'تسجيل الحصة'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="submit" form="lesson-form" className="btn btn--primary" disabled={busy}>
                {busy ? 'جارٍ الحفظ…' : 'حفظ السجل'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>إلغاء</button>
            </>
          }
        >
          {error && !Object.keys(error.errors).length && <div className="alert alert--danger">{error.message}</div>}

          <form id="lesson-form" onSubmit={save} noValidate>
            <Field label="عنوان الدرس" error={error?.fieldError('title')}>
              <input className="input" value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} required />
            </Field>

            <Field label="ما تم تدريسه" hint="نص حر يصف محتوى الحصة" error={error?.fieldError('content')}>
              <textarea className="textarea" value={editing.content} onChange={(event) => setEditing({ ...editing, content: event.target.value })} required />
            </Field>

            <Field label="الواجب المنزلي" error={error?.fieldError('homework')}>
              <textarea className="textarea" style={{ minHeight: 70 }} value={editing.homework} onChange={(event) => setEditing({ ...editing, homework: event.target.value })} />
            </Field>
          </form>
        </Modal>
      )}
    </>
  );
}
