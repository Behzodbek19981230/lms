import { request } from '@/configs/request';

/**
 * PDF faylni yuklab olish
 * @param variantId - Variant ID raqami
 * @param filename - Saqlash uchun fayl nomi (ixtiyoriy)
 */
export const downloadExamVariantPdf = async (
  variantId: number,
  _filename?: string,
): Promise<void> => {
  // Backend endi PDF qaytarmaydi, 303 bilan HTML ga yo'naltiradi.
  // Shu sabab to'g'ridan-to'g'ri HTML endpointni ochamiz.
  const base = (request.defaults.baseURL || '').replace(/\/$/, '');
  const url = `${base}/exams/variants/${variantId}/html`;
  window.open(url, '_blank');
};

/**
 * PDF faylni yangi tabda ochish
 * @param variantId - Variant ID raqami
 */
export const openExamVariantPdf = async (variantId: number): Promise<void> => {
  const base = (request.defaults.baseURL || '').replace(/\/$/, '');
  const url = `${base}/exams/variants/${variantId}/html`;
  window.open(url, '_blank');
};
