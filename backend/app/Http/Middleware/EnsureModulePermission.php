<?php

namespace App\Http\Middleware;

use App\Support\Modules;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * الحارس الوحيد لمصفوفة الصلاحيات على مستوى الخادم.
 * إخفاء الأزرار في الواجهة تجميل فقط — الرفض الحقيقي يحدث هنا.
 *
 * الاستخدام: ->middleware('can.module:students,update')
 */
class EnsureModulePermission
{
    public function handle(Request $request, Closure $next, string $module, string $ability = 'view'): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_active) {
            return response()->json(['message' => 'الحساب غير نشط أو غير مصرّح.'], 401);
        }

        if (! $user->canModule($module, $ability)) {
            return response()->json([
                'message' => 'غير مصرّح لك بهذا الإجراء.',
                'module' => Modules::label($module),
                'ability' => $ability,
            ], 403);
        }

        return $next($request);
    }
}
