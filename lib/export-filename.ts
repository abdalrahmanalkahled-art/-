/** تعقيم اسم ملف ومنع رموز المسارات أو الرموز المحجوزة في Android وiOS. */
export function sanitizeFilename(filename: string, extension: string): string {
  const fallback = `export_${Date.now()}`;
  const baseName = (filename || fallback)
    .replace(/[\\/?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_\.]+|[_\.]+$/g, "") || fallback;
  const normalizedExtension = extension.replace(/^\./, "");
  return baseName.toLowerCase().endsWith(`.${normalizedExtension.toLowerCase()}`)
    ? baseName
    : `${baseName}.${normalizedExtension}`;
}
