'use client';

import Link from 'next/link';
import { use } from 'react';
import { useApi } from '@/lib/useApi';
import { dualDate } from '@/lib/format';
import { Badge, Card, Empty, Loading, PageHead } from '@/components/ui';
import type { NewsItem } from '@/lib/types';

export default function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error } = useApi<{ news: NewsItem }>(`/news/${id}`);

  if (loading) return <Loading rows={6} />;
  if (error || !data) return <Card><Empty title="تعذّر العثور على هذا الخبر" /></Card>;

  const item = data.news;

  return (
    <>
      <PageHead
        title={item.title}
        subtitle={`${item.author?.name ?? ''} · ${dualDate(item.published_at ?? item.created_at)}`}
        action={<Link href="/news" className="btn btn--ghost">العودة للأخبار</Link>}
      />

      <Card>
        <div className="card__body">
          <Badge tone={item.type === 'activity' ? 'info' : 'muted'}>
            {item.type === 'activity' ? 'نشاط مدرسي' : 'خبر مدرسي'}
          </Badge>

          {item.excerpt && (
            <p style={{ marginTop: 'var(--space-4)', fontSize: 16, color: 'var(--text-2)' }}>{item.excerpt}</p>
          )}

          <div style={{ marginTop: 'var(--space-6)', whiteSpace: 'pre-line', lineHeight: 1.9 }}>
            {item.body}
          </div>
        </div>
      </Card>
    </>
  );
}
