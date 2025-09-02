# EduNimbus Connect - LMS System

EduNimbus Connect - bu zamonaviy ta'lim boshqaruv tizimi (LMS) bo'lib, Telegram integratsiyasi va zamonaviy texnologiyalar bilan ishlab chiqilgan.

## 🚀 Yangi Xususiyatlar

### ✨ Telegram orqali ro'yxatdan o'tish

Endi foydalanuvchilar Telegram hisobi orqali tezda ro'yxatdan o'tishlari mumkin:

- **Avtomatik username**: Telegram username'i tizimda avtomatik ishlatiladi
- **Xavfsiz**: Parol talab qilinmaydi, Telegram autentifikatsiyasi ishlatiladi
- **Tezkor**: Bir bosish bilan ro'yxatdan o'tish
- **Student roli**: Telegram orqali ro'yxatdan o'tgan foydalanuvchilar avtomatik student rolini oladi

## 🛠 Texnik O'zgarishlar

### Backend

1. **Email → Username o'zgarishi**:
   - Barcha email field'lari username bilan almashtirildi
   - Auth service'larda email o'rniga username ishlatiladi
   - Database migration script yaratildi

2. **Telegram Register Endpoint**:
   - `POST /auth/telegram/register` - yangi endpoint
   - `TelegramRegisterDto` - yangi DTO
   - Telegram ma'lumotlari asosida avtomatik user yaratish

3. **Xatoliklar tuzatildi**:
   - TypeScript xatoliklari
   - Database relation'lari
   - Service method'lari

### Frontend

1. **TelegramRegister komponenti**:
   - Telegram Login Widget integratsiyasi
   - Username tekshirish
   - Xatoliklar bilan ishlash
   - Loading state'lari

2. **Register sahifasi yangilandi**:
   - Telegram register opsiyasi qo'shildi
   - UI/UX yaxshilandi
   - Navigation yaxshilandi

## 🔧 O'rnatish va Ishga Tushirish

### 1. Dependencies o'rnatish

```bash
# Backend
cd backend
npm install

# Frontend  
cd frontend
npm install
```

### 2. Environment o'rnatish

**Backend (.env):**
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/edunimbus"

# JWT
JWT_SECRET="your-jwt-secret-here"

# Telegram Bot
TELEGRAM_BOT_TOKEN="your-bot-token"
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3000
VITE_TELEGRAM_BOT_USERNAME=your_bot_username
```

### 3. Database Migration

```bash
cd backend
npm run migration:run

# Yoki SQL script bilan
psql -d edunimbus -f ../database_migration_email_to_username.sql
```

### 4. Ishga tushirish

```bash
# Backend
cd backend
npm run start:dev

# Frontend
cd frontend  
npm run dev
```

## 📚 API Endpoints

### Authentication

- `POST /auth/register` - Oddiy ro'yxatdan o'tish
- `POST /auth/login` - Tizimga kirish
- `POST /auth/telegram/register` - **Yangi!** Telegram orqali ro'yxatdan o'tish
- `POST /auth/telegram/login` - Telegram orqali tizimga kirish

### Telegram Register Request

```json
{
  "telegramUserId": "123456789",
  "telegramUsername": "john_doe",
  "firstName": "John",
  "lastName": "Doe",
  "photoUrl": "https://...",
  "authDate": 1638360000,
  "hash": "hash_string"
}
```

### Telegram Register Response

```json
{
  "access_token": "jwt_token",
  "user": {
    "id": 1,
    "username": "john_doe",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "role": "student"
  }
}
```

## 🔐 Xavfsizlik

- Username'lar unique bo'lishi kerak
- Telegram hisobi faqat bir marta ishlatilishi mumkin
- JWT token'lar xavfsiz generate qilinadi
- Parollar bcrypt bilan hash qilinadi

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test

# Frontend build test
cd frontend
npm run build
```

## 📝 Migration Script

`database_migration_email_to_username.sql` fayli email ustunlarini username ga o'zgartirish uchun:

```sql
-- Email ustunini username ga o'zgartirish
ALTER TABLE users ADD COLUMN username VARCHAR(255);
UPDATE users SET username = email WHERE username IS NULL;
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
ALTER TABLE users DROP COLUMN email;
```

## 🚨 Muhim Eslatmalar

1. **Telegram Bot Sozlash**: 
   - Bot yaratish va token olish kerak
   - Bot username'ini environment'ga qo'yish kerak

2. **Username Talablari**:
   - Telegram'da username bo'lishi shart
   - Username unique bo'lishi kerak

3. **Migration**:
   - Database migration'ni production'da ehtiyotkorlik bilan bajaring
   - Backup oling

## 🤝 Hissa qo'shish

1. Fork qiling
2. Feature branch yarating (`git checkout -b feature/amazing-feature`)
3. Commit qiling (`git commit -m 'Add amazing feature'`)
4. Push qiling (`git push origin feature/amazing-feature`)
5. Pull Request oching

## 📄 License

Bu loyiha MIT litsenziyasi ostida taratilgan.

## 📞 Aloqa

Savollar yoki takliflar bo'lsa, Issue oching yoki Pull Request yuboring.

---

**EduNimbus Connect Team** 🎓
