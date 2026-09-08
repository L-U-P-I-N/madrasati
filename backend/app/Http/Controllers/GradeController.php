<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Models\Student;
use App\Support\ActivityLogger;
use App\Support\Modules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GradeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Grade::query()
            ->with(['student:id,full_name,student_no', 'subject:id,name', 'classroom:id,name'])
            ->when($request->filled('classroom_id'), fn ($q) => $q->where('classroom_id', $request->integer('classroom_id')))
            ->when($request->filled('subject_id'), fn ($q) => $q->where('subject_id', $request->integer('subject_id')))
            ->when($request->filled('term'), fn ($q) => $q->where('term', $request->string('term')));

        if ($teacher = $this->currentTeacher()) {
            $query->where('teacher_id', $teacher->id);
        }

        return response()->json($query->latest('id')->paginate($request->integer('per_page', 25)));
    }

    /**
     * شاشة الرصد: طلاب فصل معيّن في مادة معيّنة مع درجاتهم الحالية —
     * تُستخدم لإدخال الدرجات دفعة واحدة بدل صف صف.
     */
    public function sheet(Request $request): JsonResponse
    {
        $data = $request->validate([
            'classroom_id' => ['required', 'exists:classrooms,id'],
            'subject_id' => ['required', 'exists:subjects,id'],
            'term' => ['required', 'string', 'max:24'],
            'assessment_type' => ['required', 'string', 'max:32'],
        ]);

        if ($guard = $this->guardScope($data)) {
            return $guard;
        }

        $students = Student::where('classroom_id', $data['classroom_id'])
            ->where('status', 'active')
            ->orderBy('full_name')
            ->get(['id', 'student_no', 'full_name']);

        $existing = Grade::where($data)->get()->keyBy('student_id');

        return response()->json([
            'rows' => $students->map(fn ($student) => [
                'student' => $student,
                'grade' => $existing[$student->id] ?? null,
            ]),
        ]);
    }

    /** حفظ ورقة الرصد دفعة واحدة. */
    public function saveSheet(Request $request): JsonResponse
    {
        $data = $request->validate([
            'classroom_id' => ['required', 'exists:classrooms,id'],
            'subject_id' => ['required', 'exists:subjects,id'],
            'term' => ['required', 'string', 'max:24'],
            'assessment_type' => ['required', 'string', 'max:32'],
            'max_score' => ['required', 'numeric', 'min:1', 'max:1000'],
            'scores' => ['required', 'array', 'min:1'],
            'scores.*.student_id' => ['required', 'exists:students,id'],
            'scores.*.score' => ['required', 'numeric', 'min:0'],
            'scores.*.remark' => ['nullable', 'string', 'max:255'],
        ], [], [
            'scores' => 'الدرجات',
            'max_score' => 'الدرجة العظمى',
        ]);

        if ($guard = $this->guardScope($data)) {
            return $guard;
        }

        $teacherId = $this->currentTeacher()?->id ?? $request->integer('teacher_id');
        abort_if(! $teacherId, 422, 'يجب تحديد المعلم المسؤول عن الرصد.');

        $saved = DB::transaction(function () use ($data, $teacherId) {
            $count = 0;

            foreach ($data['scores'] as $row) {
                abort_if($row['score'] > $data['max_score'], 422, 'الدرجة أكبر من الدرجة العظمى.');

                Grade::updateOrCreate([
                    'student_id' => $row['student_id'],
                    'subject_id' => $data['subject_id'],
                    'classroom_id' => $data['classroom_id'],
                    'term' => $data['term'],
                    'assessment_type' => $data['assessment_type'],
                ], [
                    'teacher_id' => $teacherId,
                    'score' => $row['score'],
                    'max_score' => $data['max_score'],
                    'remark' => $row['remark'] ?? null,
                ]);

                $count++;
            }

            return $count;
        });

        ActivityLogger::log(
            Modules::GRADES, 'update',
            "رصد درجات «{$data['assessment_type']}» لعدد {$saved} طالبا",
            null,
            ['term' => $data['term'], 'classroom_id' => $data['classroom_id'], 'subject_id' => $data['subject_id']]
        );

        return $this->ok("تم حفظ درجات {$saved} طالبا بنجاح");
    }

    public function destroy(Grade $grade): JsonResponse
    {
        $grade->delete();

        ActivityLogger::log(Modules::GRADES, 'delete', 'حذف سجل درجة');

        return $this->ok('تم حذف الدرجة');
    }

    private function guardScope(array $data): ?JsonResponse
    {
        $teacher = $this->currentTeacher();

        if (! $teacher) {
            return null;
        }

        $assigned = $teacher->assignments()
            ->where('classroom_id', $data['classroom_id'])
            ->where('subject_id', $data['subject_id'])
            ->exists();

        return $assigned ? null : $this->forbidden('لا ترصد إلا درجات مادتك في فصولك.');
    }
}
