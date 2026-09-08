<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyLesson extends Model
{
    protected $fillable = [
        'schedule_slot_id', 'classroom_id', 'subject_id', 'teacher_id',
        'lesson_date', 'period', 'title', 'content', 'homework',
    ];

    protected $casts = [
        'lesson_date' => 'date',
        'period' => 'integer',
    ];

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }
}
