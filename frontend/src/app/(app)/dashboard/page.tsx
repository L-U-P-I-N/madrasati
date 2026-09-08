'use client';

import Link from 'next/link';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { num, relative, dualDate } from '@/lib/format';
import { Card, Empty, Loading, PageHead } from '@/components/ui';
import type { ActivityLogItem, NewsItem, StatCard } from '@/lib/types';

interface DashboardData {
  greeting: string;
  role_label: string;
  stats: StatCard[];
  latest_news: NewsItem[];
  recent_activity: ActivityLogItem[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading } = useApi<DashboardData>('/dashboard');

  if (loading) return <Loading rows={6} />;
  if (!data) return <Empty title="تعذّر تحميل اللوحة" />;

  return (
    <>
      <PageHead title={data.greeting} subtitle={`لوحة ${data.role_label} — ملخص حالة المدرسة اليوم`} />

      <div className="stat-grid">
        {data.stats.map((stat) => (
          <article className="stat" key={stat.key}>
            <div className="stat__value">{typeof stat.value === 'number' ? num(stat.value) : stat.value}</div>
            <div className="stat__label">{stat.label}</div>
            {stat.hint && <div className="stat__hint">{stat.hint}</div>}
          </article>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: user?.permissions?.activity_log?.view ? '1.4fr 1fr' : '1fr', gap: 'var(--space-6)' }}>
        <Card title="آخر الأخبار والأنشطة" action={<Link href="/news" className="btn btn--ghost btn--sm">عرض الكل</Link>}>
          {data.latest_news.length === 0 ? (
            <Empty title="لا توجد أخبار منشورة بعد" />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <tbody>
                  {data.latest_news.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link href={`/news/${item.id}`} style={{ fontWeight: 600 }}>{item.title}</Link>
                        {item.excerpt && <div className="person__sub" style={{ marginTop: 2 }}>{item.excerpt}</div>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-3)', fontSize: 12.5 }}>
                        {dualDate(item.published_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {user?.permissions?.activity_log?.view && (
          <Card title="آخر العمليات" action={<Link href="/activity-log" className="btn btn--ghost btn--sm">السجل</Link>}>
            {data.recent_activity.length === 0 ? (
              <Empty title="لا توجد عمليات مسجّلة" />
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {data.recent_activity.map((log) => (
                  <li key={log.id} style={{ padding: 'var(--space-3) var(--space-6)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13.5 }}>{log.description}</div>
                    <div className="person__sub">{log.user_name} · {relative(log.created_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
