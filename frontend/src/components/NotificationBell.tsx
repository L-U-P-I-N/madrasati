'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { relative } from '@/lib/format';
import type { AppNotification } from '@/lib/types';
import { Icon } from './Icon';

/**
 * جرس الإشعارات: نقطة حمراء برقم غير المقروء، ولوحة تعرض ملخص الخبر،
 * والضغط على الإشعار يفتح الخبر كاملا ويُحدّث العدّاد تلقائيا.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ unread: number; notifications: AppNotification[] }>('/notifications', { limit: 15 });
      setUnread(data.unread);
      setItems(data.notifications);
    } catch {
      /* الجرس لا يعطّل الصفحة عند فشل الجلب */
    }
  }, []);

  useEffect(() => {
    void load();
    // استطلاع دوري خفيف يقوم مقام البث الفوري في هذه المرحلة
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function openNotification(notification: AppNotification) {
    setOpen(false);

    if (!notification.read_at) {
      setItems((current) => current.map((item) => (item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item)));
      setUnread((count) => Math.max(0, count - 1));
      await api.post(`/notifications/${notification.id}/read`).catch(() => undefined);
    }

    if (notification.link) router.push(notification.link);
  }

  async function markAll() {
    await api.post('/notifications/read-all');
    setUnread(0);
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button type="button" className="bell" onClick={() => setOpen((value) => !value)} aria-label={`الإشعارات، ${unread} غير مقروء`}>
        <Icon name="bell" size={21} />
        {unread > 0 && <span className="bell__dot">{unread > 99 ? '٩٩+' : new Intl.NumberFormat('ar-SA-u-nu-arab').format(unread)}</span>}
      </button>

      {open && (
        <div className="dropdown">
          <div className="dropdown__head">
            <strong style={{ fontSize: 14 }}>الإشعارات</strong>
            {unread > 0 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={markAll}>
                تعليم الكل كمقروء
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="empty" style={{ padding: 'var(--space-7)' }}>لا توجد إشعارات بعد</div>
          ) : (
            items.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={`notif ${notification.read_at ? '' : 'notif--unread'}`}
                style={{ width: '100%', textAlign: 'inherit', border: 'none', background: 'none', cursor: 'pointer', font: 'inherit' }}
                onClick={() => openNotification(notification)}
              >
                <div className="notif__title">{notification.title}</div>
                {notification.body && <div className="notif__body">{notification.body}</div>}
                <div className="notif__time">{relative(notification.created_at)}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
