import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { buildMarketVisitPptx } from "../market-visit-pptx";

function toBase64(bytes: Uint8Array) { return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")); }
const VALID_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLQmAAAAABJRU5ErkJggg==";

async function templateBase64() {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types></Types>");
  zip.file("ppt/presentation.xml", '<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/><p:sldId id="258" r:id="rId3"/></p:sldIdLst></p:presentation>');
  zip.file("ppt/_rels/presentation.xml.rels", '<Relationships><Relationship Id="rId1" Target="slides/slide1.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/><Relationship Id="rId3" Target="slides/slide3.xml"/></Relationships>');
  zip.file("ppt/slides/slide1.xml", "<p:sld>مقدمة {{اسم_الدورة}}</p:sld>");
  zip.file("ppt/slides/slide2.xml", '<p:sld><p:sp><p:txBody>{{تكرار_محل}} {{اسم_المحل}} {{تصنيف_المحل}} {{منطقة_المحل}} {{ملاحظات_الاستبيان}}</p:txBody></p:sp><p:sp><p:txBody>{{صورة_المحل}}</p:txBody></p:sp></p:sld>');
  zip.file("ppt/slides/slide3.xml", "<p:sld>خاتمة {{تاريخ_التقرير}}</p:sld>");
  return toBase64(await zip.generateAsync({ type: "uint8array" }));
}

async function splitTagTemplateBase64() {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types></Types>");
  zip.file("ppt/presentation.xml", '<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/><p:sldId id="258" r:id="rId3"/></p:sldIdLst></p:presentation>');
  zip.file("ppt/_rels/presentation.xml.rels", '<Relationships><Relationship Id="rId1" Target="slides/slide1.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/><Relationship Id="rId3" Target="slides/slide3.xml"/></Relationships>');
  zip.file("ppt/slides/slide1.xml", "<p:sld>مقدمة</p:sld>");
  zip.file("ppt/slides/slide2.xml", '<p:sld><p:sp><p:txBody><a:t>{{تكرار_</a:t><a:t>محل}}</a:t><a:t> {{اسم_</a:t><a:t>المحل}}</a:t></p:txBody></p:sp></p:sld>');
  zip.file("ppt/slides/slide3.xml", "<p:sld>خاتمة</p:sld>");
  return toBase64(await zip.generateAsync({ type: "uint8array" }));
}

describe("قالب PowerPoint لزيارة السوق", () => {
  it("يكرر شريحة المحل لكل نتيجة من الدورة ويحافظ على المقدمة والخاتمة", async () => {
    const result = await buildMarketVisitPptx({
      templateBase64: await templateBase64(), cycleName: "دورة آذار", generatedAt: "2026-08-18",
      visits: [
        { storeName: "محل النخبة", category: "نخبة", region: "دمشق", notes: "ملاحظة أولى", images: [] },
        { storeName: "محل العادي", category: "عادي", region: "حلب", notes: "ملاحظة ثانية", images: [] },
        { storeName: "محل ثالث", category: "ضعيف", region: "حمص", notes: "ملاحظة ثالثة", images: [] },
      ],
    });
    const zip = await JSZip.loadAsync(Uint8Array.from(atob(result), (letter) => letter.charCodeAt(0)));
    const presentation = await zip.file("ppt/presentation.xml")?.async("string");
    const introduction = await zip.file("ppt/slides/slide1.xml")?.async("string");
    const firstVisit = await zip.file("ppt/slides/slide2.xml")?.async("string");
    const secondVisit = await zip.file("ppt/slides/slide4.xml")?.async("string");
    const thirdVisit = await zip.file("ppt/slides/slide5.xml")?.async("string");
    const closing = await zip.file("ppt/slides/slide3.xml")?.async("string");

    expect(presentation).toContain('r:id="rId4"');
    expect(introduction).toContain("دورة آذار");
    expect(firstVisit).toContain("محل النخبة");
    expect(firstVisit).toContain("نخبة");
    expect(firstVisit).toContain("دمشق");
    expect(firstVisit).toContain("ملاحظة أولى");
    expect(firstVisit).toContain("لا توجد صورة توثيق");
    expect(secondVisit).toContain("محل العادي");
    expect(thirdVisit).toContain("محل ثالث");
    expect(closing).toContain("2026-08-18");
    expect(firstVisit).not.toContain("{{تكرار_محل}}");
  });

  it("يتعرف إلى وسم التكرار واسم المحل عندما يقسمهما PowerPoint بين أجزاء النص", async () => {
    const result = await buildMarketVisitPptx({ templateBase64: await splitTagTemplateBase64(), cycleName: "دورة", generatedAt: "2026-08-18", visits: [{ storeName: "محل مقسم", category: "نخبة", region: "دمشق", notes: "", images: [] }] });
    const zip = await JSZip.loadAsync(Uint8Array.from(atob(result), (letter) => letter.charCodeAt(0)));
    const visit = await zip.file("ppt/slides/slide2.xml")?.async("string");
    expect(visit).toContain("محل مقسم");
    expect(visit).not.toMatch(/تكرار_[\s\S]*محل/);
  });

  it("يملأ وسوم مؤشرات المنتجات المرقمة في الشرائح الثابتة", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", "<Types></Types>");
    zip.file("ppt/presentation.xml", '<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/><p:sldId id="258" r:id="rId3"/></p:sldIdLst></p:presentation>');
    zip.file("ppt/_rels/presentation.xml.rels", '<Relationships><Relationship Id="rId1" Target="slides/slide1.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/><Relationship Id="rId3" Target="slides/slide3.xml"/></Relationships>');
    zip.file("ppt/slides/slide1.xml", "<p:sld>{{اسم_منتج_1}} {{نسبة_تواجد_منتج_1}} {{محلات_موجود_منتج_1}} {{عينة_منتج_1}}</p:sld>");
    zip.file("ppt/slides/slide2.xml", "<p:sld>{{اسم_المحل}}</p:sld>"); zip.file("ppt/slides/slide3.xml", "<p:sld>خاتمة</p:sld>");
    const result = await buildMarketVisitPptx({ templateBase64: toBase64(await zip.generateAsync({ type: "uint8array" })), cycleName: "دورة", generatedAt: "2026-08-18", productMetrics: [{ productId: "p1", productName: "منتج مدار", presentCount: 3, sampleSize: 4, presencePercentage: 75 }], visits: [{ storeName: "محل", category: "", region: "", notes: "", images: [] }] });
    const output = await JSZip.loadAsync(Uint8Array.from(atob(result), (letter) => letter.charCodeAt(0)));
    const summary = await output.file("ppt/slides/slide1.xml")?.async("string");
    expect(summary).toContain("منتج مدار"); expect(summary).toContain("75%"); expect(summary).toContain("3"); expect(summary).toContain("4");
  });

  it("يكرر الشريحة التي تحمل وسم التكرار فقط داخل قالب متعدد الشرائح", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", "<Types></Types>");
    zip.file("ppt/presentation.xml", '<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/><p:sldId id="258" r:id="rId3"/><p:sldId id="259" r:id="rId4"/><p:sldId id="260" r:id="rId5"/></p:sldIdLst></p:presentation>');
    zip.file("ppt/_rels/presentation.xml.rels", '<Relationships><Relationship Id="rId1" Target="slides/slide1.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/><Relationship Id="rId3" Target="slides/slide3.xml"/><Relationship Id="rId4" Target="slides/slide4.xml"/><Relationship Id="rId5" Target="slides/slide5.xml"/></Relationships>');
    zip.file("ppt/slides/slide1.xml", "<p:sld>مقدمة</p:sld>"); zip.file("ppt/slides/slide2.xml", "<p:sld>سياق ثابت</p:sld>"); zip.file("ppt/slides/slide3.xml", "<p:sld>{{تكرار_محل}} {{اسم_المحل}}</p:sld>"); zip.file("ppt/slides/slide4.xml", "<p:sld>ملخص ثابت</p:sld>"); zip.file("ppt/slides/slide5.xml", "<p:sld>خاتمة</p:sld>");
    const result = await buildMarketVisitPptx({ templateBase64: toBase64(await zip.generateAsync({ type: "uint8array" })), cycleName: "دورة", generatedAt: "2026-08-18", slideRepeatMode: "repeat-tag", visits: [{ storeName: "محل أول", category: "", region: "", notes: "", images: [] }, { storeName: "محل ثان", category: "", region: "", notes: "", images: [] }] });
    const output = await JSZip.loadAsync(Uint8Array.from(atob(result), (letter) => letter.charCodeAt(0)));
    expect(await output.file("ppt/slides/slide2.xml")?.async("string")).toContain("سياق ثابت");
    expect(await output.file("ppt/slides/slide3.xml")?.async("string")).toContain("محل أول");
    expect(await output.file("ppt/slides/slide6.xml")?.async("string")).toContain("محل ثان");
    expect(await output.file("ppt/slides/slide4.xml")?.async("string")).toContain("ملخص ثابت");
  });

  it("يرفض وضع الوسم إذا ظهر وسم التكرار في أكثر من شريحة", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", "<Types></Types>"); zip.file("ppt/presentation.xml", '<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/></p:sldIdLst></p:presentation>'); zip.file("ppt/_rels/presentation.xml.rels", '<Relationships><Relationship Id="rId1" Target="slides/slide1.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/></Relationships>'); zip.file("ppt/slides/slide1.xml", "<p:sld>{{تكرار_محل}}</p:sld>"); zip.file("ppt/slides/slide2.xml", "<p:sld>{{تكرار_محل}}</p:sld>");
    await expect(buildMarketVisitPptx({ templateBase64: toBase64(await zip.generateAsync({ type: "uint8array" })), cycleName: "دورة", generatedAt: "2026-08-18", slideRepeatMode: "repeat-tag", visits: [{ storeName: "محل", category: "", region: "", notes: "", images: [] }] })).rejects.toThrow("شريحة واحدة فقط");
  });

  it("يستخدم الشريحة الثانية كشريحة المحل في قالب المقدمة والزيارة والخاتمة عند تعذر قراءة الوسم", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", "<Types></Types>");
    zip.file("ppt/presentation.xml", '<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/><p:sldId id="258" r:id="rId3"/></p:sldIdLst></p:presentation>');
    zip.file("ppt/_rels/presentation.xml.rels", '<Relationships><Relationship Id="rId1" Target="slides/slide1.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/><Relationship Id="rId3" Target="slides/slide3.xml"/></Relationships>');
    zip.file("ppt/slides/slide1.xml", "<p:sld>مقدمة</p:sld>");
    zip.file("ppt/slides/slide2.xml", "<p:sld><p:sp><p:txBody>{{اسم_المحل}}</p:txBody></p:sp></p:sld>");
    zip.file("ppt/slides/slide3.xml", "<p:sld>خاتمة</p:sld>");
    const result = await buildMarketVisitPptx({ templateBase64: toBase64(await zip.generateAsync({ type: "uint8array" })), cycleName: "دورة", generatedAt: "2026-08-18", visits: [{ storeName: "محل احتياطي", category: "", region: "", notes: "", images: [] }] });
    const output = await JSZip.loadAsync(Uint8Array.from(atob(result), (letter) => letter.charCodeAt(0)));
    expect(await output.file("ppt/slides/slide2.xml")?.async("string")).toContain("محل احتياطي");
  });

  it("يقرأ قالب PowerPoint واقعي بترتيب خصائص مختلف في الشرائح والعلاقات", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", "<Types></Types>");
    zip.file("ppt/presentation.xml", '<p:presentation><p:sldIdLst><p:sldId r:id="rId1" id="256"></p:sldId><p:sldId r:id="rId2" id="257"></p:sldId><p:sldId r:id="rId3" id="258"></p:sldId></p:sldIdLst></p:presentation>');
    zip.file("ppt/_rels/presentation.xml.rels", '<Relationships><Relationship Target="slides/slide1.xml" Type="x" Id="rId1"/><Relationship Target="slides/slide2.xml" Type="x" Id="rId2"/><Relationship Target="slides/slide3.xml" Type="x" Id="rId3"/></Relationships>');
    zip.file("ppt/slides/slide1.xml", "<p:sld>مقدمة</p:sld>");
    zip.file("ppt/slides/slide2.xml", "<p:sld><p:sp><p:txBody>{{تكرار_محل}} {{اسم_المحل}}</p:txBody></p:sp></p:sld>");
    zip.file("ppt/slides/slide3.xml", "<p:sld>خاتمة</p:sld>");
    const result = await buildMarketVisitPptx({ templateBase64: toBase64(await zip.generateAsync({ type: "uint8array" })), cycleName: "دورة", generatedAt: "2026-08-18", visits: [{ storeName: "محل واقعي", category: "", region: "", notes: "", images: [] }, { storeName: "محل ثان", category: "", region: "", notes: "", images: [] }] });
    const output = await JSZip.loadAsync(Uint8Array.from(atob(result), (letter) => letter.charCodeAt(0)));
    expect(await output.file("ppt/slides/slide4.xml")?.async("string")).toContain("محل ثان");
  });

  it("ينشئ علاقات الوسائط وأنواع المحتوى عند وضع صورة ويحتفظ بكل شرائح المحلات", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", "<Types></Types>");
    zip.file("ppt/presentation.xml", '<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/><p:sldId id="258" r:id="rId3"/></p:sldIdLst></p:presentation>');
    zip.file("ppt/_rels/presentation.xml.rels", '<Relationships><Relationship Id="rId1" Target="slides/slide1.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/><Relationship Id="rId3" Target="slides/slide3.xml"/></Relationships>');
    zip.file("ppt/slides/slide1.xml", "<p:sld>مقدمة</p:sld>");
    zip.file("ppt/slides/slide2.xml", '<p:sld><p:sp><p:txBody>{{اسم_المحل}}</p:txBody></p:sp><p:sp><p:txBody>{{صورة_المحل}}</p:txBody><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="100000" cy="100000"/></a:xfrm></p:spPr></p:sp></p:sld>');
    zip.file("ppt/slides/slide3.xml", "<p:sld>خاتمة</p:sld>");
    const result = await buildMarketVisitPptx({ templateBase64: toBase64(await zip.generateAsync({ type: "uint8array" })), cycleName: "دورة", generatedAt: "2026-08-18", visits: [
      { storeName: "محل صورة", category: "", region: "", notes: "", images: [{ base64: VALID_PNG_BASE64, extension: "png" }] },
      { storeName: "محل صورة ثان", category: "", region: "", notes: "", images: [{ base64: VALID_PNG_BASE64, extension: "png" }] },
    ] });
    const output = await JSZip.loadAsync(Uint8Array.from(atob(result), (letter) => letter.charCodeAt(0)));
    expect(await output.file("[Content_Types].xml")?.async("string")).toContain('Extension="png" ContentType="image/png"');
    expect(await output.file("ppt/slides/slide2.xml")?.async("string")).toContain("<p:pic>");
    expect(await output.file("ppt/slides/_rels/slide2.xml.rels")?.async("string")).toContain("relationships/image");
    expect(await output.file("ppt/media/market-visit-1.png")?.async("base64")).toBe(VALID_PNG_BASE64);
    expect(await output.file("ppt/slides/slide4.xml")?.async("string")).toContain("محل صورة ثان");
  });

  it("ينظف علامات الاتجاه الخفية من النصوص حتى لا تظهر رموزاً في نهاية الجمل", async () => {
    const result = await buildMarketVisitPptx({ templateBase64: await templateBase64(), cycleName: "دورة\u200f", generatedAt: "2026-08-18", visits: [{ storeName: "محل\u200e", category: "نخبة", region: "دمشق", notes: "ملاحظة\u202e", images: [] }] });
    const output = await JSZip.loadAsync(Uint8Array.from(atob(result), (letter) => letter.charCodeAt(0)));
    const visit = await output.file("ppt/slides/slide2.xml")?.async("string");
    expect(visit).toContain("محل");
    expect(visit).toContain("ملاحظة");
    expect(visit).not.toMatch(/[\u200E\u200F\u202E]/);
  });

  it("لا ينسخ علاقة ملاحظات الشريحة أو هوية الشريحة إلى شرائح المحلات المكررة", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", "<Types></Types>");
    zip.file("ppt/presentation.xml", '<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/><p:sldId id="258" r:id="rId3"/></p:sldIdLst></p:presentation>');
    zip.file("ppt/_rels/presentation.xml.rels", '<Relationships><Relationship Id="rId1" Target="slides/slide1.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/><Relationship Id="rId3" Target="slides/slide3.xml"/></Relationships>');
    zip.file("ppt/slides/slide1.xml", "<p:sld>مقدمة</p:sld>");
    zip.file("ppt/slides/slide2.xml", '<p:sld><p:ext uri="{ID}"><a16:creationId id="{duplicate}"/></p:ext><p:sp><p:txBody>{{اسم_المحل}}</p:txBody></p:sp></p:sld>');
    zip.file("ppt/slides/_rels/slide2.xml.rels", '<Relationships><Relationship Id="rId1" Type="slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="notesSlide" Target="../notesSlides/notesSlide2.xml"/></Relationships>');
    zip.file("ppt/slides/slide3.xml", "<p:sld>خاتمة</p:sld>");
    const result = await buildMarketVisitPptx({ templateBase64: toBase64(await zip.generateAsync({ type: "uint8array" })), cycleName: "دورة", generatedAt: "2026-08-18", visits: [{ storeName: "محل أول", category: "", region: "", notes: "", images: [] }, { storeName: "محل ثان", category: "", region: "", notes: "", images: [] }] });
    const output = await JSZip.loadAsync(Uint8Array.from(atob(result), (letter) => letter.charCodeAt(0)));
    expect(await output.file("ppt/slides/_rels/slide4.xml.rels")?.async("string")).not.toContain("notesSlide");
    expect(await output.file("ppt/slides/slide4.xml")?.async("string")).not.toContain("creationId");
  });

  it("يدعم ملء الإطار والملاءمة للعرض أو الارتفاع مع الحفاظ على نسبة الصورة", async () => {
    const source = await JSZip.loadAsync(Uint8Array.from(atob(await templateBase64()), (letter) => letter.charCodeAt(0)));
    const visitSlide = await source.file("ppt/slides/slide2.xml")?.async("string");
    source.file("ppt/slides/slide2.xml", visitSlide?.replace("{{صورة_المحل}}</p:txBody></p:sp>", '{{صورة_المحل}}</p:txBody><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="100000" cy="100000"/></a:xfrm></p:spPr></p:sp>') || "");
    const template = toBase64(await source.generateAsync({ type: "uint8array" }));
    const visits = [{ storeName: "محل", category: "", region: "", notes: "", images: [{ base64: VALID_PNG_BASE64, extension: "png" as const, width: 1600, height: 800 }] }];
    const fill = await buildMarketVisitPptx({ templateBase64: template, cycleName: "دورة", generatedAt: "2026-08-18", visits, imageFit: "fill" });
    const height = await buildMarketVisitPptx({ templateBase64: template, cycleName: "دورة", generatedAt: "2026-08-18", visits, imageFit: "fit-height" });
    const fillXml = await (await JSZip.loadAsync(Uint8Array.from(atob(fill), (letter) => letter.charCodeAt(0)))).file("ppt/slides/slide2.xml")?.async("string");
    const heightXml = await (await JSZip.loadAsync(Uint8Array.from(atob(height), (letter) => letter.charCodeAt(0)))).file("ppt/slides/slide2.xml")?.async("string");
    expect(fillXml).toContain("<a:srcRect");
    expect(heightXml).toContain("<p:pic>");
    expect(heightXml).not.toContain("<a:srcRect");
  });

  it("يبني تقريراً عملياً لعشرين محلاً مع صورة وملاحظة لكل محل", async () => {
    const source = await JSZip.loadAsync(Uint8Array.from(atob(await templateBase64()), (letter) => letter.charCodeAt(0)));
    const visitSlide = await source.file("ppt/slides/slide2.xml")?.async("string");
    source.file("ppt/slides/slide2.xml", visitSlide?.replace("{{صورة_المحل}}</p:txBody></p:sp>", '{{صورة_المحل}}</p:txBody><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="100000" cy="100000"/></a:xfrm></p:spPr></p:sp>') || "");
    const result = await buildMarketVisitPptx({ templateBase64: toBase64(await source.generateAsync({ type: "uint8array" })), cycleName: "دورة كبيرة", generatedAt: "2026-08-18", visits: Array.from({ length: 20 }, (_, index) => ({ storeName: `محل ${index + 1}`, category: "نخبة", region: "دير الزور", notes: `ملاحظة المحل ${index + 1}`, images: [{ base64: VALID_PNG_BASE64, extension: "png" as const, width: 1000, height: 700 }] })) });
    const output = await JSZip.loadAsync(Uint8Array.from(atob(result), (letter) => letter.charCodeAt(0)));
    const presentation = await output.file("ppt/presentation.xml")?.async("string");
    expect((presentation?.match(/<p:sldId\b/g) || []).length).toBe(22);
    expect(Object.keys(output.files).filter((path) => path.startsWith("ppt/media/market-visit-")).length).toBe(20);
  });
});
