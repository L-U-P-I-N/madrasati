'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { dualDate } from '@/lib/format';
import { Badge, Card, ConfirmDelete, Empty, Field, Loading, Modal, PageHead, Unauthorized } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { Paginated, Student, StudentNote, Subject } from '@/lib/types';

interface NoteForm {
  id?: number;
  student_id: number | '';
  subject_id: number | '';
  type: 'positive' | 'negative';
  title: string;
  body: string;
  noted_on: string;
}

export default function StudentNotesPage() {
  const { abilities } = useAuth();
  const can = abilities('student_notes');

  const [type, setType] = useState('');
  const list = useApi<Paginated<StudentNote>>(can.view ? '/student-notes' : null, { type });
  const students = useApi<Paginated<Student>>(can.view ? '/students' : null, { per_page: 100 });
  const options = useApi<{ subjects: Subject[] }>(can.view ? '/classrooms/options' : null);

  const [editing, setEditing] = useState<NoteForm | null>(null);
  const [deleting, setDeleting] = useState<StudentNote | null>(null);
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
      const body = { ...editing, subject_id: editing.subject_id || null };

      if (editing.id) await api.put(`/student-notes/${editing.id}`, body);
      else await api.post('/student-notes', body);

      setFlash('تم حفظ الملاحظة');
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
      await api.delete(`/student-notes/${deleting.id}`);
      setFlash('تم حذف الملاحظة');
      setDeleting(null);
      await list.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        title="ملاحظات الطلاب"
        subtitle="الملاحظات الإيجابية والسلبية المسجّلة على الطلاب، وتظهر في لوحة الطالب فور حفظها."
        action={can.create && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setError(null);
              setEditing({ student_id: '', subject_id: '', type: 'positive', title: '', body: '', noted_on: new Date().toISOString().slice(0, 10) });
            }}
          >
            <Icon name="plus" size={16} />
            إضافة ملاحظة
          </button>
        )}
      />

      {flash && <div className="alert alert--success">{flash}</div>}

      <div className="filters">
        <Field label="النوع">
          <select className="select" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">الكل</option>
            <option value="positive">إيجابية</option>
            <option value="negative">سلبية</option>
          </select>
        </Field>
      </div>

      <Card>
        {list.loading ? (
          <Loading rows={5} />
        ) : !list.data || list.data.data.length === 0 ? (
          <Empty title="لا توجد ملاحظات مسجّلة" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>النوع</th>
                  <th>الملاحظة</th>
                  <th>المادة</th>
                  <th>كاتبها</th>
                  <th>التاريخ</th>
                  {(can.update || can.delete) && <th>إجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {list.data.data.map((note) => (
                  <tr key={note.id}>
                    <td style={{ fontWeight: 600 }}>{note.student?.full_name}</td>
                    <td>
                      <Badge tone={note.type === 'positive' ? 'success' : 'danger'}>
                        {note.type === 'positive' ? 'إيجابية' : 'سلبية'}
                      </Badge>
                    </td>
                    <td style={{ maxWidth: 380 }}>
                      <div style={{ fontWeight: 600 }}>{note.title}</div>
                      <div className="person__sub">{note.body}</div>
                    </td>
                    <td>{note.subject?.name ?? '—'}</td>
                    <td>{note.author?.name}</td>
                    <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{dualDate(note.noted_on)}</td>
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
                                  id: note.id,
                                  student_id: note.student_id,
                                  subject_id: note.subject_id ?? '',
                                  type: note.type,
                                  title: note.title,
                                  body: note.body,
                                  noted_on: note.noted_on.slice(0, 10),
                                });
                              }}
                            >
                              <Icon name="pencil" size={14} />
                              تعديل
                            </button>
                          )}
                          {can.delete && (
                            <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleting(note)}>
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
          title={editing.id ? 'تعديل الملاحظة' : 'إضافة ملاحظة'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="submit" form="note-form" className="btn btn--primary" disabled={busy}>
                {busy ? 'جارٍ الحفظ…' : 'حفظ الملاحظة'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>إلغاء</button>
            </>
          }
        >
          {error && !Object.keys(error.errors).length && <div className="alert alert--danger">{error.message}</div>}

          <form id="note-form" onSubmit={save} noValidate>
            <div className="grid-2">
              <Field label="الطالب" error={error?.fieldError('student_id')}>
                <select className="select" value={editing.student_id} onChange={(event) => setEditing({ ...editing, student_id: Number(event.target.value) })} required>
                  <option value="">اختر الطالب</option>
                  {(students.data?.data ?? []).map((student) => (
                    <option key={student.id} value={student.id}>{student.full_name} — {student.student_no}</option>
                  ))}
                </select>
              </Field>

              <Field label="نوع الملاحظة" error={error?.fieldError('type')}>
                <select className="select" value={editing.type} onChange={(event) => setEditing({ ...editing, type: event.target.value as NoteForm['type'] })}>
                  <option value="positive">إيجابية</option>
                  <option value="negative">سلبية</option>
                </select>
              </Field>

              <Field label="المادة" error={error?.fieldError('subject_id')}>
                <select className="select" value={editing.subject_id} onChange={(event) => setEditing({ ...editing, subject_id: event.target.value ? Number(event.target.value) : '' })}>
                  <option value="">غير مرتبطة بمادة</option>
                  {(options.data?.subjects ?? []).map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select>
              </Field>

              <Field label="التاريخ" error={error?.fieldError('noted_on')}>
                <input className="input" type="date" value={editing.noted_on} onChange={(event) => setEditing({ ...editing, noted_on: event.target.value })} required />
              </Field>
            </div>

            <Field label="العنوان" error={error?.fieldError('title')}>
              <input className="input" value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} required />
            </Field>

            <Field label="نص الملاحظة" error={error?.fieldError('body')}>
              <textarea className="textarea" value={editing.body} onChange={(event) => setEditing({ ...editing, body: event.target.value })} required />
            </Field>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDelete label={`ملاحظة «${deleting.title}»`} busy={busy} onConfirm={() => void remove()} onClose={() => setDeleting(null)} />
      )}
    </>
  );
}
