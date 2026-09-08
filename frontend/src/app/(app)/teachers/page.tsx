'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { initials, num } from '@/lib/format';
import { Badge, Card, ConfirmDelete, Empty, Field, Loading, Modal, PageHead, Unauthorized } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { Paginated, Teacher } from '@/lib/types';

interface TeacherForm {
  id?: number;
  name: string;
  username: string;
  password: string;
  email: string;
  phone: string;
  employee_no: string;
  specialization: string;
  qualification: string;
  hired_on: string;
  is_active: boolean;
}

const EMPTY: TeacherForm = {
  name: '', username: '', password: '', email: '', phone: '',
  employee_no: '', specialization: '', qualification: '', hired_on: '', is_active: true,
};

export default function TeachersPage() {
  const { abilities } = useAuth();
  const can = abilities('teachers');

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const list = useApi<Paginated<Teacher>>(can.view ? '/teachers' : null, { q: query, page });

  const [editing, setEditing] = useState<TeacherForm | null>(null);
  const [deleting, setDeleting] = useState<Teacher | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');

  if (!can.view) return <Unauthorized />;

  function edit(teacher: Teacher) {
    setError(null);
    setEditing({
      id: teacher.id,
      name: teacher.user.name,
      username: teacher.user.username,
      password: '',
      email: teacher.user.email ?? '',
      phone: teacher.user.phone ?? '',
      employee_no: teacher.employee_no,
      specialization: teacher.specialization ?? '',
      qualification: teacher.qualification ?? '',
      hired_on: (teacher.hired_on ?? '').slice(0, 10),
      is_active: teacher.user.is_active,
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;

    setBusy(true);
    setError(null);

    try {
      if (editing.id) {
        const { password, username, ...body } = editing;
        await api.put(`/teachers/${editing.id}`, body);
      } else {
        await api.post('/teachers', editing);
      }

      setFlash(editing.id ? 'تم حفظ التعديلات' : 'تم حفظ بيانات المعلم بنجاح');
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
      await api.delete(`/teachers/${deleting.id}`);
      setFlash('تم حذف سجل المعلم');
      setDeleting(null);
      await list.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        title="إدارة المعلمين"
        subtitle="الكادر التعليمي وبياناته المهنية وإسناد المواد."
        action={can.create && (
          <button type="button" className="btn btn--primary" onClick={() => { setEditing({ ...EMPTY }); setError(null); }}>
            <Icon name="plus" size={16} />
            إضافة معلم
          </button>
        )}
      />

      {flash && <div className="alert alert--success">{flash}</div>}

      <div className="filters">
        <Field label="بحث">
          <input className="input" placeholder="الاسم أو الرقم الوظيفي" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        </Field>
      </div>

      <Card>
        {list.loading ? (
          <Loading rows={5} />
        ) : !list.data || list.data.data.length === 0 ? (
          <Empty title="لا توجد سجلات معلمين" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>المعلم</th>
                  <th>الرقم الوظيفي</th>
                  <th>التخصص</th>
                  <th>عدد الإسنادات</th>
                  <th>الحالة</th>
                  {(can.update || can.delete) && <th>إجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {list.data.data.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>
                      <div className="person">
                        <span className="avatar">{initials(teacher.user.name)}</span>
                        <div>
                          <div className="person__name">{teacher.user.name}</div>
                          <div className="person__sub">{teacher.user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>{teacher.employee_no}</td>
                    <td>{teacher.specialization ?? '—'}</td>
                    <td>{num(teacher.assignments_count ?? 0)}</td>
                    <td>
                      <Badge tone={teacher.user.is_active ? 'success' : 'danger'}>
                        {teacher.user.is_active ? 'نشط' : 'موقوف'}
                      </Badge>
                    </td>
                    {(can.update || can.delete) && (
                      <td>
                        <div className="cell-actions">
                          {can.update && (
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => edit(teacher)}>
                              <Icon name="pencil" size={14} />
                              تعديل
                            </button>
                          )}
                          {can.delete && (
                            <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleting(teacher)}>
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
          title={editing.id ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="submit" form="teacher-form" className="btn btn--primary" disabled={busy}>
                {busy ? 'جارٍ الحفظ…' : 'حفظ البيانات'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>إلغاء</button>
            </>
          }
        >
          {error && !Object.keys(error.errors).length && <div className="alert alert--danger">{error.message}</div>}

          <form id="teacher-form" onSubmit={save} noValidate>
            <div className="grid-2">
              <Field label="اسم المعلم" error={error?.fieldError('name')}>
                <input className="input" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} required />
              </Field>

              <Field label="الرقم الوظيفي" error={error?.fieldError('employee_no')}>
                <input className="input" value={editing.employee_no} onChange={(event) => setEditing({ ...editing, employee_no: event.target.value })} required />
              </Field>

              {!editing.id && (
                <>
                  <Field label="اسم المستخدم" error={error?.fieldError('username')}>
                    <input className="input" value={editing.username} onChange={(event) => setEditing({ ...editing, username: event.target.value })} required />
                  </Field>

                  <Field label="كلمة المرور" hint="٨ محارف على الأقل" error={error?.fieldError('password')}>
                    <input className="input" type="password" value={editing.password} onChange={(event) => setEditing({ ...editing, password: event.target.value })} required />
                  </Field>
                </>
              )}

              <Field label="البريد الإلكتروني" error={error?.fieldError('email')}>
                <input className="input" type="email" value={editing.email} onChange={(event) => setEditing({ ...editing, email: event.target.value })} />
              </Field>

              <Field label="الجوال" error={error?.fieldError('phone')}>
                <input className="input" value={editing.phone} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} />
              </Field>

              <Field label="التخصص" error={error?.fieldError('specialization')}>
                <input className="input" value={editing.specialization} onChange={(event) => setEditing({ ...editing, specialization: event.target.value })} />
              </Field>

              <Field label="المؤهل" error={error?.fieldError('qualification')}>
                <input className="input" value={editing.qualification} onChange={(event) => setEditing({ ...editing, qualification: event.target.value })} />
              </Field>

              <Field label="تاريخ المباشرة" error={error?.fieldError('hired_on')}>
                <input className="input" type="date" value={editing.hired_on} onChange={(event) => setEditing({ ...editing, hired_on: event.target.value })} />
              </Field>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDelete
          label={`حساب المعلم «${deleting.user.name}»`}
          busy={busy}
          onConfirm={() => void remove()}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
