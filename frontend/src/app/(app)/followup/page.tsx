'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { TERMS, num } from '@/lib/format';
import { Card, ConfirmDelete, Empty, Field, Loading, Modal, PageHead, Unauthorized } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { Classroom, FollowupEntry, Paginated, Subject } from '@/lib/types';

interface EntryForm {
  id?: number;
  subject_id: number | '';
  classroom_id: number | '';
  term: string;
  month: number;
  objectives: string;
  planned_lessons: string;
  achievements: string;
}

const EMPTY: EntryForm = { subject_id: '', classroom_id: '', term: TERMS[0], month: 1, objectives: '', planned_lessons: '', achievements: '' };

export default function FollowupPage() {
  const { abilities } = useAuth();
  const can = abilities('followup');

  const list = useApi<Paginated<FollowupEntry>>(can.view ? '/followup' : null);
  const classrooms = useApi<Classroom[]>(can.view ? '/classrooms' : null);
  const options = useApi<{ subjects: Subject[] }>(can.view ? '/classrooms/options' : null);

  const [editing, setEditing] = useState<EntryForm | null>(null);
  const [deleting, setDeleting] = useState<FollowupEntry | null>(null);
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
      if (editing.id) await api.put(`/followup/${editing.id}`, editing);
      else await api.post('/followup', editing);

      setFlash('تم حفظ خطة المتابعة');
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
      await api.delete(`/followup/${deleting.id}`);
      setFlash('تم حذف الخطة');
      setDeleting(null);
      await list.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        title="دفتر المتابعة"
        subtitle="أهداف المنهج الشهرية والدروس المخطط لها لكل مادة وفصل."
        action={can.create && (
          <button type="button" className="btn btn--primary" onClick={() => { setEditing({ ...EMPTY }); setError(null); }}>
            <Icon name="plus" size={16} />
            إضافة خطة
          </button>
        )}
      />

      {flash && <div className="alert alert--success">{flash}</div>}

      {list.loading ? (
        <Loading rows={5} />
      ) : !list.data || list.data.data.length === 0 ? (
        <Card><Empty title="لا توجد خطط مسجّلة في الدفتر" /></Card>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {list.data.data.map((entry) => (
            <Card
              key={entry.id}
              title={`${entry.subject?.name} — ${entry.classroom?.name} · الشهر ${num(entry.month)}`}
              action={
                <div className="cell-actions">
                  {can.update && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        setError(null);
                        setEditing({
                          id: entry.id,
                          subject_id: entry.subject_id,
                          classroom_id: entry.classroom_id,
                          term: entry.term,
                          month: entry.month,
                          objectives: entry.objectives,
                          planned_lessons: entry.planned_lessons,
                          achievements: entry.achievements ?? '',
                        });
                      }}
                    >
                      <Icon name="pencil" size={14} />
                      تعديل
                    </button>
                  )}
                  {can.delete && (
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleting(entry)}>
                      <Icon name="trash" size={14} />
                      حذف
                    </button>
                  )}
                </div>
              }
            >
              <div className="card__body grid-2" style={{ gap: 'var(--space-6)' }}>
                <div>
                  <h4 style={{ fontSize: 13.5, color: 'var(--text-3)' }}>أهداف المنهج</h4>
                  <p style={{ whiteSpace: 'pre-line', marginTop: 'var(--space-2)' }}>{entry.objectives}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: 13.5, color: 'var(--text-3)' }}>الدروس المخططة</h4>
                  <p style={{ whiteSpace: 'pre-line', marginTop: 'var(--space-2)' }}>{entry.planned_lessons}</p>
                </div>
                {entry.achievements && (
                  <div>
                    <h4 style={{ fontSize: 13.5, color: 'var(--text-3)' }}>ما تحقق</h4>
                    <p style={{ whiteSpace: 'pre-line', marginTop: 'var(--space-2)' }}>{entry.achievements}</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'تعديل خطة المتابعة' : 'إضافة خطة متابعة'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="submit" form="followup-form" className="btn btn--primary" disabled={busy}>
                {busy ? 'جارٍ الحفظ…' : 'حفظ الخطة'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>إلغاء</button>
            </>
          }
        >
          {error && !Object.keys(error.errors).length && <div className="alert alert--danger">{error.message}</div>}

          <form id="followup-form" onSubmit={save} noValidate>
            <div className="grid-2">
              <Field label="المادة" error={error?.fieldError('subject_id')}>
                <select className="select" value={editing.subject_id} onChange={(event) => setEditing({ ...editing, subject_id: Number(event.target.value) })} required>
                  <option value="">اختر المادة</option>
                  {(options.data?.subjects ?? []).map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select>
              </Field>

              <Field label="الفصل" error={error?.fieldError('classroom_id')}>
                <select className="select" value={editing.classroom_id} onChange={(event) => setEditing({ ...editing, classroom_id: Number(event.target.value) })} required>
                  <option value="">اختر الفصل</option>
                  {(classrooms.data ?? []).map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
                </select>
              </Field>

              <Field label="الفصل الدراسي" error={error?.fieldError('term')}>
                <select className="select" value={editing.term} onChange={(event) => setEditing({ ...editing, term: event.target.value })}>
                  {TERMS.map((term) => <option key={term} value={term}>{term}</option>)}
                </select>
              </Field>

              <Field label="الشهر الدراسي" error={error?.fieldError('month')}>
                <select className="select" value={editing.month} onChange={(event) => setEditing({ ...editing, month: Number(event.target.value) })}>
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((month) => (
                    <option key={month} value={month}>الشهر {num(month)}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="أهداف المنهج" error={error?.fieldError('objectives')}>
              <textarea className="textarea" value={editing.objectives} onChange={(event) => setEditing({ ...editing, objectives: event.target.value })} required />
            </Field>

            <Field label="الدروس المخططة" error={error?.fieldError('planned_lessons')}>
              <textarea className="textarea" value={editing.planned_lessons} onChange={(event) => setEditing({ ...editing, planned_lessons: event.target.value })} required />
            </Field>

            <Field label="ما تحقق فعليا" error={error?.fieldError('achievements')}>
              <textarea className="textarea" style={{ minHeight: 70 }} value={editing.achievements} onChange={(event) => setEditing({ ...editing, achievements: event.target.value })} />
            </Field>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDelete label="هذه الخطة" busy={busy} onConfirm={() => void remove()} onClose={() => setDeleting(null)} />
      )}
    </>
  );
}
