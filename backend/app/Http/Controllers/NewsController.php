<?php

namespace App\Http\Controllers;

use App\Models\News;
use App\Support\ActivityLogger;
use App\Support\Modules;
use App\Support\Notifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NewsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $this->user();

        $query = News::query()
            ->with('author:id,name')
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')));

        // من لا يملك صلاحية تحرير الأخبار لا يرى المسودّات
        if (! $user->canModule(Modules::NEWS, 'update')) {
            $query->where('is_published', true);
        }

        return response()->json(
            $query->orderByDesc('published_at')->orderByDesc('id')->paginate($request->integer('per_page', 12))
        );
    }

    public function show(News $news): JsonResponse
    {
        abort_if(! $news->is_published && ! $this->user()->canModule(Modules::NEWS, 'update'), 404);

        return response()->json(['news' => $news->load('author:id,name')]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $publish = $request->boolean('publish');

        $news = News::create([
            ...$data,
            'author_id' => $this->user()->id,
            'is_published' => $publish,
            'published_at' => $publish ? now() : null,
        ]);

        ActivityLogger::log(
            Modules::NEWS,
            $publish ? 'publish' : 'create',
            ($publish ? 'نشر' : 'حفظ مسودة').' '.$news->typeLabel()." بعنوان «{$news->title}»",
            $news
        );

        $recipients = $publish ? Notifier::newsPublished($news) : 0;

        return response()->json([
            'news' => $news,
            'notified' => $recipients,
            'message' => $publish
                ? "تم النشر بنجاح، وأُرسل إشعار إلى {$recipients} مستخدما"
                : 'تم حفظ المسودة',
        ], 201);
    }

    public function update(Request $request, News $news): JsonResponse
    {
        $news->update($this->validated($request));

        ActivityLogger::log(
            Modules::NEWS, 'update',
            "عدّل {$news->typeLabel()} «{$news->title}»",
            $news,
            ActivityLogger::diff($news)
        );

        return response()->json(['news' => $news, 'message' => 'تم حفظ التعديلات']);
    }

    /** النشر إجراء منفصل: يحفظ الخبر ويطلق الإشعار الفوري لجميع الحسابات النشطة. */
    public function publish(News $news): JsonResponse
    {
        if ($news->is_published) {
            return response()->json(['message' => 'هذا الخبر منشور مسبقا.'], 422);
        }

        $news->update(['is_published' => true, 'published_at' => now()]);

        ActivityLogger::log(Modules::NEWS, 'publish', "نشر {$news->typeLabel()} «{$news->title}»", $news);

        $recipients = Notifier::newsPublished($news);

        return response()->json([
            'news' => $news,
            'notified' => $recipients,
            'message' => "تم النشر، وأُرسل إشعار إلى {$recipients} مستخدما",
        ]);
    }

    public function destroy(News $news): JsonResponse
    {
        $title = $news->title;
        $news->delete();

        ActivityLogger::log(Modules::NEWS, 'delete', "حذف الخبر «{$title}»");

        return $this->ok('تم حذف الخبر');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'type' => ['required', Rule::in(['news', 'activity'])],
            'title' => ['required', 'string', 'max:180'],
            'excerpt' => ['nullable', 'string', 'max:300'],
            'body' => ['required', 'string', 'max:20000'],
            'cover_image' => ['nullable', 'string', 'max:500'],
        ], [], [
            'type' => 'النوع',
            'title' => 'العنوان',
            'body' => 'التفاصيل',
        ]);
    }
}
