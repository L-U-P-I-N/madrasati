<?php

namespace App\Support;

/**
 * مستويات الصلاحية لكل قسم — كما وردت في تقرير السيناريو الثالث.
 * المستويات تراكمية: كل مستوى يشمل ما دونه.
 */
final class PermissionLevel
{
    public const NONE = 0;   // بدون صلاحية — القسم لا يظهر في القائمة نهائيا
    public const VIEW = 1;   // عرض فقط
    public const CREATE = 2; // إضافة وعرض
    public const EDIT = 3;   // إضافة وتعديل وعرض
    public const FULL = 4;   // عرض + إضافة + تعديل + حذف

    public const ABILITIES = [
        'view' => self::VIEW,
        'create' => self::CREATE,
        'update' => self::EDIT,
        'delete' => self::FULL,
    ];

    /** @return array<int, array{value:int,label:string}> */
    public static function options(): array
    {
        return [
            ['value' => self::NONE,   'label' => 'بدون صلاحية'],
            ['value' => self::VIEW,   'label' => 'عرض فقط'],
            ['value' => self::CREATE, 'label' => 'إضافة وعرض'],
            ['value' => self::EDIT,   'label' => 'إضافة وتعديل وعرض'],
            ['value' => self::FULL,   'label' => 'صلاحية كاملة'],
        ];
    }

    public static function requiredFor(string $ability): int
    {
        return self::ABILITIES[$ability] ?? self::FULL;
    }
}
