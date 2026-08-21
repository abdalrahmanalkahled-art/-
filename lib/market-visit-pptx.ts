import JSZip from "jszip";
import type { MarketVisitImageFit, MarketVisitSlideRepeatMode } from "@/lib/market-visit-report-model";
import { marketVisitProductMetricValues, type MarketVisitProductMetric } from "./market-visit-product-metrics";

export interface MarketVisitPptxImage { base64: string; extension?: "jpg" | "jpeg" | "png"; width?: number; height?: number; }
export interface MarketVisitPptxEntry { storeName: string; category: string; region: string; notes: string; images: MarketVisitPptxImage[]; }
export interface MarketVisitPptxInput { templateBase64: string; cycleName: string; generatedAt: string; visits: MarketVisitPptxEntry[]; imageFit?: MarketVisitImageFit; slideRepeatMode?: MarketVisitSlideRepeatMode; productMetrics?: MarketVisitProductMetric[]; }

type SlideReference = { id: number; relationId: string };
type Bounds = { x: number; y: number; width: number; height: number };
type ImageMarker = { shape: string; bounds: Bounds };

const IMAGE_TAGS = ["{{صورة_المحل}}", "{{صورة المحل}}", "{{store_image}}"];
const LEGACY_REPEAT_TAGS = ["{{تكرار_محل}}", "{{تكرار محل}}", "{{تكرارالمحل}}"];
const HIDDEN_TEXT = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD\u061C\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF\uFFFD]/g;
const HIDDEN_ENTITY = /&#(?:x(?:00AD|061C|200B|200C|200D|200E|200F|202A|202B|202C|202D|202E|2060|2066|2067|2068|2069|FEFF|FFFD)|(?:173|1564|8203|8204|8205|8206|8207|8234|8235|8236|8237|8238|8288|8294|8295|8296|8297|65279|65533));/g;
const TAG_SEPARATOR = "(?:<[^>]+>|&#(?:x(?:00AD|061C|200B|200C|200D|200E|200F|202A|202B|202C|202D|202E|2060|2066|2067|2068|2069|FEFF|FFFD)|(?:173|1564|8203|8204|8205|8206|8207|8234|8235|8236|8237|8238|8288|8294|8295|8296|8297|65279|65533));|[\\s\\u00ad\\u061c\\u200b-\\u200f\\u202a-\\u202e\\u2060\\u2066-\\u2069\\ufeff\\ufffd])*";

