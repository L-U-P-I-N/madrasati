'use client';

import { useState } from 'react';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { dateTime, initials, num } from '@/lib/format';
import { Badge, Card, Empty, Field, Loading, PageHead, Unauthorized } from '@/components/ui';
import type { ActivityLogItem, Paginated } from '@/lib/types';

const ACTION_TONE: Record<string, string> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  publish: 'warning',
  permissions: 'warning',
  login: 'muted',
};

export default function ActivityLogPage() {
  const { abilities } = useAuth();
  const can = abilities('activity_log');

  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const filters = useApi<{ modules: { key: string; label: string }[]; actions: { key: string; label: string }[] }>(
    can.view ? '/activity-logs/filters' : null,
  );
  const list = useApi<Paginated<ActivityLogItem>>(can.view ? '/activity-logs' : null, {
    module, action, q: query, from, to, page,
  });

  if (!can.view) return <Unauthorized />;

  return (
    <>
      <PageHead
        title="سجل العمليات"
        subtitle="مرجع كامل لكل عملية تمت في النظام: من أضاف أو عدّل أو حذف أي بيانات ومتى."
      />

      <div className="filters">
        <Field label="بحث في الوصف">
          <input className="input" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        </Field>

        <Field label="القسم">
          <select className="select" value={module} onChange={(event) => { setModule(event.target.value); setPage(1); }}>
            <option value="">كل الأقسام</option>
            {(filters.data?.modules ?? []).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </Field>

        <Field label="نوع العملية">
          <select className="select" value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}>
            <option value="">الكل</option>
            {(filters.data?.actions ?? []).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </Field>

        <Field label="من تاريخ">
          <input className="input" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
        </Field>

        <Field label="إلى تاريخ">
          <input className="input" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
        </Field>
      </div>

      <Card>
        {list.loading ? (
          <Loading rows={6} />
        ) : !list.data || list.data.data.length === 0 ? (
          <Empty title="لا توجد عمليات مطابقة" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>المستخدم</th>
                    <th>القسم</th>
                    <th>العملية</th>
                    <th>الوصف</th>
                    <th>التاريخ والوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.data.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div className="person">
                          <span className="avatar">{initials(log.user_name)}</span>
                          <div>
                            <div className="person__name">{log.user_name}</div>
                            <div className="person__sub">{log.role_label ?? log.user_role}</div>
                          </div>
                        </div>
                      </td>
                      <td>{log.module_label ?? log.module}</td>
                      <td><Badge tone={ACTION_TONE[log.action] ?? 'muted'}>{log.action}</Badge></td>
                      <td style={{ maxWidth: 460 }}>{log.description}</td>
                      <td style={{ fontSize: 12.5, whiteSpace: 'nowrap', color: 'var(--text-2)' }}>{dateTime(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', padding: 'var(--space-4) var(--space-6)' }}>
              <span style={{ color: 'var(--text-3)', fontSize: 13 }}>
                إجمالي {num(list.data.total)} عملية · صفحة {num(list.data.current_page)} من {num(list.data.last_page)}
              </span>
              <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 'var(--space-2)' }}>
                <button type="button" className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>السابق</button>
                <button type="button" className="btn btn--ghost btn--sm" disabled={page >= list.data.last_page} onClick={() => setPage((value) => value + 1)}>التالي</button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
