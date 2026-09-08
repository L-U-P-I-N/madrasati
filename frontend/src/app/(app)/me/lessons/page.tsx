'use client';

import { useState } from 'react';
import { useApi } from '@/lib/useApi';
import { dualDate, num } from '@/lib/format';
import { Card, Empty, Field, Loading, PageHead } from '@/components/ui';
import type { DailyLesson } from '@/lib/types';

export default function MyLessonsPage() {
  const [date, setDate] = useState('');
  const { data, loading } = useApi<{ lessons: DailyLesson[] }>('/me/lessons', { date });

  return (
    <>
      <PageHead title="الدروس المعطاة" subtitle="ما دُرّس فعليا في حصص فصلك، يظهر فور تسجيل المعلم للحصة." />

      <div className="filters">
        <Field label="التاريخ" hint="اتركه فارغا لعرض آخر أسبوعين">
          <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
      </div>

      {loading ? (
        <Loading rows={5} />
      ) : (data?.lessons.length ?? 0) === 0 ? (
        <Card><Empty title="لا توجد دروس مسجّلة في هذه الفترة" /></Card>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {data!.lessons.map((lesson) => (
            <article className="card" key={lesson.id}>
              <div className="card__body">
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ color: 'var(--navy)' }}>{lesson.subject?.name}</strong>
                  <span className="person__sub">الحصة {num(lesson.period)} · {lesson.teacher?.user.name}</span>
                  <span style={{ marginInlineStart: 'auto', fontSize: 12.5, color: 'var(--text-3)' }}>{dualDate(lesson.lesson_date)}</span>
                </div>

                <h3 style={{ marginTop: 'var(--space-3)' }}>{lesson.title}</h3>
                <p style={{ marginTop: 'var(--space-2)', color: 'var(--text-2)', whiteSpace: 'pre-line' }}>{lesson.content}</p>

                {lesson.homework && (
                  <div className="alert alert--info" style={{ marginTop: 'var(--space-4)', marginBottom: 0 }}>
                    الواجب: {lesson.homework}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
