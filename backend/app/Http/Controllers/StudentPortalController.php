<?php

namespace App\Http\Controllers;

use App\Models\DailyLesson;
use App\Models\Grade;
use App\Models\News;
use App\Models\ScheduleSlot;
use App\Models\Student;
use App\Models\StudentNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * لوحة الطالب. كل استعلام هنا مربوط بسجل الطالب المرتبط بالحساب،
 * فلا يستطيع الطالب رؤية بيانات غيره حتى لو غيّر المعرّفات في الطلب.
 */
class StudentPortalController extends Controller
{
    private function student(): Student
    {
        $student = $this->user()->student;

        abort_if(! $student, 403, 'هذه اللوحة مخصّصة للطلاب.');

        return $student;
    }

    public function dashboard(): JsonResponse
    {
        $student = $this->student();
        $student->load('classroom:id,name');

        $average = Grade::where('student_id', $student->id)
            ->selectRaw('AVG(score / max_score * 100) as pct')
            ->value('pct');

        return response()->json([
            'student' => $student->only(['id', 'student_no', 'full_name', 'status']),
            'classroom' => $student->classroom?->name,
            'stats' => [
                ['key' => 'average', 'label' => 'المعدل العام', 'value' => $average ? round($average, 1).'%' : '—'],
                ['key' => 'subjects', 'label' => 'الموادّ', 'value' => Grade::where('student_id', $student->id)->distinct('subject_id')->count('subject_id')],
                ['key' => 'notes', 'label' => 'ملاحظاتي', 'value' => StudentNote::where('student_id', $student->id)->count()],
                ['key' => 'today_lessons', 'label' => 'دروس اليوم', 'value' => DailyLesson::where('classroom_id', $student->classroom_id)->whereDate('lesson_date', now())->count()],
            ],
            'latest_news' => News::where('is_published', true)->latest('published_at')->limit(4)
                ->get(['id', 'type', 'title', 'excerpt', 'published_at']),
        ]);
    }

    public function grades(): JsonResponse
    {
        $grades = Grade::where('student_id', $this->student()->id)
            ->with('subject:id,name')
            ->orderBy('term')
            ->get();

        return response()->json([
            'by_subject' => $grades->groupBy(fn (Grade $g) => $g->subject->name)
                ->map(fn ($rows) => [
                    'items' => $rows->map(fn (Grade $g) => [
                        'term' => $g->term,
                        'assessment_type' => $g->assessment_type,
                        'score' => (float) $g->score,
                        'max_score' => (float) $g->max_score,
                        'percentage' => $g->percentage,
                    ]),
                    'total' => round($rows->sum('score'), 2),
                    'out_of' => round($rows->sum('max_score'), 2),
                ]),
        ]);
    }

    public function schedule(): JsonResponse
    {
        $slots = ScheduleSlot::where('classroom_id', $this->student()->classroom_id)
            ->with(['subject:id,name', 'teacher.user:id,name'])
            ->orderBy('day_of_week')->orderBy('period')
            ->get();

        return response()->json([
            'days' => ScheduleSlot::DAYS,
            'periods' => range(1, 8),
            'slots' => $slots,
        ]);
    }

    /** الدروس المعطاة — يظهر فيها ما سجّله المعلمون فور حفظه. */
    public function lessons(Request $request): JsonResponse
    {
        $lessons = DailyLesson::where('classroom_id', $this->student()->classroom_id)
            ->with(['subject:id,name', 'teacher.user:id,name'])
            ->when(
                $request->filled('date'),
                fn ($q) => $q->whereDate('lesson_date', $request->date('date')),
                fn ($q) => $q->whereDate('lesson_date', '>=', now()->subDays(14)),
            )
            ->orderByDesc('lesson_date')->orderBy('period')
            ->get();

        return response()->json(['lessons' => $lessons]);
    }

    public function notes(): JsonResponse
    {
        $notes = StudentNote::where('student_id', $this->student()->id)
            ->with(['author:id,name', 'subject:id,name'])
            ->latest('noted_on')
            ->get();

        return response()->json([
            'positive' => $notes->where('type', 'positive')->values(),
            'negative' => $notes->where('type', 'negative')->values(),
        ]);
    }
}
