<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\User;
use App\Support\ActivityLogger;
use App\Support\Modules;
use App\Support\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Student::query()
            ->with('classroom:id,name,grade_level,section')
            ->search($request->string('q')->toString())
            ->when($request->filled('classroom_id'), fn ($q) => $q->where('classroom_id', $request->integer('classroom_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')));

        // المعلم يرى طلاب فصوله فقط
        if ($teacher = $this->currentTeacher()) {
            $query->whereIn('classroom_id', $teacher->classroomIds());
        }

        return response()->json(
            $query->latest('id')->paginate($request->integer('per_page', 15))
        );
    }

    public function show(Student $student): JsonResponse
    {
        if ($teacher = $this->currentTeacher()) {
            if (! in_array($student->classroom_id, $teacher->classroomIds(), true)) {
                return $this->forbidden('هذا الطالب خارج نطاق فصولك.');
            }
        }

        $student->load([
            'classroom:id,name',
            'grades.subject:id,name',
            'notes.author:id,name',
        ]);

        return response()->json(['student' => $student]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $student = DB::transaction(function () use ($data) {
            // حساب دخول للطالب يُنشأ تلقائيا برقم الطالب كاسم مستخدم
            $user = User::create([
                'name' => $data['full_name'],
                'username' => $data['student_no'],
                'password' => $data['student_no'].'@madrasati',
                'role' => Role::STUDENT,
                'is_active' => true,
            ]);

            return Student::create([...$data, 'user_id' => $user->id]);
        });

        ActivityLogger::log(
            Modules::STUDENTS, 'create',
            "أضاف الطالب «{$student->full_name}» برقم {$student->student_no}",
            $student
        );

        return response()->json(['student' => $student, 'message' => 'تم حفظ بيانات الطالب بنجاح'], 201);
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        $student->update($this->validated($request, $student));

        ActivityLogger::log(
            Modules::STUDENTS, 'update',
            "عدّل بيانات الطالب «{$student->full_name}»",
            $student,
            ActivityLogger::diff($student)
        );

        return response()->json(['student' => $student, 'message' => 'تم حفظ التعديلات']);
    }

    public function destroy(Student $student): JsonResponse
    {
        $name = $student->full_name;
        $student->delete();

        ActivityLogger::log(Modules::STUDENTS, 'delete', "حذف سجل الطالب «{$name}»");

        return $this->ok('تم حذف سجل الطالب');
    }

    private function validated(Request $request, ?Student $student = null): array
    {
        return $request->validate([
            'student_no' => ['required', 'string', 'max:32', Rule::unique('students')->ignore($student)],
            'full_name' => ['required', 'string', 'max:150'],
            'classroom_id' => ['nullable', 'exists:classrooms,id'],
            'national_id' => ['nullable', 'string', 'max:32'],
            'birth_date' => ['nullable', 'date'],
            'guardian_name' => ['nullable', 'string', 'max:150'],
            'guardian_phone' => ['nullable', 'string', 'max:32'],
            'status' => ['required', Rule::in(['active', 'pending', 'withdrawn'])],
            'enrolled_on' => ['nullable', 'date'],
            'address' => ['nullable', 'string', 'max:500'],
        ], [], [
            'student_no' => 'رقم الطالب',
            'full_name' => 'اسم الطالب',
            'classroom_id' => 'الفصل',
            'status' => 'الحالة',
        ]);
    }
}
