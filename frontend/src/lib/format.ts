/** أدوات العرض: أرقام عربية-هندية وتقويمان جنبا إلى جنب. */

const AR_LOCALE = 'ar-SA-u-nu-arab';

/** ١,٢٤٨ — الأرقام العربية-الهندية في كل واجهات الإدارة. */
export function num(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat(AR_LOCALE).format(n);
}

export function percent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${num(Math.round(value * 10) / 10)}٪`;
}

/** ٢٣ مايو ٢٠٢٦ م */
export function gregorian(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat(AR_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

/** ٧ ذو القعدة ١٤٤٧ هـ */
export function hijri(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

/** التاريخان معا — قاعدة ثابتة في دليل الهوية. */
export function dualDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return `${hijri(date)} · ${gregorian(date)}`;
}

/** الأحد · ٧ ذو القعدة ١٤٤٧ هـ · ٢٣ مايو ٢٠٢٦ م */
export function fullToday(date: Date = new Date()): string {
  const weekday = new Intl.DateTimeFormat(AR_LOCALE, { weekday: 'long' }).format(date);
  return `${weekday} · ${dualDate(date)}`;
}

export function dateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  const time = new Intl.DateTimeFormat(AR_LOCALE, { hour: '2-digit', minute: '2-digit' }).format(d);
  return `${gregorian(d)} · ${time}`;
}

/** منذ ٣ ساعات */
export function relative(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const diff = (new Date(value).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(AR_LOCALE, { numeric: 'auto' });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000], ['month', 2592000], ['day', 86400],
    ['hour', 3600], ['minute', 60], ['second', 1],
  ];

  for (const [unit, seconds] of units) {
    if (Math.abs(diff) >= seconds || unit === 'second') {
      return rtf.format(Math.round(diff / seconds), unit);
    }
  }

  return '—';
}

/** الحروف الأولى للاسم — تُستخدم في الهالة الدائرية. */
export function initials(name: string): string {
  return name
    .replace(/^(د\.|أ\.|م\.)\s*/, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
}

export const STUDENT_STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: 'نشط', tone: 'success' },
  pending: { label: 'قيد المراجعة', tone: 'warning' },
  withdrawn: { label: 'منقطع', tone: 'danger' },
};

export const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
export const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
export const TERMS = ['الفصل الأول', 'الفصل الثاني', 'الفصل الثالث'];
export const ASSESSMENT_TYPES = ['اختبار قصير', 'أعمال فصلية', 'اختبار منتصف الفصل', 'الاختبار النهائي'];
