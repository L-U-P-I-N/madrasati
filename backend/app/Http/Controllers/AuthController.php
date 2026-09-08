<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\ActivityLogger;
use App\Support\Modules;
use App\Support\PermissionLevel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ], [], [
            'username' => 'اسم المستخدم',
            'password' => 'كلمة المرور',
        ]);

        $user = User::where('username', $data['username'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'username' => 'اسم المستخدم أو كلمة المرور غير صحيحة.',
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'username' => 'هذا الحساب موقوف. راجع إدارة المدرسة.',
            ]);
        }

        $user->forceFill(['last_login_at' => now()])->save();
        $user->tokens()->where('name', 'web')->delete();
        $token = $user->createToken('web')->plainTextToken;

        ActivityLogger::log('auth', 'login', "سجّل {$user->roleLabel()} «{$user->name}» الدخول إلى النظام");

        return response()->json([
            'token' => $token,
            'user' => $this->profile($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->profile($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return $this->ok('تم تسجيل الخروج');
    }

    /** الملف الشخصي + مصفوفة الصلاحيات + القائمة الجانبية المسموحة. */
    private function profile(User $user): array
    {
        $matrix = $user->permissionMatrix();

        $menu = collect(Modules::all())
            ->filter(fn (array $module) => ($matrix[$module['key']]['level'] ?? 0) > PermissionLevel::NONE)
            ->values()
            ->all();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,
            'role_label' => $user->roleLabel(),
            'avatar' => $user->avatar,
            'is_active' => $user->is_active,
            'teacher_id' => $user->teacher?->id,
            'student_id' => $user->student?->id,
            'permissions' => $matrix,
            'menu' => $menu,
            'unread_notifications' => $user->notifications()->whereNull('read_at')->count(),
        ];
    }
}
