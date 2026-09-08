/**
 * شكل الخطأ الموحّد — يطابق ما يرجعه Laravel (message + errors لكل حقل)
 * حتى تتعامل معه الواجهة بنفس الطريقة سواء جاء من الخادم الحقيقي أو من
 * وضع العرض التجريبي. مُعرَّف في ملف منفصل لتفادي الاستيراد الدائري بين
 * api.ts وrouter.ts.
 */
export class HttpError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}
