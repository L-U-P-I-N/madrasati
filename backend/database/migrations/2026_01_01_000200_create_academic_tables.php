<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // الجدول الأسبوعي — حصة في يوم ورقم حصة لفصل معيّن
        Schema::create('schedule_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');   // 0 الأحد .. 4 الخميس
            $table->unsignedTinyInteger('period');        // رقم الحصة 1..8
            $table->time('starts_at')->nullable();
            $table->time('ends_at')->nullable();
            $table->timestamps();

            $table->unique(['classroom_id', 'day_of_week', 'period'], 'slot_classroom_unique');
            $table->index(['teacher_id', 'day_of_week']);
        });

        // الحصص اليومية — ماذا دُرّس فعليا في هذه الحصة اليوم
        Schema::create('daily_lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_slot_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained()->cascadeOnDelete();
            $table->date('lesson_date');
            $table->unsignedTinyInteger('period');
            $table->string('title');
            $table->text('content');                      // نص حر لما تم تدريسه
            $table->text('homework')->nullable();
            $table->timestamps();

            $table->unique(['classroom_id', 'lesson_date', 'period'], 'lesson_slot_unique');
            $table->index(['teacher_id', 'lesson_date']);
        });

        // الدرجات — درجة طالب في مادة ضمن نوع تقييم
        Schema::create('grades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained()->cascadeOnDelete();
            $table->string('term', 24);                   // الفصل الأول / الثاني
            $table->string('assessment_type', 32);        // اختبار قصير / أعمال فصلية / نهائي
            $table->decimal('score', 5, 2);
            $table->decimal('max_score', 5, 2)->default(100);
            $table->text('remark')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'subject_id', 'term']);
        });

        // دفتر المتابعة — أهداف المنهج الشهرية والدروس المخططة
        Schema::create('followup_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $table->string('term', 24);
            $table->unsignedTinyInteger('month');          // الشهر الدراسي 1..10
            $table->text('objectives');                    // أهداف المنهج
            $table->text('planned_lessons');               // الدروس المخططة
            $table->text('achievements')->nullable();      // ما تحقق فعليا
            $table->timestamps();

            $table->index(['teacher_id', 'classroom_id', 'month']);
        });

        // ملاحظات الطلاب — إيجابية أو سلبية
        Schema::create('student_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('subject_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 16);                    // positive | negative
            $table->string('title');
            $table->text('body');
            $table->date('noted_on');
            $table->timestamps();

            $table->index(['student_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_notes');
        Schema::dropIfExists('followup_entries');
        Schema::dropIfExists('grades');
        Schema::dropIfExists('daily_lessons');
        Schema::dropIfExists('schedule_slots');
    }
};
