/** تحافظ القوالب القديمة على عرض النسبة التي كانت متاحة قبل إضافة الإعداد. */
export function shouldShowShelfPercentage(showShelfPercentage?: boolean): boolean {
  return showShelfPercentage !== false;
}

export function shouldShowProductPrice(showProductPrice?: boolean): boolean {
  return showProductPrice === true;
}
