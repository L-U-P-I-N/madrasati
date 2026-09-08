<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Grade extends Model
{
    public const ASSESSMENT_TYPES = ['اختبار قصير', 'أعمال فصلية', 'اختبار منتصف الفصل', 'الاختبار النهائي'];

    public const TERMS = ['الفصل الأول', 'الفصل الثاني', 'الفصل الثالث'];

    protected $fillable = [
        'student_id', 'subject_id', 'classroom_id', 'teacher_id',
        'term', 'assessment_type', 'score', 'max_score', 'remark',
    ];

    protected $casts = [
        'score' => 'decimal:2',
        'max_score' => 'decimal:2',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function getPercentageAttribute(): float
    {
        return $this->max_score > 0 ? round(($this->score / $this->max_score) * 100, 1) : 0;
    }
}
