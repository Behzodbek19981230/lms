# 📄 PDF Generatsiya Server Setup

## 🚨 Muammo

Sizning loyihangizda PDF generatsiya server muhitida ishlamayotgan edi. Buning sabablari:

1. **HTML parsing muammosi** - PDFKit HTML ni to'g'ri parse qila olmaydi
2. **Server environment** - Font va dependency muammolari
3. **Ma'lumotlar bazasi approach** - HTML dan emas, to'g'ridan-to'g'ri DB dan PDF yaratish kerak

## ✅ Yechim

Men 3 xil PDF generatsiya usulini yaratdim:

### 1. **PDFKit (Database approach)**
- HTML parsing emas, to'g'ridan-to'g'ri ma'lumotlar bazasidan PDF yaratish
- Server-friendly
- Tezroq ishlaydi

### 2. **Puppeteer (HTML to PDF)**
- HTML dan to'liq PDF generatsiya
- Rasm qo'llab-quvvatlaydi
- Professional ko'rinish

### 3. **Hybrid approach**
- Ikki usulni birgalikda ishlatish
- Fallback mechanism

## 📦 Dependencies

```bash
# Kerakli package lar o'rnatish
cd backend
npm install puppeteer cheerio
```

### Puppeteer Dependencies (Ubuntu/Debian)

```bash
# Server da Puppeteer uchun kerakli system packages
sudo apt-get update
sudo apt-get install -y \
  gconf-service \
  libasound2 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgcc1 \
  libgconf-2-4 \
  libgdk-pixbuf2.0-0 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  ca-certificates \
  fonts-liberation \
  libappindicator1 \
  libnss3 \
  lsb-release \
  xdg-utils \
  wget
```

## 🐳 Dockerfile

```dockerfile
FROM node:18-alpine

# Puppeteer dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip installing Chromium. We'll use the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

## 📋 API Endpoints

### 1. PDF Generatsiya (Yangi)

```http
GET /pdf/test/:testId?method=puppeteer&isAnswerKey=true
GET /pdf/exam-variant/:variantId?method=pdfkit
GET /pdf/test/:testId/debug  # Test qilish uchun
POST /pdf/test/:testId/html-preview  # HTML preview
```

### 2. Parametrlar

- `method`: `pdfkit` yoki `puppeteer`
- `isAnswerKey`: `true/false` - javoblar kaliti
- `variantNumber`: Variant raqami
- `studentName`: Talaba nomi

## 🧪 Test Qilish

```bash
# PDF generation test
curl -X GET "http://localhost:3000/pdf/test/1/debug" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# HTML preview
curl -X POST "http://localhost:3000/pdf/test/1/html-preview" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# PDF download
curl -X GET "http://localhost:3000/pdf/test/1?method=puppeteer" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output test.pdf
```

## ⚙️ Environment Variables

```env
# .env faylga qo'shing
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
NODE_ENV=production
```

## 🔧 Usage Examples

### Frontend Integration

```typescript
// PDF download
const downloadPDF = async (testId: number, method: 'pdfkit' | 'puppeteer' = 'puppeteer') => {
  try {
    const response = await fetch(`/api/pdf/test/${testId}?method=${method}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test_${testId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('PDF download error:', error);
  }
};

// HTML preview
const previewHTML = async (testId: number) => {
  const response = await fetch(`/api/pdf/test/${testId}/html-preview`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    const html = await response.text();
    const newWindow = window.open();
    newWindow?.document.write(html);
  }
};
```

## 📊 Performance

| Method | Local | Server | Size | Speed |
|--------|--------|--------|------|-------|
| PDFKit | ✅ | ✅ | Small | Fast |
| Puppeteer | ✅ | ✅* | Large | Slower |
| HTML Export | ✅ | ✅ | Medium | Fast |

*Puppeteer serverda dependencies talab qiladi

## 🎯 Migration Strategy

### 1. Test Phase
```typescript
// Har ikkala usulni sinab ko'ring
const testResult = await fetch('/pdf/test/1/debug');
console.log(await testResult.json());
```

### 2. Production Deployment
```bash
# 1. Dependencies o'rnatish
npm install

# 2. System packages (Ubuntu)
sudo apt-get install -y chromium-browser

# 3. Environment setup
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 4. Application start
npm run start:prod
```

### 3. Gradual Rollout
- Birinchi PDFKit ni test qiling
- Keyin Puppeteer ni qo'shing
- Performance monitoring qiling

## ⚠️ Important Notes

1. **Memory Usage**: Puppeteer ko'proq memory ishlatadi
2. **Server Resources**: CPU intensive operations
3. **Security**: Puppeteer serverda sandbox disable qilish kerak
4. **Fallback**: Agar Puppeteer ishlamasa, PDFKit ni ishlating

## 🚀 Next Steps

1. Dependencies o'rnatish
2. Test endpoints dan foydalanish
3. Production da test qilish
4. Frontend integration
5. Performance monitoring

Muvaffaqiyat bilan ishlatishingizni tilayman!
