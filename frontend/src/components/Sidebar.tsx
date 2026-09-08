'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { GROUP_ORDER, MODULE_ROUTES, STUDENT_MENU } from '@/lib/navigation';
import { Icon } from './Icon';

/**
 * القائمة الجانبية تُبنى من مصفوفة صلاحيات المستخدم:
 * القسم الذي لا يملك عليه صلاحية لا يظهر نهائيا — كأنه غير موجود.
 */
export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const isStudent = user.role === 'student';

  const groups = isStudent
    ? [{ label: '', items: STUDENT_MENU }]
    : GROUP_ORDER.map((group) => ({
        label: group,
        items: user.menu
          .filter((item) => item.group === group && MODULE_ROUTES[item.key])
          .map((item) => ({ href: MODULE_ROUTES[item.key], label: item.label, icon: item.icon })),
      })).filter((group) => group.items.length > 0);

  return (
    <nav className="sidebar" aria-label="القائمة الرئيسية">
      <div className="sidebar__brand">
        <strong>مدرستي</strong>
        <span>MADRASATI</span>
      </div>

      {!isStudent && (
        <div className="sidebar__group">
          <Link
            href="/dashboard"
            className={`nav-item ${pathname === '/dashboard' ? 'nav-item--active' : ''}`}
          >
            <Icon name="home" />
            الرئيسية
          </Link>
        </div>
      )}

      {groups.map((group) => (
        <div className="sidebar__group" key={group.label || 'main'}>
          {group.label && <div className="sidebar__group-label">{group.label}</div>}
          {group.items.map((item) => {
            const active = pathname === item.href || (item.href !== '/me' && pathname.startsWith(`${item.href}/`));

            return (
              <Link key={item.href} href={item.href} className={`nav-item ${active ? 'nav-item--active' : ''}`}>
                <Icon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="sidebar__footer">
        {user.role_label} · {user.name}
      </div>
    </nav>
  );
}
