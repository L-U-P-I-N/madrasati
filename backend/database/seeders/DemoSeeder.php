<?php

namespace Database\Seeders;

use App\Http\Controllers\PermissionController;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\DailyLesson;
use App\Models\FollowupEntry;
use App\Models\Grade;
use App\Models\News;
use App\Models\ScheduleSlot;
use App\Models\Student;
use App\Models\StudentNote;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use App\Models\User;
use App\Support\Notifier;
use App\Support\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * بيانات تجريبية كاملة تغطي الأدوار الخمسة والسيناريوهات الواردة في التقرير،
 * حتى يمكن تجربة النظام فور التثبيت دون إدخال يدوي.
 */
class DemoSeeder extends Seeder
{
    private string $password;

    public function run(): void
    {
        $this->password = env('DEMO_PASSWORD', 'Madrasati@2026');

        $year = AcademicYear::create([
            'name' => '١٤٤٧ هـ / ٢٠٢٦ م',
            'hijri_label' => '١٤٤٧ هـ',
            'starts_on' => '2025-08-24',
            'ends_on' => '2026-06-18',
            'is_current' => true,
        ]);

        $subjects = $this->subjects();
        $classrooms = $this->classrooms($year);
        $staff = $this->staff();
        $teachers = $this->teachers();

        $this->assign($teachers, $subjects, $classrooms);
        $students = $this->students($classrooms);
        $this->schedule($teachers, $subjects, $classrooms);
        $this->lessons($teachers, $subjects, $classrooms);
        $this->grades($teachers, $subjects, $classrooms, $students);
        $this->followup($teachers, $subjects, $classrooms);
        $this->notes($teachers, $students, $subjects);
        $this->news($staff['principal']);

        $this->command->info('تم إنشاء البيانات التجريبية. كلمة المرور الموحّدة: '.$this->password);
    }

    /** @return array<string, Subject> */
    private function subjects(): array
    {
        $rows = [
            ['القرآن الكريم', 'QURAN'],
            ['اللغة العربية', 'ARB'],
            ['الرياضيات', 'MATH'],
            ['العلوم', 'SCI'],
            ['اللغة الإنجليزية', 'ENG'],
            ['الدراسات الاجتماعية', 'SOC'],
            ['الحاسب الآلي', 'CS'],
        ];

        $subjects = [];

        foreach ($rows as [$name, $code]) {
            $subjects[$code] = Subject::create(['name' => $name, 'code' => $code, 'max_grade' => 100]);
        }

        return $subjects;
    }

    /** @return array<string, Classroom> */
    private function classrooms(AcademicYear $year): array
    {
        $rows = [
            ['الثامن', 'ب'],
            ['التاسع', 'أ'],
            ['العاشر', 'أ'],
            ['العاشر', 'ب'],
            ['الحادي عشر', 'أ'],
        ];

        $classrooms = [];

        foreach ($rows as [$level, $section]) {
            $classroom = Classroom::create([
                'academic_year_id' => $year->id,
                'grade_level' => $level,
                'section' => $section,
                'name' => "{$level} — {$section}",
                'capacity' => 30,
            ]);

            $classrooms[$classroom->name] = $classroom;
        }

        return $classrooms;
    }

    /** @return array<string, User> */
    private function staff(): array
    {
        $principal = $this->user('د. عبدالله الراجحي', 'principal', Role::PRINCIPAL);
        $vice = $this->user('أ. سعد المطيري', 'vice', Role::VICE_PRINCIPAL);
        $secretary = $this->user('أ. هند العتيبي', 'secretary', Role::SECRETARY);

        PermissionController::applyRoleDefaults($principal);
        PermissionController::applyRoleDefaults($vice, $principal);
        PermissionController::applyRoleDefaults($secretary, $principal);

        return compact('principal', 'vice', 'secretary');
    }

    /** @return array<string, Teacher> */
    private function teachers(): array
    {
        $rows = [
            ['أ. ماجد الشهري', 'teacher.majed', 'T-1001', 'الرياضيات'],
            ['أ. نوف الدوسري', 'teacher.nouf', 'T-1002', 'اللغة الإنجليزية'],
            ['أ. خالد الغامدي', 'teacher.khalid', 'T-1003', 'العلوم'],
            ['أ. ريم الحارثي', 'teacher.reem', 'T-1004', 'اللغة العربية'],
        ];

        $teachers = [];

        foreach ($rows as [$name, $username, $employeeNo, $specialization]) {
            $user = $this->user($name, $username, Role::TEACHER);
            PermissionController::applyRoleDefaults($user);

            $teachers[$employeeNo] = Teacher::create([
                'user_id' => $user->id,
                'employee_no' => $employeeNo,
                'specialization' => $specialization,
                'qualification' => 'بكالوريوس تربية',
                'hired_on' => now()->subYears(random_int(1, 9)),
            ]);
        }

        return $teachers;
    }

