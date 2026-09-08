<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Support\ActivityLogger;
use App\Support\Modules;
use App\Support\Notifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /** قائمة إشعارات المستخدم الحالي مع عدّاد غير المقروء. */
    public function index(Request $request): JsonResponse
    {
        $user = $this->user();

        return response()->json([
            'unread' => $user->notifications()->whereNull('read_at')->count(),
            'notifications' => $user->notifications()
                ->when($request->boolean('unread_only'), fn ($q) => $q->whereNull('read_at'))
                ->limit($request->integer('limit', 20))
                ->get(),
        ]);
    }

    public function markRead(Notification $notification): JsonResponse
    {
        abort_unless($notification->user_id === $this->user()->id, 404);

        $notification->update(['read_at' => now()]);

        return response()->json([
            'unread' => $this->user()->notifications()->whereNull('read_at')->count(),
        ]);
    }

    public function markAllRead(): JsonResponse
    {
        $this->user()->notifications()->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['unread' => 0, 'message' => 'تم تعليم الكل كمقروء']);
    }

    /** إشعار إداري عام — لمن يملك صلاحية الإضافة على وحدة الإشعارات. */
    public function broadcast(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'body' => ['nullable', 'string', 'max:1000'],
            'link' => ['nullable', 'string', 'max:300'],
        ], [], [
            'title' => 'عنوان الإشعار',
        ]);

        $count = Notifier::broadcast('system', $data['title'], $data['body'] ?? null, $data['link'] ?? null);

        ActivityLogger::log(
            Modules::NOTIFICATIONS, 'create',
            "أرسل إشعارا عاما «{$data['title']}» إلى {$count} مستخدما"
        );

        return response()->json(['notified' => $count, 'message' => "تم إرسال الإشعار إلى {$count} مستخدما"]);
    }
}
