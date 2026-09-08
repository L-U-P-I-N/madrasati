<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Teacher extends Model
{
    protected $fillable = [
        'user_id', 'employee_no', 'specialization', 'qualification', 'hired_on',
    ];

    protected $casts = ['hired_on' => 'date'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TeachingAssignment::class);
    }

    public function scheduleSlots(): HasMany
    {
        return $this->hasMany(ScheduleSlot::class);
    }

    public function dailyLessons(): HasMany
    {
        return $this->hasMany(DailyLesson::class);
    }

    /** معرّفات الفصول التي يدرّسها هذا المعلم — أساس عزل نطاقه. */
    public function classroomIds(): array
    {
        return $this->assignments()->pluck('classroom_id')->unique()->values()->all();
    }

    /** معرّفات المواد التي يدرّسها. */
    public function subjectIds(): array
    {
        return $this->assignments()->pluck('subject_id')->unique()->values()->all();
    }
}
