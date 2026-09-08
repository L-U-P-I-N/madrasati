'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { Icon } from '@/components/Icon';
import { fullToday, initials } from '@/lib/format';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: 'var(--text-3)' }}>
        جارٍ التحميل…
      </div>
    );
  }

  return (
    <div className="shell">
      <Sidebar />

      <div className="main">
        <header className="topbar">
          <div>
            <div className="topbar__title">مرحبا، {user.name}</div>
            <div className="topbar__meta">{fullToday()}</div>
          </div>

          <div className="topbar__spacer" />

          <NotificationBell />

          <div className="person">
            <span className="avatar">{initials(user.name)}</span>
            <div>
              <div className="person__name" style={{ fontSize: 13.5 }}>{user.name}</div>
              <div className="person__sub">{user.role_label}</div>
            </div>
          </div>

          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void logout()}>
            <Icon name="logout" size={15} />
            خروج
          </button>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
