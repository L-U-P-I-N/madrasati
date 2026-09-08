'use client';

import { useApi } from '@/lib/useApi';
import { num, percent } from '@/lib/format';
import { Card, Empty, Loading, PageHead } from '@/components/ui';

interface GradesData {
  by_subject: Record<string, {
    items: { term: string; assessment_type: string; score: number; max_score: number; percentage: number }[];
    total: number;
    out_of: number;
  }>;
}

export default function MyGradesPage() {
  const { data, loading } = useApi<GradesData>('/me/grades');

  if (loading) return <Loading rows={6} />;

  const subjects = Object.entries(data?.by_subject ?? {});

  return (
    <>
      <PageHead title="درجاتي" subtitle="درجاتك في كل مادة حسب نوع التقييم والفصل الدراسي." />

      {subjects.length === 0 ? (
        <Card><Empty title="لم تُرصد لك درجات بعد" /></Card>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {subjects.map(([subject, group]) => (
            <Card
              key={subject}
              title={subject}
              action={
                <span style={{ fontWeight: 700, color: 'var(--navy)' }}>
                  {num(group.total)} / {num(group.out_of)} · {percent((group.total / group.out_of) * 100)}
                </span>
              }
            >
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr><th>الفصل الدراسي</th><th>نوع التقييم</th><th>الدرجة</th><th>النسبة</th></tr>
                  </thead>
                  <tbody>
                    {group.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.term}</td>
                        <td>{item.assessment_type}</td>
                        <td>{num(item.score)} / {num(item.max_score)}</td>
                        <td>{percent(item.percentage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
