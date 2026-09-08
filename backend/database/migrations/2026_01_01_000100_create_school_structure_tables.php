<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // العام الدراسي — يتيح فصل البيانات بين الأعوام دون حذفها
        Schema::create('academic_years', function (Blueprint $table) {
            $table->id();
            $table->string('name');                 // ١٤٤٧ هـ / ٢٠٢٦ م
            $table->string('hijri_label')->nullable();
            $table->date('starts_on');
            $table->date('ends_on');
            $table->boolean('is_current')->default(false);
            $table->timestamps();
        });

        // الصفوف / الفصول — «العاشر — أ»
        Schema::create('classrooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained()->cascadeOnDelete();
            $table->string('grade_level');          // العاشر
            $table->string('section', 16);          // أ
            $table->string('name');                 // العاشر — أ
            $table->unsignedSmallInteger('capacity')->default(30);
            $table->foreignId('homeroom_teacher_id')->nullable();
            $table->timestamps();

            $table->unique(['academic_year_id', 'grade_level', 'section']);
        });

        // المواد الدراسية
        Schema::create('subjects', function (Blueprint $table) {
            $table->id();
            $table->string('name');                 // الرياضيات
            $table->string('code', 24)->unique();   // MATH
            $table->unsignedSmallInteger('max_grade')->default(100);
            $table->timestamps();
        });

        // المعلمون — ملف مهني مرتبط بحساب المستخدم
        Schema::create('teachers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('employee_no', 32)->unique();
            $table->string('specialization')->nullable();
            $table->string('qualification')->nullable();
            $table->date('hired_on')->nullable();
            $table->timestamps();
        });

        // الطلاب
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->foreignId('classroom_id')->nullable()->constrained()->nullOnDelete();
            $table->string('student_no', 32)->unique();
            $table->string('full_name');
            $table->string('national_id', 32)->nullable();
            $table->date('birth_date')->nullable();
            $table->string('guardian_name')->nullable();
            $table->string('guardian_phone', 32)->nullable();
            $table->string('status', 24)->default('active'); // active | pending | withdrawn
            $table->date('enrolled_on')->nullable();
            $table->text('address')->nullable();
            $table->timestamps();

            $table->index(['classroom_id', 'status']);
        });

        // إسناد المعلم لمادة داخل فصل معيّن — أساس عزل نطاق المعلم
        Schema::create('teaching_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['teacher_id', 'subject_id', 'classroom_id'], 'assignment_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teaching_assignments');
        Schema::dropIfExists('students');
        Schema::dropIfExists('teachers');
        Schema::dropIfExists('subjects');
        Schema::dropIfExists('classrooms');
        Schema::dropIfExists('academic_years');
    }
};
