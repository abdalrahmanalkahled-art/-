export interface PresenceProductOption {
  id: string;
  name: string;
}

/** يبقي البحث متسامحاً مع الفراغات ويعيد كامل القائمة عند عدم وجود استعلام. */
export function filterPresenceProducts(
  products: readonly PresenceProductOption[],
  query: string,
): PresenceProductOption[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ar");
  if (!normalizedQuery) return [...products];
  return products.filter((product) => product.name.toLocaleLowerCase("ar").includes(normalizedQuery));
}
