'use client';

import { useApi } from '@/lib/useApi';
import { DAYS, PERIODS, num } from '@/lib/format';
import { Card, Empty, Loading, PageHead } from '@/components/ui';
import type { ScheduleSlot } from '@/lib/types';

export default function MySchedulePage() {
  const { data, loading } = useApi<{ slots: ScheduleSlot[] }>('/me/schedule');

  if (loading) return <Loading rows={6} />;

  const byCell = new Map<string, ScheduleSlot>();
  for (const slot of data?.slots ?? []) byCell.set(`${slot.day_of_week}-${slot.period}`, slot);

  return (
    <>
      <PageHead title="جدولي الأسبوعي" subtitle="جدول حصص فصلك كما اعتمدته الإدارة." />

      <Card>
        {(data?.slots.length ?? 0) === 0 ? (
          <Empty title="لم يُعتمد جدول لفصلك بعد" />
        ) : (
          <div className="card__body table-wrap">
            <table className="timetable">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>الحصة</th>
                  {DAYS.map((day) => <th key={day}>{day}</th>)}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period) => (
                  <tr key={period}>
                    <th>{num(period)}</th>
                    {DAYS.map((_, dayIndex) => {
                      const slot = byCell.get(`${dayIndex}-${period}`);

                      return (
                        <td key={dayIndex}>
                          {slot ? (
                            <div className="slot">
                              <strong>{slot.subject?.name}</strong>
                              <span>{slot.teacher?.user.name}</span>
                            </div>
                          ) : (
                            <div className="slot--empty" />
                          )}
                        </td>
                      );
                    })}
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
