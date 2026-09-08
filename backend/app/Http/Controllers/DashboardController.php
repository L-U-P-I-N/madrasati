<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Classroom;
use App\Models\DailyLesson;
use App\Models\News;
use App\Models\ScheduleSlot;
use App\Models\Student;
use App\Models\Teacher;
use App\Support\Modules;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $user = $this->user();

        return response()->json([
            'greeting' => "مرحبا بعودتك، {$user->name}",
            'role_label' => $user->roleLabel(),
            'stats' => $user->teacher ? $this->teacherStats() : $this->staffStats(),
            'latest_news' => News::where('is_published', true)
                ->latest('published_at')
                ->limit(4)
                ->get(['id', 'type', 'title', 'excerpt', 'published_at']),
            'recent_activity' => $user->canModule(Modules::ACTIVITY_LOG, 'view')
                ? ActivityLog::latest('id')->limit(8)->get(['id', 'user_name', 'user_role', 'description', 'created_at'])
                : [],
        ]);
    }

    /** بطاقات الإحصاءات لواجهة الإدارة. */
    private function staffStats(): array
    {
        $user = $this->user();
        $cards = [];

        if ($user->canModule(Modules::STUDENTS)) {
            $cards[] = [
                'key' => 'students',
                'label' => 'إجمالي الطلاب',
                'value' => Student::where('status', 'active')->count(),
                'hint' => Student::where('status', 'pending')->count().' قيد المراجعة',
            ];
        }

        if ($user->canModule(Modules::TEACHERS)) {
            $cards[] = ['key' => 'teachers', 'label' => 'المعلمون', 'value' => Teacher::count(), 'hint' => null];
        }

        if ($user->canModule(Modules::CLASSROOMS)) {
            $cards[] = ['key' => 'classrooms', 'label' => 'الفصول النشطة', 'value' => Classroom::count(), 'hint' => null];
        }

        if ($user->canModule(Modules::NEWS)) {
            $cards[] = [
                'key' => 'news',
                'label' => 'الأخبار هذا الشهر',
                'value' => News::where('is_published', true)->whereMonth('published_at', now()->month)->count(),
                'hint' => null,
            ];
        }

        return $cards;
    }

    /** بطاقات المعلم — كلها ضمن نطاق مادته وفصوله. */
    private function teacherStats(): array
    {
        $teacher = $this->currentTeacher();
        $classroomIds = $teacher->classroomIds();
        $today = now();

        return [
            [
                'key' => 'my_students',
                'label' => 'طلابي',
                'value' => Student::whereIn('classroom_id', $classroomIds)->where('status', 'active')->count(),
                'hint' => count($classroomIds).' فصلا',
            ],
            [
                'key' => 'today_periods',
                'label' => 'حصص اليوم',
                'value' => ScheduleSlot::where('teacher_id', $teacher->id)
                    ->where('day_of_week', (int) $today->dayOfWeek)
                    ->count(),
                'hint' => null,
            ],
            [
                'key' => 'recorded_today',
                'label' => 'الحصص المسجّلة اليوم',
                'value' => DailyLesson::where('teacher_id', $teacher->id)->whereDate('lesson_date', $today)->count(),
                'hint' => null,
            ],
            [
                'key' => 'subjects',
                'label' => 'موادّي',
                'value' => count($teacher->subjectIds()),
                'hint' => null,
            ],
        ];
    }
}
