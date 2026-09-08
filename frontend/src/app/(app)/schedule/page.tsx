'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { DAYS, PERIODS, num } from '@/lib/format';
import { Card, Empty, Field, Loading, Modal, PageHead, Unauthorized } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { Classroom, ScheduleSlot, Subject, Teacher } from '@/lib/types';

interface ScheduleData {
  days: string[];
  periods: number[];
  slots: ScheduleSlot[];
}

interface SlotForm {
  id?: number;
  classroom_id: number | '';
  subject_id: number | '';
  teacher_id: number | '';
  day_of_week: number;
  period: number;
}

export default function SchedulePage() {
  const { abilities, user } = useAuth();
  const can = abilities('schedule');
  const isTeacher = Boolean(user?.teacher_id);

  const classrooms = useApi<Classroom[]>(can.view ? '/classrooms' : null);
  const [classroomId, setClassroomId] = useState('');
  const data = useApi<ScheduleData>(can.view ? '/schedule' : null, { classroom_id: classroomId });
  const options = useApi<{ subjects: Subject[] }>(can.create || can.update ? '/classrooms/options' : null);
  const teachers = useApi<{ data: Teacher[] }>(!isTeacher && (can.create || can.update) ? '/teachers' : null, { per_page: 100 });

  const [editing, setEditing] = useState<SlotForm | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');

  if (!can.view) return <Unauthorized />;

  const byCell = new Map<string, ScheduleSlot>();
  for (const slot of data.data?.slots ?? []) byCell.set(`${slot.day_of_week}-${slot.period}`, slot);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;

    setBusy(true);
    setError(null);

    try {
      if (editing.id) await api.put(`/schedule/${editing.id}`, editing);
      else await api.post('/schedule', editing);

      setFlash('تم حفظ الجدول');
      setEditing(null);
      await data.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('تعذّر الحفظ.', 0));
    } finally {
      setBusy(false);
    }
  }

  async function removeSlot(id: number) {
    await api.delete(`/schedule/${id}`);
    setFlash('تم حذف الحصة من الجدول');
    setEditing(null);
    await data.reload();
  }

  return (
    <>
      <PageHead
        title="الجدول الأسبوعي"
        subtitle={isTeacher ? 'جدولك الأسبوعي الخاص كما اعتمدته الإدارة.' : 'توزيع الحصص على أيام الأسبوع لكل فصل.'}
      />

      {flash && <div className="alert alert--success">{flash}</div>}

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

          {can.create && classroomId && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => { setError(null); setEditing({ classroom_id: Number(classroomId), subject_id: '', teacher_id: '', day_of_week: 0, period: 1 }); }}
            >
              <Icon name="plus" size={16} />
              إضافة حصة
            </button>
          )}
        </div>
      )}

      <Card>
        {data.loading ? (
          <Loading rows={5} />
        ) : (data.data?.slots.length ?? 0) === 0 ? (
          <Empty title="لا توجد حصص في الجدول" hint={can.create ? 'اختر فصلا ثم أضف الحصص.' : undefined} />
        ) : (
          <div className="card__body table-wrap">
            <table className="timetable">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>الحصة</th>
                  {DAYS.map((day) => <th key={day}>{day}</th>)}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period) => (
                  <tr key={period}>
                    <th>{num(period)}</th>
                    {DAYS.map((_, dayIndex) => {
                      const slot = byCell.get(`${dayIndex}-${period}`);

                      if (!slot) {
                        return (
                          <td key={dayIndex}>
                            {can.create && classroomId ? (
                              <button
                                type="button"
                                className="slot--empty"
                                style={{ width: '100%', cursor: 'pointer', border: '1px dashed var(--border-strong)', background: 'var(--surface-alt)' }}
                                onClick={() => { setError(null); setEditing({ classroom_id: Number(classroomId), subject_id: '', teacher_id: '', day_of_week: dayIndex, period }); }}
                                aria-label={`إضافة حصة ${DAYS[dayIndex]} الحصة ${period}`}
                              />
                            ) : (
                              <div className="slot--empty" />
                            )}
                          </td>
                        );
                      }

                      return (
                        <td key={dayIndex}>
                          <div
                            className="slot"
                            role={can.update ? 'button' : undefined}
                            tabIndex={can.update ? 0 : undefined}
                            style={can.update ? { cursor: 'pointer' } : undefined}
                            onClick={() => can.update && setEditing({
                              id: slot.id,
                              classroom_id: slot.classroom_id,
                              subject_id: slot.subject_id,
                              teacher_id: slot.teacher_id,
                              day_of_week: slot.day_of_week,
                              period: slot.period,
                            })}
                          >
                            <strong>{slot.subject?.name}</strong>
                            <span>{slot.teacher?.user.name}</span>
                            {!classroomId && <span style={{ display: 'block' }}>{slot.classroom?.name}</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <Modal
          title={editing.id ? 'تعديل الحصة' : 'إضافة حصة للجدول'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="submit" form="slot-form" className="btn btn--primary" disabled={busy}>
                {busy ? 'جارٍ الحفظ…' : 'حفظ'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>إلغاء</button>
              {editing.id && can.delete && (
                <button type="button" className="btn btn--danger" style={{ marginInlineStart: 'auto' }} onClick={() => void removeSlot(editing.id!)}>
                  حذف الحصة
                </button>
              )}
            </>
          }
        >
          {error && <div className="alert alert--danger">{error.message}</div>}

          <form id="slot-form" onSubmit={save} noValidate>
            <div className="grid-2">
              <Field label="المادة" error={error?.fieldError('subject_id')}>
                <select className="select" value={editing.subject_id} onChange={(event) => setEditing({ ...editing, subject_id: Number(event.target.value) })} required>
                  <option value="">اختر المادة</option>
                  {(options.data?.subjects ?? []).map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="المعلم" error={error?.fieldError('teacher_id')}>
                <select className="select" value={editing.teacher_id} onChange={(event) => setEditing({ ...editing, teacher_id: Number(event.target.value) })} required>
                  <option value="">اختر المعلم</option>
                  {(teachers.data?.data ?? []).map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.user.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="اليوم" error={error?.fieldError('day_of_week')}>
                <select className="select" value={editing.day_of_week} onChange={(event) => setEditing({ ...editing, day_of_week: Number(event.target.value) })}>
                  {DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
                </select>
              </Field>

              <Field label="رقم الحصة" error={error?.fieldError('period')}>
                <select className="select" value={editing.period} onChange={(event) => setEditing({ ...editing, period: Number(event.target.value) })}>
                  {PERIODS.map((period) => <option key={period} value={period}>{num(period)}</option>)}
                </select>
              </Field>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