    private function assign(array $teachers, array $subjects, array $classrooms): void
    {
        $map = [
            'T-1001' => ['MATH', ['العاشر — أ', 'العاشر — ب', 'الحادي عشر — أ']],
            'T-1002' => ['ENG', ['العاشر — أ', 'التاسع — أ', 'الثامن — ب']],
            'T-1003' => ['SCI', ['العاشر — أ', 'العاشر — ب', 'التاسع — أ']],
            'T-1004' => ['ARB', ['الثامن — ب', 'التاسع — أ', 'العاشر — أ']],
        ];

        foreach ($map as $employeeNo => [$code, $classroomNames]) {
            foreach ($classroomNames as $name) {
                TeachingAssignment::create([
                    'teacher_id' => $teachers[$employeeNo]->id,
                    'subject_id' => $subjects[$code]->id,
                    'classroom_id' => $classrooms[$name]->id,
                ]);
            }
        }

        // معلم فصل لكل صف من الفصول الرئيسية
        $classrooms['العاشر — أ']->update(['homeroom_teacher_id' => $teachers['T-1001']->id]);
        $classrooms['التاسع — أ']->update(['homeroom_teacher_id' => $teachers['T-1004']->id]);
    }

    /** @return array<int, Student> */
    private function students(array $classrooms): array
    {
        $rows = [
            ['عبدالرحمن السالم', 'العاشر — أ', 'active'],
            ['لمى الزهراني', 'العاشر — أ', 'active'],
            ['يوسف الحربي', 'الثامن — ب', 'pending'],
            ['نور القحطاني', 'الحادي عشر — أ', 'active'],
            ['فيصل العنزي', 'العاشر — أ', 'active'],
            ['جواهر السبيعي', 'العاشر — ب', 'active'],
            ['تركي الشمري', 'التاسع — أ', 'active'],
            ['رزان البقمي', 'التاسع — أ', 'active'],
            ['محمد الدوسري', 'العاشر — ب', 'active'],
            ['سارة المالكي', 'الثامن — ب', 'active'],
            ['عمر الزهراني', 'الحادي عشر — أ', 'active'],
            ['ديمة العسيري', 'العاشر — أ', 'active'],
        ];

        $students = [];

        foreach ($rows as $index => [$name, $classroomName, $status]) {
            $studentNo = 'S-'.str_pad((string) (2601 + $index), 5, '0', STR_PAD_LEFT);

            $user = User::create([
                'name' => $name,
                'username' => $studentNo,
                'password' => $this->password,
                'role' => Role::STUDENT,
                'is_active' => true,
            ]);

            PermissionController::applyRoleDefaults($user);

            $students[] = Student::create([
                'user_id' => $user->id,
                'classroom_id' => $classrooms[$classroomName]->id,
                'student_no' => $studentNo,
                'full_name' => $name,
                'guardian_name' => 'ولي أمر '.$name,
                'guardian_phone' => '05'.random_int(10000000, 59999999),
                'status' => $status,
                'enrolled_on' => now()->subDays(random_int(5, 200)),
                'birth_date' => now()->subYears(random_int(13, 17)),
            ]);
        }

        return $students;
    }

    private function schedule(array $teachers, array $subjects, array $classrooms): void
    {
        $plan = [
            // [الفصل، اليوم، الحصة، المادة، المعلم]
            ['العاشر — أ', 0, 1, 'MATH', 'T-1001'],
            ['العاشر — أ', 0, 2, 'ENG', 'T-1002'],
            ['العاشر — أ', 0, 3, 'SCI', 'T-1003'],
            ['العاشر — أ', 1, 1, 'ARB', 'T-1004'],
            ['العاشر — أ', 1, 2, 'MATH', 'T-1001'],
            ['العاشر — أ', 2, 1, 'SCI', 'T-1003'],
            ['العاشر — أ', 2, 2, 'ENG', 'T-1002'],
            ['العاشر — ب', 0, 4, 'MATH', 'T-1001'],
            ['العاشر — ب', 1, 3, 'SCI', 'T-1003'],
            ['التاسع — أ', 0, 5, 'ARB', 'T-1004'],
            ['التاسع — أ', 1, 4, 'ENG', 'T-1002'],
            ['التاسع — أ', 2, 3, 'SCI', 'T-1003'],
            ['الثامن — ب', 0, 6, 'ENG', 'T-1002'],
            ['الثامن — ب', 1, 5, 'ARB', 'T-1004'],
            ['الحادي عشر — أ', 2, 4, 'MATH', 'T-1001'],
        ];

        $times = [
            1 => ['07:00', '07:45'], 2 => ['07:50', '08:35'], 3 => ['08:40', '09:25'],
            4 => ['09:45', '10:30'], 5 => ['10:35', '11:20'], 6 => ['11:25', '12:10'],
            7 => ['12:30', '13:15'], 8 => ['13:20', '14:05'],
        ];

        foreach ($plan as [$classroomName, $day, $period, $code, $employeeNo]) {
            ScheduleSlot::create([
                'classroom_id' => $classrooms[$classroomName]->id,
                'subject_id' => $subjects[$code]->id,
                'teacher_id' => $teachers[$employeeNo]->id,
                'day_of_week' => $day,
                'period' => $period,
                'starts_at' => $times[$period][0],
                'ends_at' => $times[$period][1],
            ]);
        }
    }

