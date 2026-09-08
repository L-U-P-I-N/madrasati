<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subject extends Model
{
    protected $fillable = ['name', 'code', 'max_grade'];

    protected $casts = ['max_grade' => 'integer'];

    public function assignments(): HasMany
    {
        return $this->hasMany(TeachingAssignment::class);
    }

    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }
}
