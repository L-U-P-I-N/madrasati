<?php

namespace App\Support;

/**
 * فهرس الوحدات الوظيفية في النظام — المصدر الموحّد لمفاتيح الصلاحيات.
 * أي وحدة جديدة تُضاف هنا تصبح متاحة تلقائيا في شاشة إدارة الصلاحيات.
 */
final class Modules
{
    public const STUDENTS = 'students';
    public const TEACHERS = 'teachers';
    public const GRADES = 'grades';
    public const CLASSROOMS = 'classrooms';
    public const DAILY_LESSONS = 'daily_lessons';
    public const SCHEDULE = 'schedule';
    public const FOLLOWUP = 'followup';
    public const NEWS = 'news';
    public const STUDENT_NOTES = 'student_notes';
    public const PERMISSIONS = 'permissions';
    public const ACTIVITY_LOG = 'activity_log';
    public const NOTIFICATIONS = 'notifications';

    /** @return array<int, array{key:string,label:string,icon:string,group:string}> */
    public static function all(): array
    {
        return [
            ['key' => self::STUDENTS,      'label' => 'إدارة الطلاب',        'icon' => 'users',      'group' => 'الأشخاص'],
            ['key' => self::TEACHERS,      'label' => 'إدارة المعلمين',      'icon' => 'academic',   'group' => 'الأشخاص'],
            ['key' => self::CLASSROOMS,    'label' => 'إدارة الصفوف',        'icon' => 'building',   'group' => 'التنظيم'],
            ['key' => self::SCHEDULE,      'label' => 'الجدول الأسبوعي',     'icon' => 'calendar',   'group' => 'التنظيم'],
            ['key' => self::DAILY_LESSONS, 'label' => 'الحصص اليومية',       'icon' => 'clock',      'group' => 'التدريس'],
            ['key' => self::GRADES,        'label' => 'إدارة الدرجات',       'icon' => 'chart',      'group' => 'التدريس'],
            ['key' => self::FOLLOWUP,      'label' => 'دفتر المتابعة',       'icon' => 'book',       'group' => 'التدريس'],
            ['key' => self::STUDENT_NOTES, 'label' => 'ملاحظات الطلاب',      'icon' => 'note',       'group' => 'التدريس'],
            ['key' => self::NEWS,          'label' => 'الأخبار والأنشطة',    'icon' => 'megaphone',  'group' => 'التواصل'],
            ['key' => self::NOTIFICATIONS, 'label' => 'إدارة الإشعارات',     'icon' => 'bell',       'group' => 'التواصل'],
            ['key' => self::PERMISSIONS,   'label' => 'إدارة الصلاحيات',     'icon' => 'shield',     'group' => 'النظام'],
            ['key' => self::ACTIVITY_LOG,  'label' => 'سجل العمليات',        'icon' => 'history',    'group' => 'النظام'],
        ];
    }

    /** @return array<int, string> */
    public static function keys(): array
    {
        return array_column(self::all(), 'key');
    }

    public static function label(string $key): string
    {
        foreach (self::all() as $module) {
            if ($module['key'] === $key) {
                return $module['label'];
            }
        }

        return $key;
    }
}
