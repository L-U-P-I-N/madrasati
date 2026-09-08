'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import { ASSESSMENT_TYPES, TERMS, num, percent } from '@/lib/format';
import { Card, Empty, Field, Loading, PageHead, Unauthorized } from '@/components/ui';
import type { Classroom, Grade, Paginated, Subject } from '@/lib/types';

interface SheetRow {
  student: { id: number; student_no: string; full_name: string };
  grade: Grade | null;
}

export default function GradesPage() {
  const { abilities } = useAuth();
  const can = abilities('grades');

  const classrooms = useApi<Classroom[]>(can.view ? '/classrooms' : null);
  const options = useApi<{ subjects: Subject[] }>(can.view ? '/classrooms/options' : null);

  const [classroomId, setClassroomId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [term, setTerm] = useState(TERMS[0]);
  const [assessment, setAssessment] = useState(ASSESSMENT_TYPES[1]);
  const [maxScore, setMaxScore] = useState(40);

  const ready = Boolean(classroomId && subjectId);
  const sheet = useApi<{ rows: SheetRow[] }>(ready && can.view ? '/grades/sheet' : null, {
    classroom_id: classroomId, subject_id: subjectId, term, assessment_type: assessment,
  });
  const recent = useApi<Paginated<Grade>>(can.view && !ready ? '/grades' : null, { term });

  const [scores, setScores] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState<ApiError | null>(null);

  if (!can.view) return <Unauthorized />;

  function valueFor(row: SheetRow): string {
    if (scores[row.student.id] !== undefined) return scores[row.student.id];
    return row.grade ? String(Number(row.grade.score)) : '';
  }

  async function saveSheet() {
    setBusy(true);
    setError(null);

    try {
      // الحقول الفارغة تُترك كما هي بدل رصدها صفرا
      const rows = (sheet.data?.rows ?? [])
        .map((row) => ({ student_id: row.student.id, raw: valueFor(row) }))
        .filter((row) => row.raw !== '' && !Number.isNaN(Number(row.raw)))
        .map((row) => ({ student_id: row.student_id, score: Number(row.raw) }));

      if (rows.length === 0) {
        throw new ApiError('أدخل درجة واحدة على الأقل قبل الحفظ.', 422);
      }

      await api.post('/grades/sheet', {
        classroom_id: Number(classroomId),
        subject_id: Number(subjectId),
        term,
        assessment_type: assessment,
        max_score: maxScore,
        scores: rows,
      });

      setFlash('تم حفظ الدرجات بنجاح');
      setScores({});
      await sheet.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('تعذّر الحفظ.', 0));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        title="إدارة الدرجات"
        subtitle="رصد درجات الطلاب لكل مادة وفصل ونوع تقييم، مع الاحتفاظ بسجل كامل للتعديلات."
        action={can.update && ready && (
          <button type="button" className="btn btn--primary" onClick={() => void saveSheet()} disabled={busy}>
            {busy ? 'جارٍ الحفظ…' : 'حفظ الدرجات'}
          </button>
        )}
      />

      {flash && <div className="alert alert--success">{flash}</div>}
      {error && <div className="alert alert--danger">{error.message}</div>}

      <div className="filters">
        <Field label="الفصل">
          <select className="select" value={classroomId} onChange={(event) => { setClassroomId(event.target.value); setScores({}); }}>
            <option value="">اختر الفصل</option>
            {(classrooms.data ?? []).map((classroom) => (
              <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
            ))}
          </select>
        </Field>

        <Field label="المادة">
          <select className="select" value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setScores({}); }}>
            <option value="">اختر المادة</option>
            {(options.data?.subjects ?? []).map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </Field>

        <Field label="الفصل الدراسي">
          <select className="select" value={term} onChange={(event) => { setTerm(event.target.value); setScores({}); }}>
            {TERMS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>

        <Field label="نوع التقييم">
          <select className="select" value={assessment} onChange={(event) => { setAssessment(event.target.value); setScores({}); }}>
            {ASSESSMENT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>

        <Field label="الدرجة العظمى">
          <input className="input" type="number" min={1} value={maxScore} onChange={(event) => setMaxScore(Number(event.target.value))} style={{ width: 120 }} />
        </Field>
      </div>

      {!ready ? (
        <Card title={`أحدث الدرجات المرصودة — ${term}`}>
          {recent.loading ? (
            <Loading rows={4} />
          ) : !recent.data || recent.data.data.length === 0 ? (
            <Empty title="اختر فصلا ومادة لبدء الرصد" hint="ستظهر ورقة الرصد بأسماء طلاب الفصل مباشرة." />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>الطالب</th><th>الفصل</th><th>المادة</th><th>نوع التقييم</th><th>الدرجة</th><th>النسبة</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.data.data.map((grade) => (
                    <tr key={grade.id}>
                      <td>{grade.student?.full_name}</td>
                      <td>{grade.classroom?.name}</td>
                      <td>{grade.subject?.name}</td>
                      <td>{grade.assessment_type}</td>
                      <td>{num(Number(grade.score))} / {num(Number(grade.max_score))}</td>
                      <td>{percent((Number(grade.score) / Number(grade.max_score)) * 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card title="ورقة الرصد">
          {sheet.loading ? (
            <Loading rows={5} />
          ) : (sheet.data?.rows.length ?? 0) === 0 ? (
            <Empty title="لا يوجد طلاب نشطون في هذا الفصل" />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>#</th>
                    <th>الطالب</th>
                    <th>رقم الطالب</th>
                    <th style={{ width: 160 }}>الدرجة (من {num(maxScore)})</th>
                    <th>النسبة</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.data!.rows.map((row, index) => {
                    const value = valueFor(row);
                    const pct = value === '' ? null : (Number(value) / maxScore) * 100;

                    return (
                      <tr key={row.student.id}>
                        <td>{num(index + 1)}</td>
                        <td style={{ fontWeight: 600 }}>{row.student.full_name}</td>
                        <td>{row.student.student_no}</td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            min={0}
                            max={maxScore}
                            step="0.5"
                            value={value}
                            disabled={!can.update}
                            onChange={(event) => setScores({ ...scores, [row.student.id]: event.target.value })}
                          />
                        </td>
                        <td>{pct === null ? '—' : percent(pct)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