    private function lessons(array $teachers, array $subjects, array $classrooms): void
    {
        $rows = [
            ['العاشر — أ', 'MATH', 'T-1001', 1, 'المعادلات من الدرجة الثانية', 'شرح صيغة الحل العام مع خمسة أمثلة تطبيقية على السبورة، وحل تمارين الكتاب ٣ إلى ٧.', 'تمارين الصفحة ٨٤'],
            ['العاشر — أ', 'ENG', 'T-1002', 2, 'Present Perfect Tense', 'مراجعة التصريف الثالث للأفعال الشائعة، وتدريب شفهي على الفرق بين since و for.', 'Workbook page 32'],
            ['العاشر — أ', 'SCI', 'T-1003', 3, 'التركيب الضوئي', 'تجربة عملية في المختبر لإثبات إنتاج الأكسجين، ومناقشة العوامل المؤثرة في معدل البناء الضوئي.', null],
            ['التاسع — أ', 'ARB', 'T-1004', 5, 'الممنوع من الصرف', 'شرح العلل التسع مع استخراج أمثلة من نص القراءة، وتدريب إعرابي جماعي.', 'حفظ الأبيات من ١ إلى ٦'],
        ];

        foreach ($rows as $index => [$classroomName, $code, $employeeNo, $period, $title, $content, $homework]) {
            DailyLesson::create([
                'classroom_id' => $classrooms[$classroomName]->id,
                'subject_id' => $subjects[$code]->id,
                'teacher_id' => $teachers[$employeeNo]->id,
                'lesson_date' => Carbon::today()->subDays(intdiv($index, 3)),
                'period' => $period,
                'title' => $title,
                'content' => $content,
                'homework' => $homework,
            ]);
        }
    }

    private function grades(array $teachers, array $subjects, array $classrooms, array $students): void
    {
        $map = [
            'MATH' => 'T-1001',
            'ENG' => 'T-1002',
            'SCI' => 'T-1003',
            'ARB' => 'T-1004',
        ];

        foreach ($students as $student) {
            if ($student->status !== 'active') {
                continue;
            }

            foreach ($map as $code => $employeeNo) {
                $assigned = TeachingAssignment::where('teacher_id', $teachers[$employeeNo]->id)
                    ->where('classroom_id', $student->classroom_id)
                    ->where('subject_id', $subjects[$code]->id)
                    ->exists();

                if (! $assigned) {
                    continue;
                }

                foreach (['أعمال فصلية' => 40, 'الاختبار النهائي' => 60] as $type => $max) {
                    Grade::create([
                        'student_id' => $student->id,
                        'subject_id' => $subjects[$code]->id,
                        'classroom_id' => $student->classroom_id,
                        'teacher_id' => $teachers[$employeeNo]->id,
                        'term' => 'الفصل الأول',
                        'assessment_type' => $type,
                        'score' => random_int((int) ($max * 0.6), $max),
                        'max_score' => $max,
                    ]);
                }
            }
        }
    }

