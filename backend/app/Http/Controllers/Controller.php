<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

abstract class Controller
{
    protected function user(): User
    {
        /** @var User $user */
        $user = Auth::user();

        return $user;
    }

    /** ملف المعلم للمستخدم الحالي — أساس عزل نطاق المعلم في كل وحدة. */
    protected function currentTeacher(): ?Teacher
    {
        return $this->user()->teacher;
    }

    protected function forbidden(string $message = 'غير مصرّح لك بهذا الإجراء.'): JsonResponse
    {
        return response()->json(['message' => $message], 403);
    }

    protected function ok(string $message = 'تم الحفظ بنجاح'): JsonResponse
    {
        return response()->json(['message' => $message]);
    }
}
