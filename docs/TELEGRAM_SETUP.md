# 🤖 Telegram Bot Setup Guide

## Quick Start

### 1. Environment Variables

Backend `.env` fayliga quyidagi o'zgaruvchilarni qo'shing:

```env
# Telegram Bot Configuration (REQUIRED)
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/telegram/webhook

# Local Development (ngrok bilan)
# TELEGRAM_WEBHOOK_URL=https://abc123.ngrok.io/telegram/webhook
```

### 2. Bot Yaratish

1. Telegram'da `@BotFather` ni toping
2. `/newbot` buyrug'ini yuboring
3. Bot nomini kiriting (masalan: "EduOne LMS Bot")
4. Bot username kiriting (masalan: "eduone_lms_bot")
5. BotFather sizga token beradi - uni `.env` fayliga qo'shing

### 3. Webhook O'rnatish

**Production uchun:**

```bash
cd scripts
chmod +x setup-telegram-bot.sh
./setup-telegram-bot.sh
```

**Yoki qo'lda:**

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://yourdomain.com/telegram/webhook"}'
```

### 4. Local Development (ngrok)

```bash
# 1. ngrok ishga tushiring
ngrok http 3001

# 2. ngrok URL ni .env ga qo'shing
TELEGRAM_WEBHOOK_URL=https://abc123.ngrok-free.app/telegram/webhook

# 3. Setup skriptni ishga tushiring
./scripts/setup-telegram-bot.sh

# 4. Backend serverni ishga tushiring
cd backend
npm run start:dev
```

## 📚 Foydalanish

### O'qituvchi / Admin

1. **Kanal Yaratish:**

    - Telegram'da yangi kanal yarating
    - Botni kanalga admin qo'shing (permissions: post messages, invite users)
    - Chat ID ni oling (@getidsbot orqali)

2. **LMS'da Ro'yxatdan O'tkazish:**

    - `/account/telegram` sahifasiga o'ting
    - "Yangi Chat/Kanal ro'yxatga olish" bo'limida:
        - Chat ID kiriting
        - Turi tanlang (Kanal/Guruh)
        - Sarlavha va username kiriting (ixtiyoriy)
        - Markaz va fan tanlang
    - "Chat ro'yxatga olish" tugmasini bosing

3. **Studentlarni Bog'lash:**

    - Studentlar botga `/start` yuborishi kerak
    - LMS'da "Telegram foydalanuvchilarini bog'lash" bo'limida:
        - Studentni tanlang
        - Telegram foydalanuvchisini tanlang
        - "Bog'lash" tugmasini bosing

4. **Test Yuborish:**
    - "Testni kanalga yuborish" bo'limida:
        - Test tanlang
        - Kanal tanlang
        - Xabar qo'shing (ixtiyoriy)
    - "Testni yuborish" tugmasini bosing

### Student

1. **Ulash:**

    - `/account/telegram-user` sahifasiga o'ting
    - "Connect to Telegram" tugmasini bosing
    - Bot'ga `/start` yuboring

2. **Test Ishlash:**

    - Kanalda test e'lonini ko'ring
    - Javoblarni formatda yuboring: `#T123Q1 A`
        - T123 = Test ID
        - Q1 = Savol raqami
        - A = Javob (A/B/C/D)

3. **Natijalarni Ko'rish:**
    - Bot orqali: `/natijalarim`
    - LMS orqali: `/account/results`

## 🎯 Bot Commands

### Barcha Foydalanuvchilar

-   `/start` - Bot'ni ishga tushirish
-   `/help` - Yordam
-   `/menu` - Asosiy menyu
-   `/natijalarim` - Test natijalari
-   `/davomatim` - Davomat ma'lumotlari
-   `/hisobim` - Hisob ma'lumotlari

### O'qituvchilar

-   `/yoklama` - Yo'qlama olish
-   `/testlar` - Aktiv testlar
-   `/elon` - E'lon yuborish

## ✅ Verification Checklist

-   [ ] Bot token `.env` fayliga qo'shilgan
-   [ ] Webhook URL to'g'ri sozlangan
-   [ ] Backend server ishga tushgan
-   [ ] Botga `/start` yuborilganda javob qaytaradi
-   [ ] Kanal yaratilgan va bot admin qo'shilgan
-   [ ] Kanal LMS'da ro'yxatdan o'tkazilgan
-   [ ] Student botga `/start` yuborgan
-   [ ] Student LMS hisobiga ulangan
-   [ ] Test kanalga yuborilgan
-   [ ] Student javob yuborgan: `#T123Q1 A`
-   [ ] Javob backend'da qayd etilgan

## 🔧 Troubleshooting

### Bot javob bermayapti

-   [ ] `TELEGRAM_BOT_TOKEN` to'g'rimi?
-   [ ] Webhook to'g'ri sozlanganmi? (`getWebhookInfo`)
-   [ ] Backend server ishlab turibmi?
-   [ ] Firewall webhook'ga ruxsat beradimi?

### Kanal ro'yxatdan o'tmayapti

-   [ ] Bot kanalda adminmi?
-   [ ] Chat ID to'g'rimi? (- belgisi bilan)
-   [ ] Bot post yuborish huquqiga egami?

### Javoblar qayd bo'lmayapti

-   [ ] Student botga `/start` yuborgan va ulanganmi?
-   [ ] Javob formati to'g'rimi? `#T123Q1 A`
-   [ ] Test ID mavjudmi?
-   [ ] Backend logs'da xatolar bormi?

### Notifications kelmayapti

-   [ ] Student Telegram'ga ulanganmi?
-   [ ] Kanal to'g'ri tanlanganmi?
-   [ ] Bot channel'da post yuborish huquqiga egami?

## 📝 Qo'shimcha Ma'lumotlar

-   Frontend docs: `/docs/TELEGRAM_FRONTEND_ACCESS.md`
-   Integration docs: `/docs/TELEGRAM_INTEGRATION.md`
-   Bot API: https://core.telegram.org/bots/api
-   BotFather: https://t.me/BotFather
-   Get Chat ID: https://t.me/getidsbot
