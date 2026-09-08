<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClassroomController;
use App\Http\Controllers\DailyLessonController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FollowupController;
use App\Http\Controllers\GradeController;
use App\Http\Controllers\NewsController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\StudentNoteController;
use App\Http\Controllers\StudentPortalController;
use App\Http\Controllers\TeacherController;
use Illuminate\Support\Facades\Route;

/*
| كل مسار كتابة محروس بمستوى الصلاحية المطلوب على وحدته.
| الواجهة تخفي الأزرار، وهذه الطبقة هي التي ترفض فعليا.
*/

Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('me', [AuthController::class, 'me']);
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('dashboard', [DashboardController::class, 'index']);

    // ── الطلاب ───────────────────────────────────────────────────────────
    Route::middleware('can.module:students,view')->group(function () {
        Route::get('students', [StudentController::class, 'index']);
        Route::get('students/{student}', [StudentController::class, 'show']);
    });
    Route::post('students', [StudentController::class, 'store'])->middleware('can.module:students,create');
    Route::put('students/{student}', [StudentController::class, 'update'])->middleware('can.module:students,update');
    Route::delete('students/{student}', [StudentController::class, 'destroy'])->middleware('can.module:students,delete');

    // ── المعلمون ─────────────────────────────────────────────────────────
    Route::middleware('can.module:teachers,view')->group(function () {
        Route::get('teachers', [TeacherController::class, 'index']);
        Route::get('teachers/{teacher}', [TeacherController::class, 'show']);
    });
    Route::post('teachers', [TeacherController::class, 'store'])->middleware('can.module:teachers,create');
    Route::put('teachers/{teacher}', [TeacherController::class, 'update'])->middleware('can.module:teachers,update');
    Route::delete('teachers/{teacher}', [TeacherController::class, 'destroy'])->middleware('can.module:teachers,delete');

    // ── الصفوف ───────────────────────────────────────────────────────────
    Route::middleware('can.module:classrooms,view')->group(function () {
        Route::get('classrooms', [ClassroomController::class, 'index']);
        Route::get('classrooms/options', [ClassroomController::class, 'options']);
        Route::get('classrooms/{classroom}', [ClassroomController::class, 'show']);
    });
    Route::post('classrooms', [ClassroomController::class, 'store'])->middleware('can.module:classrooms,create');
    Route::put('classrooms/{classroom}', [ClassroomController::class, 'update'])->middleware('can.module:classrooms,update');
    Route::post('classrooms/{classroom}/assignments', [ClassroomController::class, 'assign'])->middleware('can.module:classrooms,update');
    Route::delete('classrooms/{classroom}/assignments/{assignment}', [ClassroomController::class, 'unassign'])->middleware('can.module:classrooms,update');
    Route::delete('classrooms/{classroom}', [ClassroomController::class, 'destroy'])->middleware('can.module:classrooms,delete');

    // ── الجدول الأسبوعي ──────────────────────────────────────────────────
    Route::get('schedule', [ScheduleController::class, 'index'])->middleware('can.module:schedule,view');
    Route::post('schedule', [ScheduleController::class, 'store'])->middleware('can.module:schedule,create');
    Route::put('schedule/{slot}', [ScheduleController::class, 'update'])->middleware('can.module:schedule,update');
    Route::delete('schedule/{slot}', [ScheduleController::class, 'destroy'])->middleware('can.module:schedule,delete');

    // ── الحصص اليومية ────────────────────────────────────────────────────
    Route::middleware('can.module:daily_lessons,view')->group(function () {
        Route::get('daily-lessons', [DailyLessonController::class, 'index']);
        Route::get('daily-lessons/today', [DailyLessonController::class, 'today']);
    });
    Route::post('daily-lessons', [DailyLessonController::class, 'store'])->middleware('can.module:daily_lessons,create');
    Route::put('daily-lessons/{lesson}', [DailyLessonController::class, 'update'])->middleware('can.module:daily_lessons,update');
    Route::delete('daily-lessons/{lesson}', [DailyLessonController::class, 'destroy'])->middleware('can.module:daily_lessons,delete');

    // ── الدرجات ──────────────────────────────────────────────────────────
    Route::middleware('can.module:grades,view')->group(function () {
        Route::get('grades', [GradeController::class, 'index']);
        Route::get('grades/sheet', [GradeController::class, 'sheet']);
    });
    Route::post('grades/sheet', [GradeController::class, 'saveSheet'])->middleware('can.module:grades,update');
    Route::delete('grades/{grade}', [GradeController::class, 'destroy'])->middleware('can.module:grades,delete');

    // ── دفتر المتابعة ────────────────────────────────────────────────────
    Route::get('followup', [FollowupController::class, 'index'])->middleware('can.module:followup,view');
    Route::post('followup', [FollowupController::class, 'store'])->middleware('can.module:followup,create');
    Route::put('followup/{entry}', [FollowupController::class, 'update'])->middleware('can.module:followup,update');
    Route::delete('followup/{entry}', [FollowupController::class, 'destroy'])->middleware('can.module:followup,delete');

    // ── ملاحظات الطلاب ───────────────────────────────────────────────────
    Route::get('student-notes', [StudentNoteController::class, 'index'])->middleware('can.module:student_notes,view');
    Route::post('student-notes', [StudentNoteController::class, 'store'])->middleware('can.module:student_notes,create');
    Route::put('student-notes/{note}', [StudentNoteController::class, 'update'])->middleware('can.module:student_notes,update');
    Route::delete('student-notes/{note}', [StudentNoteController::class, 'destroy'])->middleware('can.module:student_notes,delete');

    // ── الأخبار والأنشطة ─────────────────────────────────────────────────
    Route::middleware('can.module:news,view')->group(function () {
        Route::get('news', [NewsController::class, 'index']);
        Route::get('news/{news}', [NewsController::class, 'show']);
    });
    Route::post('news', [NewsController::class, 'store'])->middleware('can.module:news,create');
    Route::put('news/{news}', [NewsController::class, 'update'])->middleware('can.module:news,update');
    Route::post('news/{news}/publish', [NewsController::class, 'publish'])->middleware('can.module:news,create');
    Route::delete('news/{news}', [NewsController::class, 'destroy'])->middleware('can.module:news,delete');

    // ── الإشعارات ────────────────────────────────────────────────────────
    // القراءة متاحة للجميع؛ الإرسال العام يحتاج صلاحية على وحدة الإشعارات
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('notifications/broadcast', [NotificationController::class, 'broadcast'])->middleware('can.module:notifications,create');

    // ── سجل العمليات ─────────────────────────────────────────────────────
    Route::middleware('can.module:activity_log,view')->group(function () {
        Route::get('activity-logs', [ActivityLogController::class, 'index']);
        Route::get('activity-logs/filters', [ActivityLogController::class, 'filters']);
    });

    // ── إدارة الصلاحيات — مدير المدرسة وحده ─────────────────────────────
    Route::middleware('can.module:permissions,view')->group(function () {
        Route::get('permissions', [PermissionController::class, 'index']);
        Route::get('permissions/{user}', [PermissionController::class, 'show']);
    });
    Route::post('permissions/staff', [PermissionController::class, 'storeStaff'])->middleware('can.module:permissions,create');
    Route::put('permissions/{user}', [PermissionController::class, 'update'])->middleware('can.module:permissions,update');
    Route::post('permissions/{user}/toggle-active', [PermissionController::class, 'toggleActive'])->middleware('can.module:permissions,update');

    // ── لوحة الطالب ──────────────────────────────────────────────────────
    Route::prefix('me')->group(function () {
        Route::get('dashboard', [StudentPortalController::class, 'dashboard']);
        Route::get('grades', [StudentPortalController::class, 'grades']);
        Route::get('schedule', [StudentPortalController::class, 'schedule']);
        Route::get('lessons', [StudentPortalController::class, 'lessons']);
        Route::get('notes', [StudentPortalController::class, 'notes']);
    });
});
