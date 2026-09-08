<?php

namespace App\Support;

use App\Models\News;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * الإشعارات الفورية داخل المنصة. عند نشر خبر أو نشاط يصل الإشعار
 * لجميع الحسابات النشطة ويظهر عدّاد غير المقروء على أيقونة الجرس.
 */
class Notifier
{
    /** إشعار جماعي لكل الحسابات النشطة. دفعة واحدة لتفادي آلاف الاستعلامات. */
    public static function broadcast(string $type, string $title, ?string $body, ?string $link, array $data = []): int
    {
        $now = now();

        $rows = User::query()
            ->where('is_active', true)
            ->pluck('id')
            ->map(fn (int $userId) => [
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
                'body' => $body,
                'link' => $link,
                'data' => json_encode($data, JSON_UNESCAPED_UNICODE),
                'read_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ])
            ->all();

        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('notifications')->insert($chunk);
        }

        return count($rows);
    }

    public static function newsPublished(News $news): int
    {
        return self::broadcast(
            type: $news->type === 'activity' ? 'activity.published' : 'news.published',
            title: $news->typeLabel().': '.$news->title,
            body: $news->excerpt ?: mb_substr(strip_tags($news->body), 0, 160),
            link: "/news/{$news->id}",
            data: ['news_id' => $news->id, 'type' => $news->type],
        );
    }

    public static function toUser(User $user, string $type, string $title, ?string $body = null, ?string $link = null): Notification
    {
        return Notification::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'link' => $link,
        ]);
    }
}
