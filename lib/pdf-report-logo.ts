import { loadAnalyticsSettings, logoUriToDataUri } from "./analytics-settings";

/** الشعار الموحد الذي يختاره المستخدم من إعدادات تقارير الاستبيانات والدورات. */
export async function loadSharedPdfReportLogo(): Promise<string | undefined> {
  try {
    const settings = await loadAnalyticsSettings();
    return await logoUriToDataUri(settings.logoUri);
  } catch {
    return undefined;
  }
}

export function pdfLogoMarkup(logoDataUri?: string): string {
  return logoDataUri ? `<img class="shared-report-logo" src="${logoDataUri}" alt="شعار التقرير"/>` : "";
}
