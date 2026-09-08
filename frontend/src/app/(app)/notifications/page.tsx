'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { dateTime, num } from '@/lib/format';
import { Badge, Card, Empty, Field, Loading, PageHead, Unauthorized } from '@/components/ui';
import type { AppNotification } from '@/lib/types';

export default function NotificationsPage() {
  const { abilities } = useAuth();
  const can = abilities('notifications');

  const list = useApi<{ unread: number; notifications: AppNotification[] }>(can.view ? '/notifications' : null, { limit: 50 });

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState<ApiError | null>(null);

  if (!can.view) return <Unauthorized />;

  async function broadcast(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const result = await api.post<{ message: string }>('/notifications/broadcast', { title, body });
      setFlash(result.message);
      setTitle('');
      setBody('');
      await list.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('تعذّر الإرسال.', 0));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        title="إدارة الإشعارات"
        subtitle="الإشعارات الواردة إليك، وإرسال إشعار عام لجميع الحسابات النشطة."
      />

      {flash && <div className="alert alert--success">{flash}</div>}

      {can.create && (
        <Card title="إرسال إشعار عام">
          <div className="card__body">
            {error && !Object.keys(error.errors).length && <div className="alert alert--danger">{error.message}</div>}

            <form onSubmit={broadcast} noValidate>
              <Field label="عنوان الإشعار" error={error?.fieldError('title')}>
                <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
              </Field>

              <Field label="نص الإشعار" error={error?.fieldError('body')}>
                <textarea className="textarea" style={{ minHeight: 80 }} value={body} onChange={(event) => setBody(event.target.value)} />
              </Field>

              <button type="submit" className="btn btn--primary" disabled={busy || !title.trim()}>
                {busy ? 'جارٍ الإرسال…' : 'إرسال لجميع المستخدمين'}
              </button>
            </form>
          </div>
        </Card>
      )}

      <div style={{ height: 'var(--space-6)' }} />

      <Card title={`إشعاراتي — ${num(list.data?.unread ?? 0)} غير مقروء`}>
        {list.loading ? (
          <Loading rows={5} />
        ) : (list.data?.notifications.length ?? 0) === 0 ? (
          <Empty title="لا توجد إشعارات" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <tbody>
                {list.data!.notifications.map((notification) => (
                  <tr key={notification.id}>
                    <td style={{ width: 90 }}>
                      {notification.read_at ? <Badge tone="muted">مقروء</Badge> : <Badge tone="info">جديد</Badge>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{notification.title}</div>
                      {notification.body && <div className="person__sub">{notification.body}</div>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12.5, color: 'var(--text-2)' }}>{dateTime(notification.created_at)}</td>
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
