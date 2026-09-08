<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Subject;
use App\Models\TeachingAssignment;
use App\Support\ActivityLogger;
use App\Support\Modules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClassroomController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Classroom::query()
            ->with('homeroomTeacher.user:id,name')
            ->withCount('students')
            ->when($request->filled('q'), fn ($q) => $q->where('name', 'like', '%'.$request->string('q').'%'));

        if ($teacher = $this->currentTeacher()) {
            $query->whereIn('id', $teacher->classroomIds());
        }

        return response()->json($query->orderBy('grade_level')->orderBy('section')->get());
    }

    public function show(Classroom $classroom): JsonResponse
    {
        $classroom->load([
            'students:id,classroom_id,student_no,full_name,status',
            'assignments.subject:id,name',
            'assignments.teacher.user:id,name',
        ]);

        return response()->json(['classroom' => $classroom]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $classroom = Classroom::create($data);

        ActivityLogger::log(Modules::CLASSROOMS, 'create', "أنشأ الفصل «{$classroom->name}»", $classroom);

        return response()->json(['classroom' => $classroom, 'message' => 'تم إنشاء الفصل بنجاح'], 201);
    }

    public function update(Request $request, Classroom $classroom): JsonResponse
    {
        $classroom->update($this->validated($request, $classroom));

        ActivityLogger::log(
            Modules::CLASSROOMS, 'update',
            "عدّل بيانات الفصل «{$classroom->name}»",
            $classroom,
            ActivityLogger::diff($classroom)
        );

        return response()->json(['classroom' => $classroom, 'message' => 'تم حفظ التعديلات']);
    }

    public function destroy(Classroom $classroom): JsonResponse
    {
        if ($classroom->students()->exists()) {
            return response()->json([
                'message' => 'لا يمكن حذف فصل يضم طلابا. انقل الطلاب أولا.',
            ], 422);
        }

        $name = $classroom->name;
        $classroom->delete();

        ActivityLogger::log(Modules::CLASSROOMS, 'delete', "حذف الفصل «{$name}»");

        return $this->ok('تم حذف الفصل');
    }

    /** إسناد معلم لمادة داخل فصل. */
    public function assign(Request $request, Classroom $classroom): JsonResponse
    {
        $data = $request->validate([
            'teacher_id' => ['required', 'exists:teachers,id'],
            'subject_id' => ['required', 'exists:subjects,id'],
        ]);

        $assignment = TeachingAssignment::firstOrCreate([
            'classroom_id' => $classroom->id,
            'teacher_id' => $data['teacher_id'],
            'subject_id' => $data['subject_id'],
        ]);

        $assignment->load('teacher.user:id,name', 'subject:id,name');

        ActivityLogger::log(
            Modules::CLASSROOMS, 'update',
            "أسند مادة «{$assignment->subject->name}» للمعلم «{$assignment->teacher->user->name}» في «{$classroom->name}»",
            $assignment
        );

        return response()->json(['assignment' => $assignment, 'message' => 'تم الإسناد بنجاح'], 201);
    }

    public function unassign(Classroom $classroom, TeachingAssignment $assignment): JsonResponse
    {
        abort_unless($assignment->classroom_id === $classroom->id, 404);

        $assignment->delete();

        ActivityLogger::log(Modules::CLASSROOMS, 'delete', "ألغى إسنادا في الفصل «{$classroom->name}»");

        return $this->ok('تم إلغاء الإسناد');
    }

    /** قوائم مساعدة للنماذج: الأعوام والمواد. */
    public function options(): JsonResponse
    {
        return response()->json([
            'academic_years' => AcademicYear::orderByDesc('is_current')->get(['id', 'name', 'is_current']),
            'subjects' => Subject::orderBy('name')->get(['id', 'name', 'code', 'max_grade']),
        ]);
    }

    private function validated(Request $request, ?Classroom $classroom = null): array
    {
        $data = $request->validate([
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'grade_level' => ['required', 'string', 'max:64'],
            'section' => ['required', 'string', 'max:16'],
            'capacity' => ['required', 'integer', 'min:1', 'max:100'],
            'homeroom_teacher_id' => ['nullable', 'exists:teachers,id'],
        ], [], [
            'grade_level' => 'المرحلة',
            'section' => 'الشعبة',
            'capacity' => 'السعة',
        ]);

        $request->validate([
            'section' => [
                Rule::unique('classrooms')
                    ->where(fn ($q) => $q->where('academic_year_id', $data['academic_year_id'])
                        ->where('grade_level', $data['grade_level']))
                    ->ignore($classroom),
            ],
        ], ['section.unique' => 'هذه الشعبة موجودة مسبقا في المرحلة نفسها.']);

        $data['name'] = "{$data['grade_level']} — {$data['section']}";

        return $data;
    }
}
