<?php

namespace App\Http\Controllers;

use App\Models\ModulePermission;
use App\Models\User;
use App\Support\ActivityLogger;
use App\Support\Modules as M;
use App\Support\PermissionLevel as P;
use App\Support\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PermissionController extends Controller
{
    /**
     * مصفوفة الصلاحيات الافتراضية المقترحة لكل دور، كما وردت في تقرير
     * السيناريو الثالث. مدير المدرسة يستطيع تعديلها بالكامل بعد الإنشاء.
     */
    public static function defaults(): array
    {
        return [
            Role::VICE_PRINCIPAL => [
                M::STUDENTS => P::EDIT,
                M::TEACHERS => P::EDIT,
                M::GRADES => P::VIEW,
                M::CLASSROOMS => P::EDIT,
                M::DAILY_LESSONS => P::VIEW,
                M::SCHEDULE => P::EDIT,
                M::FOLLOWUP => P::VIEW,
                M::NEWS => P::EDIT,
                M::STUDENT_NOTES => P::EDIT,
                M::PERMISSIONS => P::NONE,
                M::ACTIVITY_LOG => P::VIEW,
                M::NOTIFICATIONS => P::CREATE,
            ],
            Role::SECRETARY => [
                M::STUDENTS => P::CREATE,
                M::TEACHERS => P::VIEW,
                M::GRADES => P::NONE,
                M::CLASSROOMS => P::VIEW,
                M::DAILY_LESSONS => P::NONE,
                M::SCHEDULE => P::VIEW,
                M::FOLLOWUP => P::NONE,
                M::NEWS => P::CREATE,
                M::STUDENT_NOTES => P::VIEW,
                M::PERMISSIONS => P::NONE,
                M::ACTIVITY_LOG => P::NONE,
                M::NOTIFICATIONS => P::NONE,
            ],
            // المعلم: صلاحياته مقيدة أصلا بنطاق مادته وفصوله في المتحكمات
            Role::TEACHER => [
                M::STUDENTS => P::VIEW,
                M::TEACHERS => P::NONE,
                M::GRADES => P::EDIT,
                M::CLASSROOMS => P::VIEW,
                M::DAILY_LESSONS => P::EDIT,
                M::SCHEDULE => P::VIEW,
                M::FOLLOWUP => P::EDIT,
                M::NEWS => P::VIEW,
                M::STUDENT_NOTES => P::EDIT,
                M::PERMISSIONS => P::NONE,
                M::ACTIVITY_LOG => P::NONE,
                M::NOTIFICATIONS => P::VIEW,
            ],
            // الطالب: لا يمر بوحدات الإدارة إطلاقا، بل بلوحته الخاصة (/me/*)
            Role::STUDENT => [
                M::NEWS => P::VIEW,
                M::NOTIFICATIONS => P::VIEW,
            ],
        ];
    }

    public static function applyRoleDefaults(User $user, ?User $grantedBy = null): void
    {
        $defaults = self::defaults()[$user->role] ?? [];

        foreach (M::keys() as $module) {
            ModulePermission::updateOrCreate(
                ['user_id' => $user->id, 'module' => $module],
                ['level' => $defaults[$module] ?? P::NONE, 'granted_by' => $grantedBy?->id],
            );
        }

        $user->forgetPermissionCache();
    }

    /** قائمة المسؤولين الإداريين والمعلمين مع ملخص صلاحياتهم. */
    public function index(): JsonResponse
    {
        $users = User::query()
            ->whereIn('role', [Role::VICE_PRINCIPAL, Role::SECRETARY, Role::TEACHER])
            ->withCount(['permissions as active_modules_count' => fn ($q) => $q->where('level', '>', P::NONE)])
            ->orderBy('role')
            ->get(['id', 'name', 'username', 'role', 'is_active', 'last_login_at']);

        $users->each(fn (User $user) => $user->role_label = $user->roleLabel());

        return response()->json([
            'users' => $users,
            'modules' => M::all(),
            'levels' => P::options(),
        ]);
    }

    /** شاشة الصلاحيات المفصّلة لمسؤول واحد. */
    public function show(User $user): JsonResponse
    {
        abort_if($user->isUnrestricted(), 422, 'صلاحيات هذا الدور كاملة بطبيعته ولا تُعدّل.');

        $levels = $user->permissions()->pluck('level', 'module');

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'role' => $user->role,
                'role_label' => $user->roleLabel(),
                'is_active' => $user->is_active,
            ],
            'modules' => M::all(),
            'levels' => P::options(),
            'permissions' => collect(M::keys())
                ->mapWithKeys(fn (string $module) => [$module => (int) ($levels[$module] ?? P::NONE)]),
        ]);
    }

    /** منح أو سحب الصلاحيات — مدير المدرسة وحده يصل إلى هذا الإجراء. */
    public function update(Request $request, User $user): JsonResponse
    {
        abort_if($user->isUnrestricted(), 422, 'لا يمكن تعديل صلاحيات هذا الدور.');

        $data = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['integer', Rule::in([P::NONE, P::VIEW, P::CREATE, P::EDIT, P::FULL])],
        ]);

        $before = $user->permissions()->pluck('level', 'module')->all();
        $changes = [];

        DB::transaction(function () use ($data, $user, $before, &$changes) {
            foreach ($data['permissions'] as $module => $level) {
                if (! in_array($module, M::keys(), true)) {
                    continue;
                }

                if ((int) ($before[$module] ?? P::NONE) !== (int) $level) {
                    $changes[M::label($module)] = [
                        'before' => (int) ($before[$module] ?? P::NONE),
                        'after' => (int) $level,
                    ];
                }

                ModulePermission::updateOrCreate(
                    ['user_id' => $user->id, 'module' => $module],
                    ['level' => $level, 'granted_by' => $this->user()->id],
                );
            }
        });

        $user->forgetPermissionCache();

        if ($changes !== []) {
            ActivityLogger::log(
                M::PERMISSIONS, 'permissions',
                'عدّل صلاحيات '.$user->roleLabel()." «{$user->name}» على ".count($changes).' وحدة',
                $user,
                $changes
            );
        }

        return response()->json([
            'message' => 'تم حفظ الصلاحيات، وستسري فور دخول المستخدم التالي',
            'changed' => count($changes),
        ]);
    }

    /** إنشاء مسؤول إداري جديد (نائب مدير / سكرتير) بصلاحيات الدور الافتراضية. */
    public function storeStaff(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'username' => ['required', 'string', 'max:64', 'unique:users,username'],
            'password' => ['required', 'string', 'min:8'],
            'email' => ['nullable', 'email', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:32'],
            'role' => ['required', Rule::in(Role::STAFF)],
        ], [], [
            'name' => 'الاسم',
            'username' => 'اسم المستخدم',
            'password' => 'كلمة المرور',
            'role' => 'الدور',
        ]);

        $user = DB::transaction(function () use ($data) {
            $user = User::create([...$data, 'is_active' => true]);
            self::applyRoleDefaults($user, $this->user());

            return $user;
        });

        ActivityLogger::log(
            M::PERMISSIONS, 'create',
            "أنشأ حساب {$user->roleLabel()} «{$user->name}» بالصلاحيات الافتراضية",
            $user
        );

        return response()->json([
            'user' => $user->only(['id', 'name', 'username', 'role']),
            'message' => 'تم إنشاء الحساب بالصلاحيات الافتراضية للدور',
        ], 201);
    }

    /** تفعيل أو إيقاف حساب مسؤول. */
    public function toggleActive(User $user): JsonResponse
    {
        abort_if($user->id === $this->user()->id, 422, 'لا يمكنك إيقاف حسابك.');
        abort_if($user->isUnrestricted(), 422, 'لا يمكن إيقاف حساب مدير المدرسة من هنا.');

        $user->update(['is_active' => ! $user->is_active]);

        ActivityLogger::log(
            M::PERMISSIONS, 'update',
            ($user->is_active ? 'فعّل' : 'أوقف')." حساب «{$user->name}»",
            $user
        );

        return response()->json([
            'is_active' => $user->is_active,
            'message' => $user->is_active ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب',
        ]);
    }
}
