# Excel Import - Test Yaratish

Bu funksiya o'qituvchilarga Excel fayl orqali test savollarini yuklash imkonini beradi.

## Qanday ishlatish

### 1. Shablon yuklash
- "Yangi test yaratish" sahifasida "Excel import" tugmasini bosing
- "Shablon yuklash" tugmasini bosing
- Excel fayl avtomatik ravishda yuklanadi

### 2. Shablonni to'ldirish
Excel fayl quyidagi ustunlardan iborat:

| Ustun | Nomi | Tavsif | Majburiy |
|-------|------|---------|----------|
| 1 | Savol turi | `multiple-choice`, `true-false`, `essay` | Ha |
| 2 | Savol matni | Savol matni | Ha |
| 3 | A) Birinchi variant | Birinchi javob variant | Ko'p variantli uchun |
| 4 | B) Ikkinchi variant | Ikkinchi javob variant | Ko'p variantli uchun |
| 5 | C) Uchinchi variant | Uchinchi javob variant | Ko'p variantli uchun |
| 6 | D) To'rtinchi variant | To'rtinchi javob variant | Ko'p variantli uchun |
| 7 | To'g'ri javob | `A`, `B`, `C` yoki `D` | Ko'p variantli uchun |
| 8 | Ball | 1-10 oralig'ida | Ha |
| 9 | Izoh | Tushuntirish (ixtiyoriy) | Yo'q |

### 3. Savol turlari

#### Ko'p variantli (multiple-choice)
- Savol turi: `multiple-choice` yoki `multiple` yoki `choice`
- Barcha 4 ta variant to'ldirilishi kerak
- To'g'ri javob A, B, C yoki D bo'lishi kerak

#### To'g'ri/Noto'g'ri (true-false)
- Savol turi: `true-false` yoki `true` yoki `false`
- Faqat A va B variantlari to'ldiriladi
- To'g'ri javob A yoki B bo'lishi kerak

#### Ochiq savol (essay)
- Savol turi: `essay`
- Variantlar to'ldirilmaydi
- To'g'ri javob ustuni bo'sh qoldiriladi

### 4. Faylni yuklash
- "Excel fayl yuklash" tugmasini bosing
- To'ldirilgan Excel faylni tanlang
- Sistema avtomatik ravishda faylni o'qiydi va savollarni ko'rsatadi

### 5. Savollarni qo'shish
- Yuklangan savollarni ko'rib chiqing
- Xatoliklar bo'lsa, ular ko'rsatiladi
- "Savollarni qo'shish" tugmasini bosing
- Savollar testga qo'shiladi

## Xatoliklar va tekshirish

Sistema quyidagi xatoliklarni tekshiradi:

- ✅ Savol turi to'g'ri kiritilgan
- ✅ Savol matni bo'sh emas
- ✅ Ball 1-10 oralig'ida
- ✅ Ko'p variantli savol uchun kamida 2 ta variant
- ✅ To'g'ri javob to'g'ri belgilangan

## Maslahatlar

1. **Shablonni to'liq to'ldiring** - Barcha majburiy ustunlarni to'ldiring
2. **Savol turini aniq yozing** - `multiple-choice`, `true-false`, `essay`
3. **To'g'ri javobni to'g'ri belgilang** - A, B, C yoki D
4. **Ballni to'g'ri kiriting** - 1-10 oralig'ida
5. **Faylni saqlang** - .xlsx formatida

## Misol

```
Savol turi | Savol matni | A) Variant | B) Variant | C) Variant | D) Variant | To'g'ri javob | Ball | Izoh
multiple-choice | 2+2 nechaga teng? | 2 | 3 | 4 | 5 | C | 1 | Oddiy matematika
true-false | Yer yassi shaklda | To'g'ri | Noto'g'ri | | | B | 1 | Geografiya
essay | O'zbekiston haqida gapirib bering | | | | | | 5 | Essa turidagi savol
```

Bu funksiya o'qituvchilarga ko'p sonli savollarni tez va samarali tarzda yaratish imkonini beradi.
