<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\StudentNote;
use App\Support\ActivityLogger;
use App\Support\Modules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentNoteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = StudentNote::query()
            ->with(['student:id,full_name,student_no,classroom_id', 'author:id,name', 'subject:id,name'])
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')));

        // المعلم يرى ملاحظات طلابه فقط
        if ($teacher = $this->currentTeacher()) {
            $query->whereHas('student', fn ($q) => $q->whereIn('classroom_id', $teacher->classroomIds()));
        }

        return response()->json($query->latest('noted_on')->paginate($request->integer('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        if ($guard = $this->guardScope((int) $data['student_id'])) {
            return $guard;
        }

        $note = StudentNote::create([...$data, 'author_id' => $this->user()->id]);
        $note->load('student:id,full_name');

        ActivityLogger::log(
            Modules::STUDENT_NOTES, 'create',
            "أضاف ملاحظة {$this->typeLabel($note->type)} على الطالب «{$note->student->full_name}»",
            $note
        );

        return response()->json(['note' => $note, 'message' => 'تم حفظ الملاحظة'], 201);
    }

    public function update(Request $request, StudentNote $note): JsonResponse
    {
        $data = $this->validated($request);

        if ($guard = $this->guardScope((int) $data['student_id'])) {
            return $guard;
        }

        $note->update($data);

        ActivityLogger::log(
            Modules::STUDENT_NOTES, 'update',
            'عدّل ملاحظة على طالب',
            $note,
            ActivityLogger::diff($note)
        );

        return response()->json(['note' => $note, 'message' => 'تم حفظ التعديلات']);
    }

    public function destroy(StudentNote $note): JsonResponse
    {
        $note->delete();

        ActivityLogger::log(Modules::STUDENT_NOTES, 'delete', 'حذف ملاحظة عن طالب');

        return $this->ok('تم حذف الملاحظة');
    }

    private function guardScope(int $studentId): ?JsonResponse
    {
        $teacher = $this->currentTeacher();

        if (! $teacher) {
            return null;
        }

        $inScope = Student::whereKey($studentId)
            ->whereIn('classroom_id', $teacher->classroomIds())
            ->exists();

        return $inScope ? null : $this->forbidden('هذا الطالب خارج نطاق فصولك.');
    }

    private function typeLabel(string $type): string
    {
        return $type === 'positive' ? 'إيجابية' : 'سلبية';
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'student_id' => ['required', 'exists:students,id'],
            'subject_id' => ['nullable', 'exists:subjects,id'],
            'type' => ['required', Rule::in(['positive', 'negative'])],
            'title' => ['required', 'string', 'max:180'],
            'body' => ['required', 'string', 'max:2000'],
            'noted_on' => ['required', 'date'],
        ], [], [
            'student_id' => 'الطالب',
            'type' => 'نوع الملاحظة',
            'title' => 'العنوان',
            'body' => 'نص الملاحظة',
        ]);
    }
}
