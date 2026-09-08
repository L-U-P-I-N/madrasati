<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FollowupEntry extends Model
{
    protected $fillable = [
        'teacher_id', 'subject_id', 'classroom_id', 'term', 'month',
        'objectives', 'planned_lessons', 'achievements',
    ];

    protected $casts = ['month' => 'integer'];

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }
}
