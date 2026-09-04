export type SurveyNoteType = "positive" | "negative" | "complaint" | "suggestion" | "recommendation";

export interface Product {
  id: string;
  name: string;
  categoryName: string;
  type: "company" | "competitor";
  brandName?: string;
  competitorName?: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  allowMultiple: boolean;
}

export interface SurveyTemplateProduct {
  productId: string;
  productName: string;
  type: "company" | "competitor";
  competitorName?: string;
  category?: string;
}

export interface SurveyTemplate {
  id: string;
  name: string;
  createdAt: string;
  imageUri?: string;
  products: SurveyTemplateProduct[];
  /** القوالب القديمة بلا هذه القيمة تُعامل كأن النسبة مفعلة للحفاظ على سلوكها السابق. */
  showShelfPercentage?: boolean;
  showProductPrice?: boolean;
  /** عند تفعيلها يطلب التطبيق صورة للمحل أثناء أخذ الاستبيان. */
  allowStorePhoto?: boolean;
  questions?: Question[];
  hasNotes?: boolean;
}

export interface SurveyResultProductData {
  productId: string;
  productName: string;
  present: boolean;
  /** قيمة قديمة محفوظة للتوافق؛ تُحسب الجديدة من الرفوف المشغولة والإجمالي. */
  shelfPercentage?: number;
  shelfOccupied?: number;
  price?: number;
}

export interface SurveyQuestionAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface SurveyResult {
  id: string;
  templateId: string;
  templateName: string;
  /** معرّف الدورة التي تنتمي إليها النتيجة؛ غير موجود للنتائج القديمة قبل الترحيل التلقائي. */
  cycleId?: string;
  /** الاسم المؤرشف للدورة بعد إغلاقها، مثل: دراسة مسحوق 18-3 – 16-4. */
  cycleName?: string;
  /** لقطة من إعدادات القالب عند حفظ النتيجة لضمان عرض البيانات التاريخية بدقة. */
  hasShelfPercentage?: boolean;
  hasProductPrice?: boolean;
  /** لقطة إعداد القالب التي تحدد طلب صورة المحل. */
  allowStorePhoto?: boolean;
  /** إجمالي رفوف المحل عند تنفيذ الاستبيان. */
  totalShelves?: number;
  /** صورة المحل الملتقطة أو المختارة أثناء تنفيذ الاستبيان. */
  storePhotoUri?: string;
  /** صور المحل المتعددة؛ تبقى الصورة القديمة مدعومة للنتائج السابقة. */
  storePhotoUris?: string[];
  storeId: string;
  storeName: string;
  storeRegion: string;
  surveyDate: string;
  imageUri?: string;
  data: SurveyResultProductData[];
  questions?: SurveyQuestionAnswer[];
  questionAnswers?: Map<string, { answers: string[] }>;
  notes?: string;
  noteType?: SurveyNoteType;
  createdAt: string;
}

export interface SurveyCycle {
  id: string;
  templateId: string;
  templateName: string;
  /** اسم الدورة المؤرشف بعد الإغلاق؛ يساوي اسم القالب أثناء كونها نشطة. */
  name: string;
  startDate: string;
  endDate: string;
  resultIds: string[];
  createdAt: string;
  closedAt?: string;
}

export interface Store {
  id: string;
  name: string;
  region: string;
  isActive: boolean;
}
