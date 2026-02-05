# To'lov Usullari - Qo'llanma

> O'quv markazi to'lov tizimidan foydalanish bo'yicha batafsil qo'llanma

---

## Mundarija

1. [Kirish](#kirish)
2. [O'quvchi uchun](#oquvchi-uchun)
3. [O'qituvchi uchun](#oqituvchi-uchun)
4. [Admin uchun](#admin-uchun)
5. [Oylik to'lovlar tizimi](#oylik-tolovlar-tizimi)
6. [To'lov holatlari](#tolov-holatlari)
7. [Telegram orqali eslatmalar](#telegram-orqali-eslatmalar)

---

## Kirish

Tizimda to'lovlar avtomatik ravishda boshqariladi. Har bir o'quvchi guruhga qo'shilganda, uning oylik to'lov profili yaratiladi va har oy uchun to'lov yozuvlari avtomatik hosil bo'ladi.

### Asosiy tushunchalar

| Tushuncha | Izoh |
|-----------|------|
| **Oylik summa** | O'quvchining har oylik to'lov miqdori |
| **Muddat (dueDay)** | To'lov muddati (masalan, har oyning 10-sanasigacha) |
| **Qo'shilgan sana** | O'quvchi guruhga qo'shilgan sana |
| **Qarz** | To'lanmagan yoki qisman to'langan summa |

---

## O'quvchi uchun

### Mening to'lovlarimni ko'rish

1. **Tizimga kiring** (login)
2. Chap menuda **"To'lovlar"** bo'limiga o'ting
3. Bu yerda barcha to'lovlaringiz ko'rinadi:
   - Kutilayotgan to'lovlar
   - To'langan to'lovlar
   - Kechikkan to'lovlar

### To'lov holatlari

| Holat | Rangi | Ma'nosi |
|-------|-------|---------|
| **Kutilayotgan** | Sariq | To'lov muddati hali kelmagan |
| **To'langan** | Yashil | To'lov to'liq amalga oshirilgan |
| **Kechikkan** | Qizil | To'lov muddati o'tgan, lekin to'lanmagan |

### Qanday to'lash mumkin?

To'lovni amalga oshirish uchun **o'qituvchi yoki admin bilan bog'laning**:

1. **Naqd pul** - O'quv markaziga kelib naqd pul topshiring
2. **Bank kartasi** - Admin yoki o'qituvchiga karta orqali o'tkazing
3. **Click/Payme** - Admin ko'rsatgan hisobga o'tkazing

> **Muhim:** To'lov qilingandan so'ng, admin yoki o'qituvchi tizimda to'lovni qayd qiladi va sizning profilingizda "To'langan" holati ko'rinadi.

---

## O'qituvchi uchun

### To'lovlarni boshqarish sahifasi

1. **Tizimga kiring**
2. Chap menuda **"To'lovlar"** bo'limiga o'ting
3. Bu sahifada quyidagilarni ko'rasiz:
   - **Statistika kartochkalari** - Kutilayotgan, kechikkan, to'langan sonlar
   - **Oylik to'lovlar jadvali** - Har bir o'quvchining to'lov holati
   - **Filtrlar** - Qidirish, holat bo'yicha saralash

### Oylik to'lovlar jadvali

```
┌─────────────────────────────────────────────────────────────┐
│ Oylik to'lovlar                                    [Oy: Fevral 2026]
├─────────────────────────────────────────────────────────────┤
│ O'quvchi       │ Guruh    │ Summa     │ To'langan │ Holat   │
├────────────────┼──────────┼───────────┼───────────┼─────────┤
│ Ali Valiyev    │ Mat-A    │ 500,000   │ 500,000   │ ✅ To'langan
│ Guli Karimova  │ Mat-A    │ 500,000   │ 250,000   │ ⏰ Kutilmoqda
│ Vali Aliyev    │ Fizika-B │ 400,000   │ 0         │ ❌ Kechikkan
└─────────────────────────────────────────────────────────────┘
```

### To'lov kiritish (Qisman yoki to'liq)

1. O'quvchini jadvaldan toping
2. **"To'lov kiritish"** tugmasini bosing
3. Quyidagi ma'lumotlarni kiriting:
   - **Summa** - To'langan miqdor (qisman ham bo'lishi mumkin)
   - **Izoh** - Ixtiyoriy (masalan: "Naqd pul", "Karta orqali")
4. **"Saqlash"** tugmasini bosing

### Qisman to'lov

Tizim qisman to'lovlarni qo'llab-quvvatlaydi:

```
Misol:
- Oylik summa: 500,000 UZS
- Birinchi to'lov: 250,000 UZS
- Ikkinchi to'lov: 250,000 UZS
- Natija: To'liq to'langan ✅
```

### O'quvchi sozlamalarini o'zgartirish

Har bir o'quvchi uchun quyidagilarni o'zgartirish mumkin:

1. **Oylik summa** - Chegirma yoki maxsus narx belgilash
2. **Qo'shilgan sana** - To'lov hisobini qaysi sanadan boshlash
3. **Muddat kuni** - To'lov muddatini o'zgartirish (default: 10)

### Qarzdorliklar ro'yxati

1. **"Qarzdorliklar"** tugmasini bosing
2. Barcha qarzdor o'quvchilar ro'yxati chiqadi
3. Har bir o'quvchi uchun:
   - Umumiy qarz summasi
   - Qaysi oylarda qarz borligi

### Excel export

Ma'lumotlarni Excel formatida yuklab olish:

1. **"Excel export"** tugmasini bosing
2. Fayl avtomatik yuklanadi
3. Faylda barcha o'quvchilar va to'lovlar ma'lumotlari bo'ladi

---

## Admin uchun

Admin barcha o'qituvchi imkoniyatlariga ega, qo'shimcha ravishda:

### Yangi to'lov yaratish

1. **"Yangi to'lov"** tugmasini bosing
2. Formani to'ldiring:
   - **Guruh** - Qaysi guruh uchun
   - **O'quvchi** - Aniq o'quvchi yoki "Barcha o'quvchilar"
   - **Summa** - To'lov miqdori
   - **Muddat** - To'lov muddati
   - **Tavsif** - To'lov haqida izoh
3. **"Yaratish"** tugmasini bosing

### Eslatma yuborish

Qarzdor o'quvchilarga Telegram orqali eslatma yuborish:

1. **"Eslatma yuborish"** tugmasini bosing
2. Tasdiqlash oynasi chiqadi
3. **"Yuborish"** tugmasini bosing
4. Barcha qarzdor o'quvchilarga xabar yuboriladi

---

## Oylik to'lovlar tizimi

### Qanday ishlaydi?

```
1. O'quvchi guruhga qo'shiladi
        ↓
2. Billing profili yaratiladi:
   - joinDate: Qo'shilgan sana
   - monthlyAmount: Guruh narxi
   - dueDay: 10 (default)
        ↓
3. Har oy uchun avtomatik yozuv:
   - amountDue: To'lanishi kerak
   - amountPaid: To'langan
   - status: pending/paid/overdue
        ↓
4. To'lov kiritilganda yangilanadi
```

### Prorated (proporsional) hisoblash

Agar o'quvchi oyning o'rtasida qo'shilsa:

```
Misol:
- Qo'shilgan sana: 15-fevral
- Oylik summa: 500,000 UZS
- Fevral oyi kunlari: 28 kun
- Faol kunlar: 14 kun (15-28 fevral)

Hisoblash: 500,000 × (14/28) = 250,000 UZS
```

### O'quvchi ketganda hisob-kitob

1. **"Hisob-kitob"** tugmasini bosing
2. Ketish sanasini kiriting
3. Tizim avtomatik hisoblab beradi:
   - Qancha to'langan
   - Qancha qarz qoldi
   - Yoki ortiqcha to'langan bo'lsa qaytarilishi kerak

---

## To'lov holatlari

### Status turlari

| Status | Kod | Izoh |
|--------|-----|------|
| Kutilayotgan | `pending` | To'lov hali to'lanmagan, muddat o'tmagan |
| To'langan | `paid` | To'lov to'liq amalga oshirilgan |
| Kechikkan | `overdue` | Muddat o'tgan, to'lanmagan |
| Bekor qilingan | `cancelled` | To'lov bekor qilingan |

### Holat o'zgarishi

```
┌───────────┐     To'lov kiritilsa    ┌──────────┐
│  PENDING  │ ───────────────────────→│   PAID   │
└───────────┘                         └──────────┘
      │
      │ Muddat o'tsa
      ↓
┌───────────┐     To'lov kiritilsa    ┌──────────┐
│  OVERDUE  │ ───────────────────────→│   PAID   │
└───────────┘                         └──────────┘
```

---

## Telegram orqali eslatmalar

### Avtomatik eslatmalar

Tizim quyidagi hollarda Telegram orqali xabar yuboradi:

1. **To'lov muddati yaqinlashganda** (3 kun oldin)
2. **To'lov muddati o'tganda**
3. **Admin "Eslatma yuborish" bosganda**

### Xabar namunasi

```
📋 To'lov Eslatmasi

Hurmatli Ali Valiyev,

Sizning to'lovingiz muddati yaqinlashmoqda:
📚 Guruh: Matematika A
💰 Summa: 500,000 UZS
📅 Muddat: 10-fevral 2026

Iltimos, o'z vaqtida to'lov qiling.

O'quv markazi ma'muriyati
```

### Telegram'ni bog'lash

O'quvchi Telegram orqali eslatma olishi uchun:

1. O'quvchi Telegram botga yozsin
2. Bot orqali ro'yxatdan o'tsin
3. Tizim avtomatik bog'laydi

---

## Ko'p so'raladigan savollar

### 1. Qanday to'lov qilaman?

**Javob:** Naqd pul, bank kartasi yoki Click/Payme orqali o'qituvchi yoki admin'ga to'lang. Keyin ular tizimda qayd qiladi.

### 2. Qisman to'lov mumkinmi?

**Javob:** Ha, qisman to'lov qilish mumkin. Masalan, 500,000 UZS dan avval 250,000, keyin qolgan 250,000 ni to'lashingiz mumkin.

### 3. To'lov muddatini o'zgartirsa bo'ladimi?

**Javob:** Ha, admin yoki o'qituvchi har bir o'quvchi uchun to'lov muddatini o'zgartirishi mumkin.

### 4. Chegirma olsam bo'ladimi?

**Javob:** Ha, admin yoki o'qituvchi sizning oylik summangizni kamaytirishi mumkin.

### 5. To'lov tarixini qanday ko'raman?

**Javob:** "To'lovlar" bo'limida barcha to'lov tarixi ko'rinadi.

### 6. Qarzdorligim bormi?

**Javob:** "To'lovlar" bo'limida "Kechikkan" holatidagi to'lovlar - bu sizning qarzdorligingiz.

---

## Texnik ma'lumot

### API endpoint'lar

| Endpoint | Method | Izoh |
|----------|--------|------|
| `/payments/student` | GET | O'quvchi to'lovlari |
| `/payments/teacher` | GET | O'qituvchi to'lovlari |
| `/payments/billing/ledger` | GET | Oylik jadval |
| `/payments/billing/collect` | POST | To'lov kiritish |
| `/payments/billing/debts` | GET | Qarzdorliklar |

### Frontend sahifalar

| Sahifa | Path | Roli |
|--------|------|------|
| O'quvchi to'lovlari | `/account/student-payments` | student |
| O'qituvchi to'lovlari | `/account/payments` | teacher, admin |

---

**Yaratilgan:** 05 Fevral 2026  
**Versiya:** 1.0  
**Maqsad:** To'lov usullari haqida to'liq qo'llanma
