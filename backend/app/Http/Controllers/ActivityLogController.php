<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Support\Modules;
use App\Support\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $logs = ActivityLog::query()
            ->when($request->filled('module'), fn ($q) => $q->where('module', $request->string('module')))
            ->when($request->filled('action'), fn ($q) => $q->where('action', $request->string('action')))
            ->when($request->filled('user_id'), fn ($q) => $q->where('user_id', $request->integer('user_id')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('created_at', '<=', $request->date('to')))
            ->when($request->filled('q'), fn ($q) => $q->where('description', 'like', '%'.$request->string('q').'%'))
            ->latest('id')
            ->paginate($request->integer('per_page', 30));

        $logs->getCollection()->transform(function (ActivityLog $log) {
            $log->module_label = Modules::label($log->module);
            $log->role_label = Role::label($log->user_role);

            return $log;
        });

        return response()->json($logs);
    }

    /** خيارات الفلترة المتاحة في شاشة السجل. */
    public function filters(): JsonResponse
    {
        return response()->json([
            'modules' => Modules::all(),
            'actions' => [
                ['key' => 'create', 'label' => 'إضافة'],
                ['key' => 'update', 'label' => 'تعديل'],
                ['key' => 'delete', 'label' => 'حذف'],
                ['key' => 'publish', 'label' => 'نشر'],
                ['key' => 'login', 'label' => 'تسجيل دخول'],
                ['key' => 'permissions', 'label' => 'تعديل صلاحيات'],
            ],
        ]);
    }
}
