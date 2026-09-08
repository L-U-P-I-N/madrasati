'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { Badge, Card, Empty, Loading, PageHead, Unauthorized } from '@/components/ui';

interface ShowData {
  user: { id: number; name: string; username: string; role: string; role_label: string; is_active: boolean };
  modules: { key: string; label: string; group: string }[];
  levels: { value: number; label: string }[];
  permissions: Record<string, number>;
}

export default function PermissionMatrixPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { abilities } = useAuth();
  const can = abilities('permissions');

  const { data, loading, error } = useApi<ShowData>(can.view ? `/permissions/${id}` : null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setDraft({ ...data.permissions });
  }, [data]);

  if (!can.view) return <Unauthorized />;
  if (loading) return <Loading rows={8} />;
  if (error || !data) return <Card><Empty title="تعذّر تحميل صلاحيات هذا المستخدم" /></Card>;

  const loaded = data;
  const dirty = Object.keys(draft).some((key) => draft[key] !== loaded.permissions[key]);

  async function save() {
    setBusy(true);
    setSaveError(null);

    try {
      const result = await api.put<{ message: string; changed: number }>(`/permissions/${id}`, { permissions: draft });
      setFlash(result.message);
      // نحدّث المرجع حتى يعود الزر معطّلا بعد الحفظ
      Object.assign(loaded.permissions, draft);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'تعذّر الحفظ.');
    } finally {
      setBusy(false);
    }
  }

  const groups = [...new Set(loaded.modules.map((module) => module.group))];

  return (
    <>
      <PageHead
        title={`صلاحيات ${data.user.name}`}
        subtitle={`${data.user.role_label} · ${data.user.username} — المستوى المختار يسري فور دخول المستخدم التالي.`}
        action={
          <div className="cell-actions">
            {can.update && (
              <button type="button" className="btn btn--primary" onClick={() => void save()} disabled={!dirty || busy}>
                {busy ? 'جارٍ الحفظ…' : 'حفظ الصلاحيات'}
              </button>
            )}
            <Link href="/permissions" className="btn btn--ghost">العودة للقائمة</Link>
          </div>
        }
      />

      {flash && <div className="alert alert--success">{flash}</div>}
      {saveError && <div className="alert alert--danger">{saveError}</div>}

      <div className="alert alert--info">
        المستويات تراكمية: كل مستوى يشمل ما دونه. «بدون صلاحية» يعني أن القسم لن يظهر في قائمة المستخدم نهائيا.
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        {groups.map((group) => (
          <Card key={group} title={group}>
            <div className="table-wrap">
              <table className="data matrix">
                <thead>
                  <tr>
                    <th style={{ width: 220 }}>القسم / الوحدة</th>
                    <th>مستوى الصلاحية</th>
                    <th style={{ width: 120 }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.modules.filter((module) => module.group === group).map((module) => {
                    const level = draft[module.key] ?? 0;

                    return (
                      <tr key={module.key}>
                        <td style={{ fontWeight: 600 }}>{module.label}</td>
                        <td>
                          <div className="level-pills">
                            {data.levels.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                className={`level-pill ${level === option.value ? 'level-pill--on' : ''}`}
                                disabled={!can.update}
                                onClick={() => setDraft({ ...draft, [module.key]: option.value })}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td>
                          {level === 0
                            ? <Badge tone="muted">مخفي</Badge>
                            : level === 4
                              ? <Badge tone="success">كاملة</Badge>
                              : <Badge tone="info">جزئية</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
