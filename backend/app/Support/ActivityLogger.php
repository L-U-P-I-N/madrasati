<?php

namespace App\Support;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

/**
 * سجل العمليات — يُستدعى بعد كل عملية كتابة حتى يبقى مرجعا واضحا
 * لمن أضاف أو عدّل أو حذف أي بيانات ومتى.
 */
class ActivityLogger
{
    public static function log(
        string $module,
        string $action,
        string $description,
        ?Model $subject = null,
        ?array $changes = null,
    ): ActivityLog {
        /** @var User|null $user */
        $user = Auth::user();

        return ActivityLog::create([
            'user_id' => $user?->id,
            'user_name' => $user?->name ?? 'النظام',
            'user_role' => $user?->role ?? 'system',
            'module' => $module,
            'action' => $action,
            'subject_type' => $subject ? class_basename($subject) : null,
            'subject_id' => $subject?->getKey(),
            'description' => $description,
            'changes' => $changes,
            'ip_address' => Request::ip(),
        ]);
    }

    /** يلتقط الحقول التي تغيّرت فعليا فقط، مع القيمة قبل وبعد. */
    public static function diff(Model $model): array
    {
        $changes = [];

        foreach ($model->getChanges() as $field => $after) {
            if (in_array($field, ['updated_at', 'password', 'remember_token'], true)) {
                continue;
            }

            $changes[$field] = [
                'before' => $model->getOriginal($field),
                'after' => $after,
            ];
        }

        return $changes;
    }
}
