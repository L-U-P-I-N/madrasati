'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { dualDate, num } from '@/lib/format';
import { Badge, Card, ConfirmDelete, Empty, Field, Loading, Modal, PageHead, Unauthorized } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { NewsItem, Paginated } from '@/lib/types';

interface NewsForm {
  id?: number;
  type: 'news' | 'activity';
  title: string;
  excerpt: string;
  body: string;
  publish: boolean;
}

export default function NewsPage() {
  const { abilities } = useAuth();
  const can = abilities('news');

  const [type, setType] = useState('');
  const list = useApi<Paginated<NewsItem>>(can.view ? '/news' : null, { type });

  const [editing, setEditing] = useState<NewsForm | null>(null);
  const [deleting, setDeleting] = useState<NewsItem | null>(null);
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
      if (editing.id) {
        await api.put(`/news/${editing.id}`, editing);
        setFlash('تم حفظ التعديلات');
      } else {
        const result = await api.post<{ message: string }>('/news', editing);
        setFlash(result.message);
      }

      setEditing(null);
      await list.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('تعذّر الحفظ.', 0));
    } finally {
      setBusy(false);
    }
  }

  async function publish(item: NewsItem) {
    setBusy(true);

    try {
      const result = await api.post<{ message: string }>(`/news/${item.id}/publish`);
      setFlash(result.message);
      await list.reload();
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : 'تعذّر النشر.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);

    try {
      await api.delete(`/news/${deleting.id}`);
      setFlash('تم حذف الخبر');
      setDeleting(null);
      await list.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        title="الأخبار والأنشطة"
        subtitle="عند النشر يصدر إشعار فوري يصل إلى جميع الحسابات النشطة في المنصة."
        action={can.create && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => { setError(null); setEditing({ type: 'news', title: '', excerpt: '', body: '', publish: true }); }}
          >
            <Icon name="plus" size={16} />
            إضافة خبر
          </button>
        )}
      />

      {flash && <div className="alert alert--success">{flash}</div>}

      <div className="filters">
        <Field label="النوع">
          <select className="select" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">الكل</option>
            <option value="news">أخبار</option>
            <option value="activity">أنشطة</option>
          </select>
        </Field>
      </div>

      {list.loading ? (
        <Loading rows={5} />
      ) : !list.data || list.data.data.length === 0 ? (
        <Card><Empty title="لا توجد أخبار منشورة" /></Card>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {list.data.data.map((item) => (
            <article className="card" key={item.id}>
              <div className="card__body">
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <Badge tone={item.type === 'activity' ? 'info' : 'muted'}>
                    {item.type === 'activity' ? 'نشاط مدرسي' : 'خبر مدرسي'}
                  </Badge>
                  {!item.is_published && <Badge tone="warning">مسودة</Badge>}
                  <span style={{ marginInlineStart: 'auto', fontSize: 12.5, color: 'var(--text-3)' }}>
                    {dualDate(item.published_at ?? item.created_at)}
                  </span>
                </div>

                <h2><Link href={`/news/${item.id}`}>{item.title}</Link></h2>
                {item.excerpt && <p style={{ color: 'var(--text-2)', marginTop: 'var(--space-2)' }}>{item.excerpt}</p>}

                <div className="cell-actions" style={{ marginTop: 'var(--space-4)' }}>
                  <Link href={`/news/${item.id}`} className="btn btn--ghost btn--sm">
                    <Icon name="eye" size={14} />
                    عرض التفاصيل
                  </Link>

                  {can.create && !item.is_published && (
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => void publish(item)} disabled={busy}>
                      نشر وإرسال إشعار
                    </button>
                  )}

                  {can.update && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        setError(null);
                        setEditing({ id: item.id, type: item.type, title: item.title, excerpt: item.excerpt ?? '', body: item.body, publish: item.is_published });
                      }}
                    >
                      <Icon name="pencil" size={14} />
                      تعديل
                    </button>
                  )}

                  {can.delete && (
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => setDeleting(item)}>
                      <Icon name="trash" size={14} />
                      حذف
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}

          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
            إجمالي {num(list.data.total)} عنصرا
          </div>
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'تعديل الخبر' : 'إضافة خبر أو نشاط'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="submit" form="news-form" className="btn btn--primary" disabled={busy}>
                {busy ? 'جارٍ الحفظ…' : editing.id ? 'حفظ التعديلات' : editing.publish ? 'نشر وإرسال إشعار' : 'حفظ كمسودة'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>إلغاء</button>
            </>
          }
        >
          {error && !Object.keys(error.errors).length && <div className="alert alert--danger">{error.message}</div>}

          <form id="news-form" onSubmit={save} noValidate>
            <div className="grid-2">
              <Field label="النوع" error={error?.fieldError('type')}>
                <select className="select" value={editing.type} onChange={(event) => setEditing({ ...editing, type: event.target.value as NewsForm['type'] })}>
                  <option value="news">خبر مدرسي</option>
                  <option value="activity">نشاط مدرسي</option>
                </select>
              </Field>

              {!editing.id && (
                <Field label="حالة النشر" hint="النشر يرسل إشعارا فوريا لجميع المستخدمين">
                  <select className="select" value={editing.publish ? '1' : '0'} onChange={(event) => setEditing({ ...editing, publish: event.target.value === '1' })}>
                    <option value="1">نشر مباشرة</option>
                    <option value="0">حفظ كمسودة</option>
                  </select>
                </Field>
              )}
            </div>

            <Field label="العنوان" error={error?.fieldError('title')}>
              <input className="input" value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} required />
            </Field>

            <Field label="الملخص" hint="يظهر في بطاقة الإشعار وقائمة الأخبار" error={error?.fieldError('excerpt')}>
              <input className="input" value={editing.excerpt} onChange={(event) => setEditing({ ...editing, excerpt: event.target.value })} />
            </Field>

            <Field label="التفاصيل" error={error?.fieldError('body')}>
              <textarea className="textarea" style={{ minHeight: 180 }} value={editing.body} onChange={(event) => setEditing({ ...editing, body: event.target.value })} required />
            </Field>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDelete label={`الخبر «${deleting.title}»`} busy={busy} onConfirm={() => void remove()} onClose={() => setDeleting(null)} />
      )}
    </>
  );
}
