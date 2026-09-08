'use client';

import Link from 'next/link';
import { useApi } from '@/lib/useApi';
import { dualDate, num } from '@/lib/format';
import { Card, Empty, Loading, PageHead } from '@/components/ui';
import type { NewsItem, StatCard } from '@/lib/types';

interface PortalData {
  student: { id: number; student_no: string; full_name: string; status: string };
  classroom: string | null;
  stats: StatCard[];
  latest_news: NewsItem[];
}

export default function StudentDashboardPage() {
  const { data, loading, error } = useApi<PortalData>('/me/dashboard');

  if (loading) return <Loading rows={6} />;
  if (error || !data) return <Card><Empty title="هذه اللوحة مخصّصة للطلاب" /></Card>;

  return (
    <>
      <PageHead
        title={`مرحبا، ${data.student.full_name}`}
        subtitle={`${data.classroom ?? 'بدون فصل'} · رقم الطالب ${data.student.student_no}`}
      />

      <div className="stat-grid">
        {data.stats.map((stat) => (
          <article className="stat" key={stat.key}>
            <div className="stat__value">{typeof stat.value === 'number' ? num(stat.value) : stat.value}</div>
            <div className="stat__label">{stat.label}</div>
          </article>
        ))}
      </div>

      <Card title="آخر الأخبار والأنشطة" action={<Link href="/news" className="btn btn--ghost btn--sm">عرض الكل</Link>}>
        {data.latest_news.length === 0 ? (
          <Empty title="لا توجد أخبار منشورة" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <tbody>
                {data.latest_news.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/news/${item.id}`} style={{ fontWeight: 600 }}>{item.title}</Link>
                      {item.excerpt && <div className="person__sub">{item.excerpt}</div>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12.5, color: 'var(--text-3)' }}>{dualDate(item.published_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
