'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { Field } from '@/components/ui';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(user.role === 'student' ? '/me' : '/dashboard');
  }, [user, loading, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('تعذّر الاتصال بالخادم.', 0));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      {/* نموذج الدخول إلى اليمين، الرسم المؤسّسي إلى اليسار */}
      <section className="login__form-side">
        <div className="login__form">
          <div className="login__brand">
            <strong>مدرستي</strong>
            <span>MADRASATI</span>
          </div>

          <h1 style={{ marginTop: 'var(--space-9)' }}>مرحبا بعودتك</h1>
          <p style={{ color: 'var(--text-2)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-7)' }}>
            سجّل دخولك للوصول إلى لوحة إدارة المدرسة وأدوات المتابعة اليومية.
          </p>

          {error && !error.fieldError('username') && (
            <div className="alert alert--danger">{error.message}</div>
          )}

          <form onSubmit={onSubmit} noValidate>
            <Field label="اسم المستخدم" error={error?.fieldError('username')}>
              <input
                className={`input ${error?.fieldError('username') ? 'input--invalid' : ''}`}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </Field>

            <Field label="كلمة المرور" error={error?.fieldError('password')}>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>

            {/* زر ذهبي واحد، لا أكثر */}
            <button type="submit" className="btn btn--primary" style={{ width: '100%', marginTop: 'var(--space-2)' }} disabled={busy}>
              {busy ? 'جارٍ التحقق…' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </section>

      <aside className="login__art">
        <h2>منصة متكاملة لإدارة المدرسة</h2>
        <p>متابعة الطلاب، إدارة الفصول، اعتماد الدرجات، وتنظيم الأنشطة — في مكان واحد.</p>

        <div className="login__hints">
          <p>حسابات تجريبية (كلمة المرور الموحّدة: <code>Madrasati@2026</code>)</p>
          <p style={{ marginTop: 'var(--space-2)' }}>
            مدير المدرسة <code>principal</code> · نائب المدير <code>vice</code> · السكرتير <code>secretary</code>
          </p>
          <p>المعلم <code>teacher.majed</code> · الطالب <code>S-02601</code></p>
        </div>
      </aside>
    </main>
  );
}