export async function buildMarketVisitPptx(input: MarketVisitPptxInput): Promise<string> {
  if (!input.visits.length) throw new Error("لا توجد محلات لإدراجها في التقرير.");
  const zip = await JSZip.loadAsync(input.templateBase64, { base64: true });
  let presentationXml = await requireText(zip, "ppt/presentation.xml");
  let presentationRelations = await requireText(zip, "ppt/_rels/presentation.xml.rels");
  let contentTypes = await requireText(zip, "[Content_Types].xml");
  const references = readSlideReferences(presentationXml);
  if (!references.length) throw new Error("القالب لا يحتوي على أي شرائح.");
  const sourceIndex = await selectRepeatSlideIndex(zip, presentationRelations, references, input.slideRepeatMode || "second-slide");
  const sourceReference = references[sourceIndex];
  const sourceNumber = slideNumberForRelation(presentationRelations, sourceReference.relationId);
  if (!sourceNumber) throw new Error("تعذر العثور على شريحة المحل المحددة للتكرار.");
  const sourceXml = await requireText(zip, slidePath(sourceNumber));
  const sourceRelations = (await optionalText(zip, slideRelationsPath(sourceNumber))) || emptyRelationships();
  const shared = { "{{اسم_الدورة}}": input.cycleName, "{{تاريخ_التقرير}}": input.generatedAt, ...marketVisitProductMetricValues(input.productMetrics || []) };
  const fixedReferences = references.filter((_, index) => index !== sourceIndex);
  await Promise.all(fixedReferences.map(async (reference) => {
    const number = slideNumberForRelation(presentationRelations, reference.relationId);
    if (!number) return;
    zip.file(slidePath(number), replaceText(await requireText(zip, slidePath(number)), shared));
  }));

  let nextSlideNumber = largestSlideNumber(zip) + 1;
  let nextSlideId = Math.max(255, ...references.map((item) => item.id)) + 1;
  let nextPresentationRelation = largestRelationNumber(presentationRelations) + 1;
  let nextMediaNumber = largestMediaNumber(zip) + 1;
  const renderedReferences: SlideReference[] = [sourceReference];

  for (const [index, visit] of input.visits.entries()) {
    const isCopy = index > 0;
    const rendered = renderVisitSlide(isCopy ? withoutCloneIdentity(sourceXml) : sourceXml, isCopy ? withoutNotesSlideRelation(sourceRelations) : sourceRelations, visit, shared, nextMediaNumber, input.imageFit || "fill");
    nextMediaNumber += rendered.media.length;
    for (const media of rendered.media) {
      zip.file(media.path, media.base64, { base64: true, createFolders: true });
      contentTypes = ensureImageContentType(contentTypes, media.extension);
    }
    if (index === 0) {
      zip.file(slidePath(sourceNumber), rendered.xml);
      zip.file(slideRelationsPath(sourceNumber), rendered.relationships);
    } else {
      zip.file(slidePath(nextSlideNumber), rendered.xml);
      zip.file(slideRelationsPath(nextSlideNumber), rendered.relationships);
      const relationId = `rId${nextPresentationRelation++}`;
      presentationRelations = appendRelationship(presentationRelations, relationId, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide", `slides/slide${nextSlideNumber}.xml`);
      contentTypes = appendSlideContentType(contentTypes, nextSlideNumber);
      renderedReferences.push({ id: nextSlideId++, relationId });
      nextSlideNumber += 1;
    }
  }

  const finalReferences = [...references.slice(0, sourceIndex), ...renderedReferences, ...references.slice(sourceIndex + 1)];
  presentationXml = replaceSlideReferences(presentationXml, finalReferences);
  zip.file("ppt/presentation.xml", presentationXml);
  zip.file("ppt/_rels/presentation.xml.rels", presentationRelations);
  zip.file("[Content_Types].xml", contentTypes);
  await updateSlideCount(zip, finalReferences.length);
  return zip.generateAsync({ type: "base64", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

function renderVisitSlide(sourceXml: string, sourceRelations: string, visit: MarketVisitPptxEntry, shared: Record<string, string>, mediaStart: number, imageFit: MarketVisitImageFit) {
  const values = { ...shared, "{{اسم_المحل}}": visit.storeName, "{{تصنيف_المحل}}": visit.category, "{{منطقة_المحل}}": visit.region, "{{ملاحظات_الاستبيان}}": visit.notes, "{{تكرار_محل}}": "", "{{تكرار محل}}": "", "{{تكرارالمحل}}": "" };
  let xml = replaceText(sourceXml, values);
  let relationships = sourceRelations;
  const markerShape = imageShape(xml);
  if (!markerShape) return { xml, relationships, media: [] as EmbeddedMedia[] };
  const marker = { shape: markerShape, bounds: shapeBounds(markerShape) };
  const bounds = marker.bounds;

  const validImages = visit.images.flatMap((image) => validImage(image) ? [image] : []);
  if (!validImages.length || !bounds) return { xml: replaceTag(xml, IMAGE_TAGS, "لا توجد صورة توثيق"), relationships, media: [] as EmbeddedMedia[] };

  let nextRelation = largestRelationNumber(relationships) + 1;
  let nextShape = largestShapeNumber(xml) + 1;
  const columns = Math.ceil(Math.sqrt(validImages.length));
  const rows = Math.ceil(validImages.length / columns);
  const gap = 16000;
  const width = Math.floor((bounds.width - gap * (columns - 1)) / columns);
  const height = Math.floor((bounds.height - gap * (rows - 1)) / rows);
  const pictures: string[] = [];
  const media: EmbeddedMedia[] = [];

  validImages.forEach((image, index) => {
    const extension = image.extension === "png" ? "png" : "jpeg";
    const fileName = `market-visit-${mediaStart + index}.${extension}`;
    const relationId = `rId${nextRelation++}`;
    relationships = appendRelationship(relationships, relationId, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", `../media/${fileName}`);
    const column = index % columns;
    const row = Math.floor(index / columns);
    pictures.push(pictureXml(relationId, nextShape++, index + 1, fitImageBounds({ x: bounds.x + column * (width + gap), y: bounds.y + row * (height + gap), width, height }, image, imageFit)));
    media.push({ path: `ppt/media/${fileName}`, base64: cleanBase64(image.base64), extension });
  });
  return { xml: xml.replace(marker.shape, pictures.join("")), relationships, media };
}

function replaceText(xml: string, values: Record<string, string>) {
  let output = cleanSlideText(xml);
  for (const [tag, value] of Object.entries(values)) output = replaceTag(output, [tag], value);
  return output;
}

function replaceTag(xml: string, tags: string[], value: string) {
  const safeValue = escapeXml(cleanText(value));
  return tags.reduce((result, tag) => result.replace(tagExpression(tag), safeValue).split(tag).join(safeValue), xml);
}

function cleanSlideText(xml: string) {
  return xml.replace(/(<a:t\b[^>]*>)([\s\S]*?)(<\/a:t>)/g, (_match, open, value, close) => `${open}${cleanText(value).replace(HIDDEN_ENTITY, "")}${close}`);
}

function cleanText(value: string) { return String(value || "").replace(HIDDEN_TEXT, ""); }
function tagExpression(tag: string) { return new RegExp(tag.split("").map(escapeRegExp).join(TAG_SEPARATOR), "g"); }
async function selectRepeatSlideIndex(zip: JSZip, relations: string, references: SlideReference[], mode: MarketVisitSlideRepeatMode): Promise<number> {
  if (mode === "second-slide") {
    if (references.length < 3) throw new Error("في وضع الشريحة الثانية، يجب أن يحوي القالب ثلاث شرائح على الأقل: مقدمة، شريحة محل، وخاتمة.");
    return 1;
  }
  const matches: number[] = [];
  for (const [index, reference] of references.entries()) {
    const number = slideNumberForRelation(relations, reference.relationId);
    if (!number) continue;
    const xml = await requireText(zip, slidePath(number));
    if (LEGACY_REPEAT_TAGS.some((tag) => tagExpression(tag).test(cleanSlideText(xml)))) matches.push(index);
  }
  if (!matches.length) throw new Error("لم يُعثر على وسم {{تكرار_محل}}. أضفه مرة واحدة إلى الشريحة المراد تكرارها أو اختر وضع الشريحة الثانية.");
  if (matches.length > 1) throw new Error("يجب أن يظهر وسم {{تكرار_محل}} في شريحة واحدة فقط.");
  return matches[0];
}
function imageShape(xml: string): string | null {
  const shapes = xml.match(/<p:sp(?:\s[^>]*)?>[\s\S]*?<\/p:sp>/g) || [];
  return shapes.find((candidate) => IMAGE_TAGS.some((tag) => tagExpression(tag).test(candidate))) || null;
}

function shapeBounds(shape: string): Bounds | null {
  const transform = shape.match(/<a:xfrm\b[^>]*>[\s\S]*?<\/a:xfrm>/)?.[0];
  const offset = transform?.match(/<a:off\b[^>]*\/>/)?.[0];
  const extent = transform?.match(/<a:ext\b[^>]*\/>/)?.[0];
  const x = offset && attribute(offset, "x"); const y = offset && attribute(offset, "y");
  const width = extent && attribute(extent, "cx"); const height = extent && attribute(extent, "cy");
  return x && y && width && height ? { x: Number(x), y: Number(y), width: Number(width), height: Number(height) } : null;
}

function validImage(image: MarketVisitPptxImage) {
  const base64 = cleanBase64(image.base64);
  return image.extension === "png" ? base64.startsWith("iVBORw0KGgo") : base64.startsWith("/9j/");
}

function cleanBase64(value: string) { return String(value || "").replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "").replace(/\s/g, ""); }
function pictureXml(relationId: string, shapeId: number, index: number, fitted: FittedImage) {
  const crop = fitted.crop ? `<a:srcRect${fitted.crop.left ? ` l="${fitted.crop.left}"` : ""}${fitted.crop.top ? ` t="${fitted.crop.top}"` : ""}${fitted.crop.right ? ` r="${fitted.crop.right}"` : ""}${fitted.crop.bottom ? ` b="${fitted.crop.bottom}"` : ""}/>` : "";
  const { bounds } = fitted;
  return `<p:pic><p:nvPicPr><p:cNvPr id="${shapeId}" name="صورة المحل ${index}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${relationId}"/>${crop}<a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${bounds.x}" y="${bounds.y}"/><a:ext cx="${bounds.width}" cy="${bounds.height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
}

function fitImageBounds(frame: Bounds, image: MarketVisitPptxImage, mode: MarketVisitImageFit): FittedImage {
  if (!image.width || !image.height) return { bounds: frame };
  const imageRatio = image.width / image.height;
  const frameRatio = frame.width / frame.height;
  if (mode === "fit-height") {
    const width = Math.round(frame.height * imageRatio);
    return { bounds: { x: frame.x + Math.round((frame.width - width) / 2), y: frame.y, width, height: frame.height } };
  }
  if (mode === "fit-width") {
    const height = Math.round(frame.width / imageRatio);
    return { bounds: { x: frame.x, y: frame.y + Math.round((frame.height - height) / 2), width: frame.width, height } };
  }
  if (imageRatio > frameRatio) {
    const visible = frameRatio / imageRatio;
    const crop = Math.round(((1 - visible) * 100000) / 2);
    return { bounds: frame, crop: { left: crop, right: crop } };
  }
  if (imageRatio < frameRatio) {
    const visible = imageRatio / frameRatio;
    const crop = Math.round(((1 - visible) * 100000) / 2);
    return { bounds: frame, crop: { top: crop, bottom: crop } };
  }
  return { bounds: frame };
}

function readSlideReferences(xml: string): SlideReference[] {
  const list = xml.match(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/)?.[0] || "";
  return [...list.matchAll(/<p:sldId\b([^>]*?)(?:\/>|><\/p:sldId>)/g)].map((match) => ({ id: Number(attribute(match[1], "id")), relationId: attribute(match[1], "r:id") || "" })).filter((item) => Number.isFinite(item.id) && item.relationId);
}

function replaceSlideReferences(xml: string, references: SlideReference[]) {
  const list = `<p:sldIdLst>${references.map((item) => `<p:sldId id="${item.id}" r:id="${item.relationId}"/>`).join("")}</p:sldIdLst>`;
  return xml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, list);
}

function slideNumberForRelation(xml: string, relationId: string) {
  for (const match of xml.matchAll(/<Relationship\b([^>]*)\/>/g)) {
    if (attribute(match[1], "Id") !== relationId) continue;
    return Number((attribute(match[1], "Target") || "").match(/slide(\d+)\.xml$/)?.[1] || 0) || null;
  }
  return null;
}

function appendRelationship(xml: string, id: string, type: string, target: string) { return xml.replace("</Relationships>", `<Relationship Id="${id}" Type="${type}" Target="${target}"/></Relationships>`); }
function appendSlideContentType(xml: string, number: number) { return xml.replace("</Types>", `<Override PartName="/ppt/slides/slide${number}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`); }
function ensureImageContentType(xml: string, extension: "png" | "jpeg") { return new RegExp(`<Default\\s+Extension="${extension}"`, "i").test(xml) ? xml : xml.replace("</Types>", `<Default Extension="${extension}" ContentType="image/${extension === "png" ? "png" : "jpeg"}"/></Types>`); }
function largestRelationNumber(xml: string) { return Math.max(0, ...[...xml.matchAll(/\bId="rId(\d+)"/g)].map((match) => Number(match[1]))); }
function largestShapeNumber(xml: string) { return Math.max(1, ...[...xml.matchAll(/<p:cNvPr\b[^>]*\bid="(\d+)"/g)].map((match) => Number(match[1]))); }
function largestSlideNumber(zip: JSZip) { return Math.max(0, ...Object.keys(zip.files).map((path) => Number(path.match(/^ppt\/slides\/slide(\d+)\.xml$/)?.[1] || 0))); }
function largestMediaNumber(zip: JSZip) { return Math.max(0, ...Object.keys(zip.files).map((path) => Number(path.match(/^ppt\/media\/market-visit-(\d+)\./)?.[1] || 0))); }
function slidePath(number: number) { return `ppt/slides/slide${number}.xml`; }
function slideRelationsPath(number: number) { return `ppt/slides/_rels/slide${number}.xml.rels`; }
function emptyRelationships() { return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"></Relationships>"; }
function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function escapeXml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }
function attribute(xml: string, name: string) { return xml.match(new RegExp(`(?:^|\\s)${escapeRegExp(name)}="([^"]+)"`))?.[1] || null; }
async function optionalText(zip: JSZip, path: string) { return zip.file(path)?.async("string") || null; }
async function requireText(zip: JSZip, path: string) { const text = await optionalText(zip, path); if (text === null) throw new Error(`القالب لا يحتوي على ${path}.`); return text; }
async function updateSlideCount(zip: JSZip, count: number) { const path = "docProps/app.xml"; const xml = await optionalText(zip, path); if (!xml) return; zip.file(path, xml.includes("<Slides>") ? xml.replace(/<Slides>\d+<\/Slides>/, `<Slides>${count}</Slides>`) : xml.replace("</Properties>", `<Slides>${count}</Slides></Properties>`)); }
function withoutNotesSlideRelation(xml: string) { return xml.replace(/<Relationship\b[^>]*\/>/g, (relationship) => relationship.includes("/notesSlide") ? "" : relationship); }
function withoutCloneIdentity(xml: string) { return xml.replace(/<p:ext\b[^>]*>\s*<(?:a16|p14):creationId\b[^>]*\/>\s*<\/p:ext>/g, "").replace(/<(?:a16|p14):creationId\b[^>]*\/>/g, ""); }

type EmbeddedMedia = { path: string; base64: string; extension: "png" | "jpeg" };
type Crop = { left?: number; top?: number; right?: number; bottom?: number };
type FittedImage = { bounds: Bounds; crop?: Crop };
