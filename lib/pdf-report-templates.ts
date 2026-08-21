import { DEFAULT_PDF_CUSTOMIZATION, type PdfColorPreset, type PdfCustomization, type PdfTemplateId } from "./app-settings-model";

const PRESET_COLORS: Record<Exclude<PdfColorPreset, "default">, string> = { blue: "#1F5EB8", teal: "#0F766E", violet: "#7C3AED", amber: "#B45309", slate: "#475569" };

function colorFor(preset: PdfColorPreset): string | null {
  return preset === "default" ? null : PRESET_COLORS[preset];
}

export function applyPdfReportTemplate(html: string, _templateId: PdfTemplateId, _reportTitle: string, customization: PdfCustomization = DEFAULT_PDF_CUSTOMIZATION): string {
  const tableColor = colorFor(customization.tableColor);
  const chartColor = colorFor(customization.chartAccent);
  const css: string[] = [];

  if (tableColor) css.push(`table th{background:${tableColor}!important}table td{border-bottom-color:${tableColor}30!important}`);
  if (customization.tableStyle === "zebra") css.push("table tr:nth-child(even){background:#f8fafc!important}");
  if (customization.tableStyle === "outlined") css.push("table th,table td{border:1px solid #d9e2f2!important}");
  if (chartColor) css.push(`.chart-wrap{border-color:${chartColor}55!important}.donut-value{stroke:${chartColor}!important}.metric strong,h2{color:${chartColor}!important}.chart-wrap{box-shadow:0 4px 14px ${chartColor}12}`);
  if (customization.chartAppearance === "soft") css.push(".chart-wrap{background:#f8fafc!important;border-radius:18px!important;padding:14px!important}");
  if (customization.chartAppearance === "minimal") css.push(".chart-wrap{border-color:transparent!important;padding:4px!important;box-shadow:none!important}");

  return css.length ? html.replace("</head>", `<style>${css.join("")}</style></head>`) : html;
}
