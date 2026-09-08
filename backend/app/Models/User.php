<?php

namespace App\Models;

use App\Support\Modules;
use App\Support\PermissionLevel;
use App\Support\Role;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'username', 'email', 'password', 'role',
        'phone', 'avatar', 'is_active', 'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    /** @var array<string,int>|null ذاكرة مؤقتة لمصفوفة الصلاحيات خلال الطلب الواحد */
    protected ?array $permissionCache = null;

    public function permissions(): HasMany
    {
        return $this->hasMany(ModulePermission::class);
    }

    public function teacher(): HasOne
    {
        return $this->hasOne(Teacher::class);
    }

    public function student(): HasOne
    {
        return $this->hasOne(Student::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class)->latest();
    }

    public function isUnrestricted(): bool
    {
        return in_array($this->role, Role::UNRESTRICTED, true);
    }

    public function isStaff(): bool
    {
        return in_array($this->role, [...Role::UNRESTRICTED, ...Role::STAFF], true);
    }

    /** مستوى صلاحية المستخدم على وحدة معيّنة. */
    public function levelFor(string $module): int
    {
        if ($this->isUnrestricted()) {
            return PermissionLevel::FULL;
        }

        if ($this->permissionCache === null) {
            $this->permissionCache = $this->permissions()
                ->pluck('level', 'module')
                ->all();
        }

        return (int) ($this->permissionCache[$module] ?? PermissionLevel::NONE);
    }

    /** هل يملك المستخدم القدرة المطلوبة (view/create/update/delete) على الوحدة؟ */
    public function canModule(string $module, string $ability = 'view'): bool
    {
        return $this->levelFor($module) >= PermissionLevel::requiredFor($ability);
    }

    /**
     * مصفوفة الصلاحيات الكاملة كما ترسل للواجهة — الواجهة تبني القائمة
     * والأزرار انطلاقا منها، والخادم يتحقق منها مرة أخرى عند كل طلب.
     *
     * @return array<string, array{level:int, view:bool, create:bool, update:bool, delete:bool}>
     */
    public function permissionMatrix(): array
    {
        $matrix = [];

        foreach (Modules::keys() as $module) {
            $level = $this->levelFor($module);

            $matrix[$module] = [
                'level' => $level,
                'view' => $level >= PermissionLevel::VIEW,
                'create' => $level >= PermissionLevel::CREATE,
                'update' => $level >= PermissionLevel::EDIT,
                'delete' => $level >= PermissionLevel::FULL,
            ];
        }

        return $matrix;
    }

    public function forgetPermissionCache(): void
    {
        $this->permissionCache = null;
    }

    public function roleLabel(): string
    {
        return Role::label($this->role);
    }
}
