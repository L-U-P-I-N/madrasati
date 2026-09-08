<?php

namespace App\Http\Controllers;

use App\Models\DailyLesson;
use App\Support\ActivityLogger;
use App\Support\Modules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyLessonController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = DailyLesson::query()
            ->with(['classroom:id,name', 'subject:id,name', 'teacher.user:id,name'])
            ->when($request->filled('date'), fn ($q) => $q->whereDate('lesson_date', $request->date('date')))
            ->when($request->filled('classroom_id'), fn ($q) => $q->where('classroom_id', $request->integer('classroom_id')));

        // المعلم يسجّل ويرى حصص مادته فقط
        if ($teacher = $this->currentTeacher()) {
            $query->where('teacher_id', $teacher->id);
        }

        return response()->json(
            $query->orderByDesc('lesson_date')->orderBy('period')->paginate($request->integer('per_page', 20))
        );
    }

    /** جدول اليوم للمعلم مع بيان الحصص المسجّلة وغير المسجّلة. */
    public function today(Request $request): JsonResponse
    {
        $teacher = $this->currentTeacher();

        if (! $teacher) {
            return $this->forbidden('هذه الشاشة مخصّصة للمعلمين.');
        }

        $date = $request->date('date') ?? now();
        $dayOfWeek = (int) $date->dayOfWeek; // 0 الأحد

        $slots = $teacher->scheduleSlots()
            ->with(['classroom:id,name', 'subject:id,name'])
            ->where('day_of_week', $dayOfWeek)
            ->orderBy('period')
            ->get();

        $recorded = DailyLesson::where('teacher_id', $teacher->id)
            ->whereDate('lesson_date', $date)
            ->get()
            ->keyBy('schedule_slot_id');

        return response()->json([
            'date' => $date->toDateString(),
            'day_name' => \App\Models\ScheduleSlot::DAYS[$dayOfWeek] ?? 'عطلة',
            'slots' => $slots->map(fn ($slot) => [
                'slot' => $slot,
                'lesson' => $recorded[$slot->id] ?? null,
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        if ($guard = $this->guardScope($data)) {
            return $guard;
        }

        $lesson = DailyLesson::create($data);
        $lesson->load('classroom:id,name', 'subject:id,name');

        ActivityLogger::log(
            Modules::DAILY_LESSONS, 'create',
            "سجّل حصة «{$lesson->subject->name}» للفصل «{$lesson->classroom->name}» بتاريخ {$lesson->lesson_date->toDateString()}",
            $lesson
        );

        return response()->json(['lesson' => $lesson, 'message' => 'تم تسجيل الحصة بنجاح'], 201);
    }

    public function update(Request $request, DailyLesson $lesson): JsonResponse
    {
        $data = $this->validated($request);

        if ($guard = $this->guardScope($data)) {
            return $guard;
        }

        $lesson->update($data);

        ActivityLogger::log(
            Modules::DAILY_LESSONS, 'update',
            "عدّل سجل حصة بتاريخ {$lesson->lesson_date->toDateString()}",
            $lesson,
            ActivityLogger::diff($lesson)
        );

        return response()->json(['lesson' => $lesson, 'message' => 'تم حفظ التعديلات']);
    }

    public function destroy(DailyLesson $lesson): JsonResponse
    {
        $lesson->delete();

        ActivityLogger::log(Modules::DAILY_LESSONS, 'delete', 'حذف سجل حصة يومية');

        return $this->ok('تم حذف سجل الحصة');
    }

    /** المعلم لا يسجّل إلا في فصل ومادة مُسندين إليه. */
    private function guardScope(array $data): ?JsonResponse
    {
        $teacher = $this->currentTeacher();

        if (! $teacher) {
            return null;
        }

        if ((int) $data['teacher_id'] !== $teacher->id) {
            return $this->forbidden('لا يمكن التسجيل باسم معلم آخر.');
        }

        $assigned = $teacher->assignments()
            ->where('classroom_id', $data['classroom_id'])
            ->where('subject_id', $data['subject_id'])
            ->exists();

        return $assigned ? null : $this->forbidden('هذه المادة أو الفصل خارج نطاق إسنادك.');
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'schedule_slot_id' => ['nullable', 'exists:schedule_slots,id'],
            'classroom_id' => ['required', 'exists:classrooms,id'],
            'subject_id' => ['required', 'exists:subjects,id'],
            'teacher_id' => ['nullable', 'exists:teachers,id'],
            'lesson_date' => ['required', 'date'],
            'period' => ['required', 'integer', 'between:1,8'],
            'title' => ['required', 'string', 'max:180'],
            'content' => ['required', 'string', 'max:4000'],
            'homework' => ['nullable', 'string', 'max:2000'],
        ], [], [
            'title' => 'عنوان الدرس',
            'content' => 'ما تم تدريسه',
            'lesson_date' => 'تاريخ الحصة',
        ]);

        $data['teacher_id'] ??= $this->currentTeacher()?->id;

        return $data;
    }
}
