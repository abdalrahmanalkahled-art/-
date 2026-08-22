/**
 * رموز التصميم المشتركة للشاشات الداخلية في التطبيق.
 * تُستخدم القيم الثابتة هنا لتقليل الاختلافات بين الوحدات والنوافذ.
 */
export const DESIGN = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    pill: 999,
  },
  control: {
    compact: 40,
    standard: 48,
    large: 52,
  },
  press: {
    scale: 0.97,
    opacity: 0.78,
    longPressDelay: 350,
  },
  icon: {
    small: 18,
    standard: 21,
    large: 24,
  },
} as const;