    private function followup(array $teachers, array $subjects, array $classrooms): void
    {
        FollowupEntry::create([
            'teacher_id' => $teachers['T-1001']->id,
            'subject_id' => $subjects['MATH']->id,
            'classroom_id' => $classrooms['العاشر — أ']->id,
            'term' => 'الفصل الأول',
            'month' => 3,
            'objectives' => "١. إتقان حل المعادلات من الدرجة الثانية بالطرق الثلاث.\n٢. ربط الدالة التربيعية بتمثيلها البياني.\n٣. توظيف المعادلات في مسائل حياتية.",
            'planned_lessons' => "الأسبوع الأول: التحليل إلى العوامل.\nالأسبوع الثاني: إكمال المربع.\nالأسبوع الثالث: الصيغة العامة.\nالأسبوع الرابع: مراجعة وتقويم.",
            'achievements' => 'أُنجزت دروس الأسبوعين الأول والثاني وفق الخطة.',
        ]);

        FollowupEntry::create([
            'teacher_id' => $teachers['T-1004']->id,
            'subject_id' => $subjects['ARB']->id,
            'classroom_id' => $classrooms['التاسع — أ']->id,
            'term' => 'الفصل الأول',
            'month' => 3,
            'objectives' => "١. تمييز الممنوع من الصرف وعلله.\n٢. تحسين مهارة الإعراب التطبيقي.\n٣. إثراء الحصيلة اللغوية من نصوص المطالعة.",
            'planned_lessons' => "الأسبوع الأول: العلم الممنوع من الصرف.\nالأسبوع الثاني: الصفة الممنوعة من الصرف.\nالأسبوع الثالث: صيغة منتهى الجموع.",
            'achievements' => null,
        ]);
    }

    private function notes(array $teachers, array $students, array $subjects): void
    {
        $rows = [
            [0, 'positive', 'مشاركة متميزة', 'أظهر الطالب تفاعلا لافتا في حصة الرياضيات وحلّ تمرينا إضافيا أمام زملائه.', 'MATH', 'T-1001'],
            [1, 'positive', 'التزام بالواجبات', 'سلّمت الطالبة جميع واجبات الشهر في وقتها وبإتقان واضح.', 'ENG', 'T-1002'],
            [4, 'negative', 'تأخر متكرر', 'تكرر تأخر الطالب عن الحصة الأولى ثلاث مرات هذا الأسبوع.', null, 'T-1001'],
            [6, 'positive', 'تحسن ملحوظ', 'ارتفع مستوى الطالب في الإعراب التطبيقي مقارنة بالشهر الماضي.', 'ARB', 'T-1004'],
        ];

        foreach ($rows as [$studentIndex, $type, $title, $body, $code, $employeeNo]) {
            StudentNote::create([
                'student_id' => $students[$studentIndex]->id,
                'author_id' => $teachers[$employeeNo]->user_id,
                'subject_id' => $code ? $subjects[$code]->id : null,
                'type' => $type,
                'title' => $title,
                'body' => $body,
                'noted_on' => now()->subDays(random_int(1, 12)),
            ]);
        }
    }

    private function news(User $principal): void
    {
        $rows = [
            ['news', 'بدء التسجيل في برنامج الموهبة للفصل الثاني', 'يفتح باب الترشيح لطلاب المرحلتين المتوسطة والثانوية حتى نهاية الشهر.', "تعلن إدارة المدرسة عن فتح باب الترشيح لبرنامج رعاية الموهوبين للفصل الدراسي الثاني.\n\nتُقدَّم الطلبات لدى المرشد الطلابي، ويشترط ألا يقل المعدل التراكمي عن ٩٠٪، مع تزكية من معلم المادة."],
            ['activity', 'اليوم الرياضي السنوي', 'فعاليات رياضية لجميع المراحل يوم الأربعاء القادم في ساحة المدرسة.', "ينظّم قسم النشاط اليوم الرياضي السنوي يوم الأربعاء من الساعة الثامنة حتى الحادية عشرة.\n\nتشمل الفعاليات مسابقات الجري والقوى والكرة الطائرة، وتُكرَّم الفرق الفائزة في الطابور الصباحي التالي."],
            ['news', 'جدول الاختبارات النهائية للفصل الأول', 'اعتُمد الجدول ويمكن للطلاب الاطلاع عليه من لوحاتهم الشخصية.', "اعتمدت الإدارة جدول الاختبارات النهائية للفصل الدراسي الأول.\n\nتبدأ الاختبارات في الأسبوع الأخير من الشهر، ويُرجى من الطلاب مراجعة الجدول من خلال قسم «جدولي الأسبوعي» في حساباتهم."],
        ];

        foreach ($rows as $index => [$type, $title, $excerpt, $body]) {
            $news = News::create([
                'author_id' => $principal->id,
                'type' => $type,
                'title' => $title,
                'excerpt' => $excerpt,
                'body' => $body,
                'is_published' => true,
                'published_at' => now()->subDays($index * 3),
            ]);

            Notifier::newsPublished($news);
        }
    }

    private function user(string $name, string $username, string $role): User
    {
        return User::create([
            'name' => $name,
            'username' => $username,
            'email' => $username.'@madrasati.sa',
            'password' => $this->password,
            'role' => $role,
            'is_active' => true,
        ]);
    }
}
