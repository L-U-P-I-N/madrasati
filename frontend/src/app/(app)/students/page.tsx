'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { dualDate, initials, num, STUDENT_STATUS } from '@/lib/format';
import { Badge, Card, ConfirmDelete, Empty, Field, Loading, Modal, PageHead, Unauthorized } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { Classroom, Paginated, Student } from '@/lib/types';

const EMPTY: Partial<Student> = { status: 'active', full_name: '', student_no: '' };

export default function StudentsPage() {
  const { abilities } = useAuth();
  const can = abilities('students');

  const [query, setQuery] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const list = useApi<Paginated<Student>>(can.view ? '/students' : null, {
    q: query, classroom_id: classroomId, status, page,
  });
  const classrooms = useApi<Classroom[]>(can.view ? '/classrooms' : null);

  const [editing, setEditing] = useState<Partial<Student> | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [flash, setFlash] = useState('');

  if (!can.view) return <Unauthorized />;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;

    setBusy(true);
    setError(null);

    try {
      const body = { ...editing, classroom_id: editing.classroom_id || null };

      if (editing.id) await api.put(`/students/${editing.id}`, body);
      else await api.post('/students', body);

      setFlash(editing.id ? 'تم حفظ التعديلات' : 'تم حفظ بيانات الطالب بنجاح');
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
      await api.delete(`/students/${deleting.id}`);
      setFlash('تم حذف سجل الطالب');
      setDeleting(null);
      await list.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        title="إدارة الطلاب"
        subtitle="سجلات الطلاب المسجّلين، وبيانات أولياء الأمور، وتوزيعهم على الفصول."
        action={
          // زر الإضافة يظهر فقط لمن يملك صلاحية الإضافة
          can.create && (
            <button type="button" className="btn btn--primary" onClick={() => { setEditing({ ...EMPTY }); setError(null); }}>
              <Icon name="plus" size={16} />
              إضافة طالب
            </button>
          )
        }
      />

      {flash && <div className="alert alert--success">{flash}</div>}

      <div className="filters">
        <Field label="بحث">
          <input
            className="input"
            placeholder="الاسم أو رقم الطالب"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
          />
        </Field>

        <Field label="الفصل">
          <select className="select" value={classroomId} onChange={(event) => { setClassroomId(event.target.value); setPage(1); }}>
            <option value="">كل الفصول</option>
            {(classrooms.data ?? []).map((classroom) => (
              <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
            ))}
          </select>
        </Field>

        <Field label="الحالة">
          <select className="select" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">كل الحالات</option>
            {Object.entries(STUDENT_STATUS).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <Card>
        {list.loading ? (
          <Loading rows={6} />
        ) : !list.data || list.data.data.length === 0 ? (
          <Empty title="لا توجد سجلات مطابقة" hint="جرّب تعديل معايير البحث أو أضف طالبا جديدا." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>رقم الطالب</th>
                    <th>الفصل</th>
                    <th>ولي الأمر</th>
                    <th>الحالة</th>
                    <th>تاريخ التسجيل</th>
                    {(can.update || can.delete) && <th>إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {list.data.data.map((student) => {
                    const tone = STUDENT_STATUS[student.status];

                    return (
                      <tr key={student.id}>
                        <td>
                          <div className="person">
                            <span className="avatar">{initials(student.full_name)}</span>
                            <div>
                              <div className="person__name">{student.full_name}</div>
                              {student.guardian_phone && <div className="person__sub">{student.guardian_phone}</div>}
                            </div>
                          </div>
                        </td>
                        <td>{student.student_no}</td>
                        <td>{student.classroom?.name ?? '—'}</td>
                        <td>{student.guardian_name ?? '—'}</td>
                        <td><Badge tone={tone.tone}>{tone.label}</Badge></td>
                        <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{dualDate(student.enrolled_on)}</td>

                        {(can.update || can.delete) && (
                          <td>
                            <div className="cell-actions">
                              {/* زر التعديل مخفي تماما لمن لا يملك صلاحية التعديل */}
                              {can.update && (
                                <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setEditing(student); setError(null); }}>
                                  <Icon name="pencil" size={14} />
                                  تعديل
                                </button>
                              )}
                              {can.delete && (
                                <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleting(student)}>
                                  <Icon name="trash" size={14} />
                                  حذف
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', padding: 'var(--space-4) var(--space-6)' }}>
              <span style={{ color: 'var(--text-3)', fontSize: 13 }}>
                إجمالي {num(list.data.total)} طالبا · صفحة {num(list.data.current_page)} من {num(list.data.last_page)}
              </span>
              <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 'var(--space-2)' }}>
                <button type="button" className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>السابق</button>
                <button type="button" className="btn btn--ghost btn--sm" disabled={page >= list.data.last_page} onClick={() => setPage((value) => value + 1)}>التالي</button>
              </div>
            </div>
          </>
        )}
      </Card>

      {editing && (
        <Modal
          title={editing.id ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="submit" form="student-form" className="btn btn--primary" disabled={busy}>
                {busy ? 'جارٍ الحفظ…' : 'حفظ البيانات'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>إلغاء</button>
            </>
          }
        >
          {error && !Object.keys(error.errors).length && <div className="alert alert--danger">{error.message}</div>}

          <form id="student-form" onSubmit={save} noValidate>
            <div className="grid-2">
              <Field label="اسم الطالب" error={error?.fieldError('full_name')}>
                <input className="input" value={editing.full_name ?? ''} onChange={(event) => setEditing({ ...editing, full_name: event.target.value })} required />
              </Field>

              <Field label="رقم الطالب" error={error?.fieldError('student_no')}>
                <input className="input" value={editing.student_no ?? ''} onChange={(event) => setEditing({ ...editing, student_no: event.target.value })} required />
              </Field>

              <Field label="الفصل" error={error?.fieldError('classroom_id')}>
                <select className="select" value={editing.classroom_id ?? ''} onChange={(event) => setEditing({ ...editing, classroom_id: event.target.value ? Number(event.target.value) : null })}>
                  <option value="">بدون فصل</option>
                  {(classrooms.data ?? []).map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="الحالة" error={error?.fieldError('status')}>
                <select className="select" value={editing.status ?? 'active'} onChange={(event) => setEditing({ ...editing, status: event.target.value as Student['status'] })}>
                  {Object.entries(STUDENT_STATUS).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="اسم ولي الأمر" error={error?.fieldError('guardian_name')}>
                <input className="input" value={editing.guardian_name ?? ''} onChange={(event) => setEditing({ ...editing, guardian_name: event.target.value })} />
              </Field>

              <Field label="جوال ولي الأمر" error={error?.fieldError('guardian_phone')}>
                <input className="input" value={editing.guardian_phone ?? ''} onChange={(event) => setEditing({ ...editing, guardian_phone: event.target.value })} />
              </Field>

              <Field label="تاريخ الميلاد" error={error?.fieldError('birth_date')}>
                <input className="input" type="date" value={(editing.birth_date ?? '').slice(0, 10)} onChange={(event) => setEditing({ ...editing, birth_date: event.target.value })} />
              </Field>

              <Field label="تاريخ التسجيل" error={error?.fieldError('enrolled_on')}>
                <input className="input" type="date" value={(editing.enrolled_on ?? '').slice(0, 10)} onChange={(event) => setEditing({ ...editing, enrolled_on: event.target.value })} />
              </Field>
            </div>

            <Field label="العنوان" error={error?.fieldError('address')}>
              <textarea className="textarea" value={editing.address ?? ''} onChange={(event) => setEditing({ ...editing, address: event.target.value })} />
            </Field>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDelete
          label={`سجل الطالب «${deleting.full_name}»`}
          busy={busy}
          onConfirm={() => void remove()}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
