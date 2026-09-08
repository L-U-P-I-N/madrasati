<?php

namespace App\Http\Controllers;

use App\Models\FollowupEntry;
use App\Support\ActivityLogger;
use App\Support\Modules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FollowupController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = FollowupEntry::query()
            ->with(['teacher.user:id,name', 'subject:id,name', 'classroom:id,name'])
            ->when($request->filled('classroom_id'), fn ($q) => $q->where('classroom_id', $request->integer('classroom_id')))
            ->when($request->filled('teacher_id'), fn ($q) => $q->where('teacher_id', $request->integer('teacher_id')))
            ->when($request->filled('month'), fn ($q) => $q->where('month', $request->integer('month')));

        // المعلم يكتب دفتر متابعة مادته فقط؛ الإدارة تطّلع على دفاتر الجميع
        if ($teacher = $this->currentTeacher()) {
            $query->where('teacher_id', $teacher->id);
        }

        return response()->json($query->orderByDesc('month')->paginate($request->integer('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        if ($guard = $this->guardScope($data)) {
            return $guard;
        }

        $entry = FollowupEntry::create($data);
        $entry->load('subject:id,name', 'classroom:id,name');

        ActivityLogger::log(
            Modules::FOLLOWUP, 'create',
            "أضاف خطة دفتر متابعة لمادة «{$entry->subject->name}» في «{$entry->classroom->name}»",
            $entry
        );

        return response()->json(['entry' => $entry, 'message' => 'تم حفظ خطة المتابعة'], 201);
    }

    public function update(Request $request, FollowupEntry $entry): JsonResponse
    {
        $data = $this->validated($request);

        if ($guard = $this->guardScope($data)) {
            return $guard;
        }

        $entry->update($data);

        ActivityLogger::log(
            Modules::FOLLOWUP, 'update',
            'عدّل خطة في دفتر المتابعة',
            $entry,
            ActivityLogger::diff($entry)
        );

        return response()->json(['entry' => $entry, 'message' => 'تم حفظ التعديلات']);
    }

    public function destroy(FollowupEntry $entry): JsonResponse
    {
        $entry->delete();

        ActivityLogger::log(Modules::FOLLOWUP, 'delete', 'حذف خطة من دفتر المتابعة');

        return $this->ok('تم حذف الخطة');
    }

    private function guardScope(array $data): ?JsonResponse
    {
        $teacher = $this->currentTeacher();

        if (! $teacher) {
            return null;
        }

        if ((int) $data['teacher_id'] !== $teacher->id) {
            return $this->forbidden('لا يمكن الكتابة في دفتر معلم آخر.');
        }

        return null;
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'teacher_id' => ['nullable', 'exists:teachers,id'],
            'subject_id' => ['required', 'exists:subjects,id'],
            'classroom_id' => ['required', 'exists:classrooms,id'],
            'term' => ['required', 'string', 'max:24'],
            'month' => ['required', 'integer', 'between:1,10'],
            'objectives' => ['required', 'string', 'max:4000'],
            'planned_lessons' => ['required', 'string', 'max:4000'],
            'achievements' => ['nullable', 'string', 'max:4000'],
        ], [], [
            'objectives' => 'أهداف المنهج',
            'planned_lessons' => 'الدروس المخططة',
            'month' => 'الشهر الدراسي',
        ]);

        $data['teacher_id'] ??= $this->currentTeacher()?->id;

        return $data;
    }
}
