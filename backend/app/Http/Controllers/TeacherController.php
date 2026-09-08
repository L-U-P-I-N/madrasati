<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use App\Models\User;
use App\Support\ActivityLogger;
use App\Support\Modules;
use App\Support\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TeacherController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Teacher::query()
            ->with(['user:id,name,username,email,phone,is_active'])
            ->withCount('assignments')
            ->when($request->filled('q'), function ($q) use ($request) {
                $term = $request->string('q')->toString();
                $q->where('employee_no', 'like', "%{$term}%")
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$term}%"));
            });

        return response()->json($query->latest('id')->paginate($request->integer('per_page', 15)));
    }

    public function show(Teacher $teacher): JsonResponse
    {
        $teacher->load([
            'user:id,name,username,email,phone,is_active',
            'assignments.subject:id,name',
            'assignments.classroom:id,name',
        ]);

        return response()->json(['teacher' => $teacher]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'username' => ['required', 'string', 'max:64', 'unique:users,username'],
            'password' => ['required', 'string', 'min:8'],
            'email' => ['nullable', 'email', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:32'],
            'employee_no' => ['required', 'string', 'max:32', 'unique:teachers,employee_no'],
            'specialization' => ['nullable', 'string', 'max:120'],
            'qualification' => ['nullable', 'string', 'max:120'],
            'hired_on' => ['nullable', 'date'],
        ], [], [
            'name' => 'اسم المعلم',
            'username' => 'اسم المستخدم',
            'password' => 'كلمة المرور',
            'employee_no' => 'الرقم الوظيفي',
        ]);

        $teacher = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'username' => $data['username'],
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'] ?? null,
                'password' => $data['password'],
                'role' => Role::TEACHER,
                'is_active' => true,
            ]);

            PermissionController::applyRoleDefaults($user);

            return Teacher::create([
                'user_id' => $user->id,
                'employee_no' => $data['employee_no'],
                'specialization' => $data['specialization'] ?? null,
                'qualification' => $data['qualification'] ?? null,
                'hired_on' => $data['hired_on'] ?? null,
            ]);
        });

        ActivityLogger::log(Modules::TEACHERS, 'create', "أضاف المعلم «{$data['name']}»", $teacher);

        return response()->json(['teacher' => $teacher->load('user'), 'message' => 'تم حفظ بيانات المعلم بنجاح'], 201);
    }

    public function update(Request $request, Teacher $teacher): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['nullable', 'email', Rule::unique('users', 'email')->ignore($teacher->user_id)],
            'phone' => ['nullable', 'string', 'max:32'],
            'is_active' => ['boolean'],
            'employee_no' => ['required', 'string', 'max:32', Rule::unique('teachers')->ignore($teacher)],
            'specialization' => ['nullable', 'string', 'max:120'],
            'qualification' => ['nullable', 'string', 'max:120'],
            'hired_on' => ['nullable', 'date'],
        ]);

        DB::transaction(function () use ($teacher, $data) {
            $teacher->user->update([
                'name' => $data['name'],
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'] ?? null,
                'is_active' => $data['is_active'] ?? true,
            ]);

            $teacher->update([
                'employee_no' => $data['employee_no'],
                'specialization' => $data['specialization'] ?? null,
                'qualification' => $data['qualification'] ?? null,
                'hired_on' => $data['hired_on'] ?? null,
            ]);
        });

        ActivityLogger::log(Modules::TEACHERS, 'update', "عدّل بيانات المعلم «{$data['name']}»", $teacher);

        return response()->json(['teacher' => $teacher->fresh('user'), 'message' => 'تم حفظ التعديلات']);
    }

    public function destroy(Teacher $teacher): JsonResponse
    {
        $name = $teacher->user->name;

        DB::transaction(function () use ($teacher) {
            $user = $teacher->user;
            $teacher->delete();
            $user->delete();
        });

        ActivityLogger::log(Modules::TEACHERS, 'delete', "حذف حساب المعلم «{$name}»");

        return $this->ok('تم حذف سجل المعلم');
    }
}
