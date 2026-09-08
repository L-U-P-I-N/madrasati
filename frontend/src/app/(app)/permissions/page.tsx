'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { dateTime, initials, num } from '@/lib/format';
import { Badge, Card, Empty, Field, Loading, Modal, PageHead, Unauthorized } from '@/components/ui';
import { Icon } from '@/components/Icon';

interface StaffUser {
  id: number;
  name: string;
  username: string;
  role: string;
  role_label: string;
  is_active: boolean;
  last_login_at: string | null;
  active_modules_count: number;
}

interface IndexData {
  users: StaffUser[];
  modules: { key: string; label: string; group: string }[];
  levels: { value: number; label: string }[];
}

interface StaffForm {
  name: string;
  username: string;
  password: string;
  email: string;
  phone: string;
  role: 'vice_principal' | 'secretary';
}

const EMPTY: StaffForm = { name: '', username: '', password: '', email: '', phone: '', role: 'vice_principal' };

export default function PermissionsPage() {
  const { abilities } = useAuth();
  const can = abilities('permissions');
  const { data, loading, reload } = useApi<IndexData>(can.view ? '/permissions' : null);

  const [creating, setCreating] = useState<StaffForm | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');

  if (!can.view) return <Unauthorized />;

  async function createStaff(event: React.FormEvent) {
    event.preventDefault();
    if (!creating) return;

    setBusy(true);
    setError(null);

    try {
      await api.post('/permissions/staff', creating);
      setFlash('تم إنشاء الحساب بالصلاحيات الافتراضية للدور');
      setCreating(null);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('تعذّر الإنشاء.', 0));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(user: StaffUser) {
    setBusy(true);

    try {
      const result = await api.post<{ message: string }>(`/permissions/${user.id}/toggle-active`);
      setFlash(result.message);
      await reload();
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : 'تعذّر تنفيذ الإجراء.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        title="إدارة الصلاحيات"
        subtitle="مدير المدرسة وحده يمنح الصلاحيات أو يسحبها. القسم الذي لا صلاحية عليه لا يظهر للمستخدم نهائيا."
        action={can.create && (
          <button type="button" className="btn btn--primary" onClick={() => { setCreating({ ...EMPTY }); setError(null); }}>
            <Icon name="plus" size={16} />
            إنشاء مسؤول إداري
          </button>
        )}
      />

      {flash && <div className="alert alert--success">{flash}</div>}

      <Card>
        {loading ? (
          <Loading rows={5} />
        ) : !data || data.users.length === 0 ? (
          <Empty title="لا يوجد مسؤولون إداريون" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>الدور</th>
                  <th>الأقسام المصرّح بها</th>
                  <th>آخر دخول</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="person">
                        <span className="avatar">{initials(user.name)}</span>
                        <div>
                          <div className="person__name">{user.name}</div>
                          <div className="person__sub">{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td><Badge tone="info">{user.role_label}</Badge></td>
                    <td>{num(user.active_modules_count)} من {num(data.modules.length)}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{user.last_login_at ? dateTime(user.last_login_at) : 'لم يسجّل الدخول بعد'}</td>
                    <td>
                      <Badge tone={user.is_active ? 'success' : 'danger'}>{user.is_active ? 'نشط' : 'موقوف'}</Badge>
                    </td>
                    <td>
                      <div className="cell-actions">
                        <Link href={`/permissions/${user.id}`} className="btn btn--secondary btn--sm">
                          <Icon name="shield" size={14} />
                          ضبط الصلاحيات
                        </Link>
                        {can.update && (
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void toggle(user)} disabled={busy}>
                            {user.is_active ? 'إيقاف' : 'تفعيل'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {creating && (
        <Modal
          title="إنشاء مسؤول إداري"
          onClose={() => setCreating(null)}
          footer={
            <>
              <button type="submit" form="staff-form" className="btn btn--primary" disabled={busy}>
                {busy ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setCreating(null)}>إلغاء</button>
            </>
          }
        >
          {error && !Object.keys(error.errors).length && <div className="alert alert--danger">{error.message}</div>}
          <div className="alert alert--info">يُنشأ الحساب بالصلاحيات الافتراضية للدور، ويمكنك تعديلها بالتفصيل بعد الإنشاء.</div>

          <form id="staff-form" onSubmit={createStaff} noValidate>
            <div className="grid-2">
              <Field label="الاسم" error={error?.fieldError('name')}>
                <input className="input" value={creating.name} onChange={(event) => setCreating({ ...creating, name: event.target.value })} required />
              </Field>

              <Field label="الدور" error={error?.fieldError('role')}>
                <select className="select" value={creating.role} onChange={(event) => setCreating({ ...creating, role: event.target.value as StaffForm['role'] })}>
                  <option value="vice_principal">نائب المدير</option>
                  <option value="secretary">السكرتير / الإداري</option>
                </select>
              </Field>

              <Field label="اسم المستخدم" error={error?.fieldError('username')}>
                <input className="input" value={creating.username} onChange={(event) => setCreating({ ...creating, username: event.target.value })} required />
              </Field>

              <Field label="كلمة المرور" hint="٨ محارف على الأقل" error={error?.fieldError('password')}>
                <input className="input" type="password" value={creating.password} onChange={(event) => setCreating({ ...creating, password: event.target.value })} required />
              </Field>

              <Field label="البريد الإلكتروني" error={error?.fieldError('email')}>
                <input className="input" type="email" value={creating.email} onChange={(event) => setCreating({ ...creating, email: event.target.value })} />
              </Field>

              <Field label="الجوال" error={error?.fieldError('phone')}>
                <input className="input" value={creating.phone} onChange={(event) => setCreating({ ...creating, phone: event.target.value })} />
              </Field>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
