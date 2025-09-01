import { request } from '@/configs/request';

/**
 * PDF faylni yuklab olish
 * @param variantId - Variant ID raqami
 * @param filename - Saqlash uchun fayl nomi (ixtiyoriy)
 */
export const downloadExamVariantPdf = async (
  variantId: number, 
  filename?: string
): Promise<void> => {
  try {
    const response = await request.get(`/exams/variants/${variantId}/pdf`, {
      responseType: 'blob', // PDF uchun blob type kerak
      headers: {
        'Accept': 'application/pdf'
      }
    });

    // Blob obyektini yaratish
    const blob = new Blob([response.data], { type: 'application/pdf' });
    
    // URL yaratish
    const url = window.URL.createObjectURL(blob);
    
    // Download link yaratish
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `exam_variant_${variantId}.pdf`;
    
    // DOM'ga qo'shish va bosish
    document.body.appendChild(link);
    link.click();
    
    // Tozalash
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('PDF muvaffaqiyatli yuklandi');
    
  } catch (error: any) {
    console.error('PDF yuklashda xatolik:', error);
    
    if (error.response?.status === 401) {
      alert('Sessiya muddati tugagan. Qayta login qiling.');
      // Login sahifasiga yo'naltirish
      window.location.href = '/login';
    } else if (error.response?.status === 404) {
      alert('PDF fayl topilmadi');
    } else {
      alert('PDF yuklashda xatolik yuz berdi');
    }
    
    throw error;
  }
};

/**
 * PDF faylni yangi tabda ochish
 * @param variantId - Variant ID raqami
 */
export const openExamVariantPdf = async (variantId: number): Promise<void> => {
  try {
    const response = await request.get(`/exams/variants/${variantId}/pdf`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    
    // Yangi tabda ochish
    window.open(url, '_blank');
    
    // Bir oz kutib tozalash (yangi tab ochilgandan keyin)
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
    
  } catch (error: any) {
    console.error('PDF ochishda xatolik:', error);
    
    if (error.response?.status === 401) {
      alert('Sessiya muddati tugagan. Qayta login qiling.');
      window.location.href = '/login';
    } else {
      alert('PDF ochishda xatolik yuz berdi');
    }
    
    throw error;
  }
};
