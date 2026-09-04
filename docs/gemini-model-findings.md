# Gemini model verification

- توثيق Google الرسمي يعرّف معرّف النموذج الحالي `gemini-3.6-flash` ويشير إلى دعم النص والصورة والفيديو والصوت وPDF.
- توثيق Google الرسمي لـ Interactions API يصفه بأنه الواجهة الموصى بها الجديدة، مع بقاء Generate Content مدعوماً.
- رسالة الخطأ التي ظهرت للمستخدم تطلب صراحة الانتقال من `gemini-2.5-flash` إلى `gemini-3.6-flash`.
- الإصلاح الأدنى الآمن للتطبيق الحالي هو تغيير معرّف النموذج في استدعاء `generateContent`، مع إبقاء المفتاح على الخادم. يمكن نقل المحادثة إلى Interactions API لاحقاً بعد اختبار صيغة الطلب في بيئة التطبيق.

المصادر:
- https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash
- https://ai.google.dev/gemini-api/docs/interactions-overview
