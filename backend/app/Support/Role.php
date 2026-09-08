<?php

namespace App\Support;

/**
 * أدوار النظام. الأدوار الإدارية الثلاثة (مدير/نائب/سكرتير) صلاحياتها مرنة
 * يضبطها مدير المدرسة، أما المعلم والطالب فنطاقهما محدد بطبيعة الدور.
 */
final class Role
{
    public const SUPER_ADMIN = 'super_admin';        // مدير النظام
    public const PRINCIPAL = 'principal';            // مدير المدرسة
    public const VICE_PRINCIPAL = 'vice_principal';  // نائب المدير / الوكيل
    public const SECRETARY = 'secretary';            // السكرتير / الإداري
    public const TEACHER = 'teacher';                // المعلم
    public const STUDENT = 'student';                // الطالب

    public const LABELS = [
        self::SUPER_ADMIN => 'مدير النظام',
        self::PRINCIPAL => 'مدير المدرسة',
        self::VICE_PRINCIPAL => 'نائب المدير',
        self::SECRETARY => 'السكرتير / الإداري',
        self::TEACHER => 'المعلم',
        self::STUDENT => 'الطالب',
    ];

    /** الأدوار التي تملك كل شيء دون الرجوع إلى مصفوفة الصلاحيات. */
    public const UNRESTRICTED = [self::SUPER_ADMIN, self::PRINCIPAL];

    /** الأدوار الإدارية التي يضبط المدير صلاحياتها يدويا. */
    public const STAFF = [self::VICE_PRINCIPAL, self::SECRETARY];

    public static function label(string $role): string
    {
        return self::LABELS[$role] ?? $role;
    }

    /** @return array<int, string> */
    public static function all(): array
    {
        return array_keys(self::LABELS);
    }
}
