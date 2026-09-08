<?php

namespace App\Http\Controllers;

use App\Models\ScheduleSlot;
use App\Support\ActivityLogger;
use App\Support\Modules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ScheduleSlot::query()
            ->with([
                'classroom:id,name',
                'subject:id,name',
                'teacher.user:id,name',
            ])
            ->when($request->filled('classroom_id'), fn ($q) => $q->where('classroom_id', $request->integer('classroom_id')));

        // المعلم يرى جدوله الخاص فقط
        if ($teacher = $this->currentTeacher()) {
            $query->where('teacher_id', $teacher->id);
        }

        $slots = $query->orderBy('day_of_week')->orderBy('period')->get();

        return response()->json([
            'days' => ScheduleSlot::DAYS,
            'periods' => range(1, 8),
            'slots' => $slots,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $slot = ScheduleSlot::create($data);
        $slot->load('classroom:id,name', 'subject:id,name', 'teacher.user:id,name');

        ActivityLogger::log(
            Modules::SCHEDULE, 'create',
            "أضاف حصة «{$slot->subject->name}» يوم {$slot->day_name} للفصل «{$slot->classroom->name}»",
            $slot
        );

        return response()->json(['slot' => $slot, 'message' => 'تمت إضافة الحصة للجدول'], 201);
    }

    public function update(Request $request, ScheduleSlot $slot): JsonResponse
    {
        $slot->update($this->validated($request, $slot));
        $slot->load('classroom:id,name', 'subject:id,name', 'teacher.user:id,name');

        ActivityLogger::log(
            Modules::SCHEDULE, 'update',
            "عدّل حصة في جدول الفصل «{$slot->classroom->name}»",
            $slot,
            ActivityLogger::diff($slot)
        );

        return response()->json(['slot' => $slot, 'message' => 'تم حفظ التعديلات']);
    }

    public function destroy(ScheduleSlot $slot): JsonResponse
    {
        $slot->delete();

        ActivityLogger::log(Modules::SCHEDULE, 'delete', 'حذف حصة من الجدول الأسبوعي');

        return $this->ok('تم حذف الحصة من الجدول');
    }

    private function validated(Request $request, ?ScheduleSlot $slot = null): array
    {
        $data = $request->validate([
            'classroom_id' => ['required', 'exists:classrooms,id'],
            'subject_id' => ['required', 'exists:subjects,id'],
            'teacher_id' => ['required', 'exists:teachers,id'],
            'day_of_week' => ['required', 'integer', 'between:0,4'],
            'period' => ['required', 'integer', 'between:1,8'],
            'starts_at' => ['nullable', 'date_format:H:i'],
            'ends_at' => ['nullable', 'date_format:H:i', 'after:starts_at'],
        ], [], [
            'classroom_id' => 'الفصل',
            'subject_id' => 'المادة',
            'teacher_id' => 'المعلم',
            'day_of_week' => 'اليوم',
            'period' => 'رقم الحصة',
        ]);

        // خانة واحدة لكل (فصل، يوم، حصة)
        $request->validate([
            'period' => [
                Rule::unique('schedule_slots')
                    ->where(fn ($q) => $q->where('classroom_id', $data['classroom_id'])
                        ->where('day_of_week', $data['day_of_week']))
                    ->ignore($slot),
            ],
        ], ['period.unique' => 'هذه الخانة محجوزة مسبقا في جدول الفصل.']);

        // ولا يُحجز المعلم في فصلين بالوقت نفسه
        $conflict = ScheduleSlot::where('teacher_id', $data['teacher_id'])
            ->where('day_of_week', $data['day_of_week'])
            ->where('period', $data['period'])
            ->when($slot, fn ($q) => $q->whereKeyNot($slot->id))
            ->exists();

        abort_if($conflict, 422, 'المعلم مرتبط بحصة أخرى في اليوم والوقت نفسه.');

        return $data;
    }
}
