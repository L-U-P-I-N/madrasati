'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { num } from '@/lib/format';
import { Card, ConfirmDelete, Empty, Field, Loading, Modal, PageHead, Unauthorized } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { Classroom, Subject, Teacher } from '@/lib/types';

interface Options {
  academic_years: { id: number; name: string; is_current: boolean }[];
  subjects: Subject[];
}

interface ClassroomForm {
  id?: number;
  academic_year_id: number | '';
  grade_level: string;
  section: string;
  capacity: number;
  homeroom_teacher_id: number | '';
}

const EMPTY: ClassroomForm = { academic_year_id: '', grade_level: '', section: '', capacity: 30, homeroom_teacher_id: '' };

export default function ClassroomsPage() {
  const { abilities } = useAuth();
  const can = abilities('classrooms');
  const canTeachers = abilities('teachers').view;

  const list = useApi<Classroom[]>(can.view ? '/classrooms' : null);
  const options = useApi<Options>(can.view ? '/classrooms/options' : null);
  const teachers = useApi<{ data: Teacher[] }>(canTeachers ? '/teachers' : null, { per_page: 100 });

  const [editing, setEditing] = useState<ClassroomForm | null>(null);
  const [deleting, setDeleting] = useState<Classroom | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');

  if (!can.view) return <Unauthorized />;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;

    setBusy(true);
    setError(null);

    try {
      const body = { ...editing, homeroom_teacher_id: editing.homeroom_teacher_id || null };

      if (editing.id) await api.put(`/classrooms/${editing.id}`, body);
      else await api.post('/classrooms', body);

      setFlash(editing.id ? 'تم حفظ التعديلات' : 'تم إنشاء الفصل بنجاح');
      setEditing(null);
      await list.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('تعذّر الحفظ.', 0));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);

    try {
      await api.delete(`/classrooms/${deleting.id}`);
      setFlash('تم حذف الفصل');
      setDeleting(null);
      await list.reload();
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : 'تعذّر الحذف.');
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  const currentYear = options.data?.academic_years.find((year) => year.is_current);

  return (
    <>
      <PageHead
        title="إدارة الصفوف"
        subtitle="الفصول الدراسية وسعتها ومعلم الفصل وعدد الطلاب المسجّلين."
        action={can.create && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => { setEditing({ ...EMPTY, academic_year_id: currentYear?.id ?? '' }); setError(null); }}
          >
            <Icon name="plus" size={16} />
            إنشاء فصل
          </button>
        )}
      />

      {flash && <div className="alert alert--success">{flash}</div>}

      <Card>
        {list.loading ? (
          <Loading rows={5} />
        ) : !list.data || list.data.length === 0 ? (
          <Empty title="لا توجد فصول" hint="أنشئ الفصول أولا ثم وزّع عليها الطلاب والمعلمين." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>الفصل</th>
                  <th>المرحلة</th>
                  <th>الشعبة</th>
                  <th>الطلاب</th>
                  <th>السعة</th>
                  {(can.update || can.delete) && <th>إجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {list.data.map((classroom) => (
                  <tr key={classroom.id}>
                    <td style={{ fontWeight: 600 }}>{classroom.name}</td>
                    <td>{classroom.grade_level}</td>
                    <td>{classroom.section}</td>
                    <td>{num(classroom.students_count ?? 0)}</td>
                    <td>{num(classroom.capacity)}</td>
                    {(can.update || can.delete) && (
                      <td>
                        <div className="cell-actions">
                          {can.update && (
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => {
                                setError(null);
                                setEditing({
                                  id: classroom.id,
                                  academic_year_id: classroom.academic_year_id,
                                  grade_level: classroom.grade_level,
                                  section: classroom.section,
                                  capacity: classroom.capacity,
                                  homeroom_teacher_id: classroom.homeroom_teacher_id ?? '',
                                });
                              }}
                            >
                              <Icon name="pencil" size={14} />
                              تعديل
                            </button>
                          )}
                          {can.delete && (
                            <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleting(classroom)}>
                              <Icon name="trash" size={14} />
                              حذف
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <Modal
          title={editing.id ? 'تعديل الفصل' : 'إنشاء فصل جديد'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="submit" form="classroom-form" className="btn btn--primary" disabled={busy}>
                {busy ? 'جارٍ الحفظ…' : 'حفظ'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>إلغاء</button>
            </>
          }
        >
          {error && !Object.keys(error.errors).length && <div className="alert alert--danger">{error.message}</div>}

          <form id="classroom-form" onSubmit={save} noValidate>
            <div className="grid-2">
              <Field label="العام الدراسي" error={error?.fieldError('academic_year_id')}>
                <select className="select" value={editing.academic_year_id} onChange={(event) => setEditing({ ...editing, academic_year_id: Number(event.target.value) })} required>
                  <option value="">اختر العام</option>
                  {(options.data?.academic_years ?? []).map((year) => (
                    <option key={year.id} value={year.id}>{year.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="المرحلة" hint="مثال: العاشر" error={error?.fieldError('grade_level')}>
                <input className="input" value={editing.grade_level} onChange={(event) => setEditing({ ...editing, grade_level: event.target.value })} required />
              </Field>

              <Field label="الشعبة" hint="مثال: أ" error={error?.fieldError('section')}>
                <input className="input" value={editing.section} onChange={(event) => setEditing({ ...editing, section: event.target.value })} required />
              </Field>

              <Field label="السعة" error={error?.fieldError('capacity')}>
                <input className="input" type="number" min={1} max={100} value={editing.capacity} onChange={(event) => setEditing({ ...editing, capacity: Number(event.target.value) })} required />
              </Field>

              {canTeachers && (
                <Field label="معلم الفصل" error={error?.fieldError('homeroom_teacher_id')}>
                  <select className="select" value={editing.homeroom_teacher_id} onChange={(event) => setEditing({ ...editing, homeroom_teacher_id: event.target.value ? Number(event.target.value) : '' })}>
                    <option value="">بدون</option>
                    {(teachers.data?.data ?? []).map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>{teacher.user.name}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDelete label={`الفصل «${deleting.name}»`} busy={busy} onConfirm={() => void remove()} onClose={() => setDeleting(null)} />
      )}
    </>
  );
}
