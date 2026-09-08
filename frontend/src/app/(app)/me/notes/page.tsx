'use client';

import { useApi } from '@/lib/useApi';
import { dualDate } from '@/lib/format';
import { Badge, Card, Empty, Loading, PageHead } from '@/components/ui';
import type { StudentNote } from '@/lib/types';

function NoteList({ notes, tone }: { notes: StudentNote[]; tone: 'success' | 'danger' }) {
  if (notes.length === 0) return <Empty title="لا توجد ملاحظات" />;

  return (
    <div className="table-wrap">
      <table className="data">
        <tbody>
          {notes.map((note) => (
            <tr key={note.id}>
              <td>
                <div style={{ fontWeight: 600 }}>{note.title}</div>
                <div className="person__sub">{note.body}</div>
                <div className="person__sub" style={{ marginTop: 4 }}>
                  {note.author?.name}{note.subject ? ` · ${note.subject.name}` : ''}
                </div>
              </td>
              <td style={{ whiteSpace: 'nowrap', width: 200 }}>
                <Badge tone={tone}>{tone === 'success' ? 'إيجابية' : 'سلبية'}</Badge>
                <div className="person__sub" style={{ marginTop: 4 }}>{dualDate(note.noted_on)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MyNotesPage() {
  const { data, loading } = useApi<{ positive: StudentNote[]; negative: StudentNote[] }>('/me/notes');

  if (loading) return <Loading rows={5} />;

  return (
    <>
      <PageHead title="ملاحظاتي" subtitle="الملاحظات التي سجّلها معلموك عليك خلال الفصل." />

      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <Card title="الملاحظات الإيجابية">
          <NoteList notes={data?.positive ?? []} tone="success" />
        </Card>

        <Card title="الملاحظات السلبية">
          <NoteList notes={data?.negative ?? []} tone="danger" />
        </Card>
      </div>
    </>
  );
}
