const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** يحول أي رقم شرقي ضمن نص عربي إلى الشكل الغربي 123… دون المساس بالنص. */
export function toWesternDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit))).replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)));
}

export function formatAnalyticsNumber(value: number): string {
  return toWesternDigits(value.toLocaleString("en-US"));
}

export function formatAnalyticsDate(value: Date | string): string {
  return toWesternDigits(new Date(value).toLocaleDateString("en-US"));
}

export function formatArabicDate(value: Date | string, options?: Intl.DateTimeFormatOptions): string {
  return toWesternDigits(new Date(value).toLocaleDateString("ar-SA", options));
}

export function formatAnalyticsDateTime(value: Date | string): string {
  return toWesternDigits(new Date(value).toLocaleString("en-US"));
}
