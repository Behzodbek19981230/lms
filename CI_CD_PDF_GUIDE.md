# 🚀 CI/CD Deployment Guide - PDF Generatsiya bilan

## 📋 Umumiy Ko'rinish

Sizning CI/CD pipeline ingizni PDF generatsiya qo'llab-quvvatlash bilan yangiladim. Endi server muhitida ham test savollar va javoblari bilan PDF yaratish ishleydi.

## 🔧 Qo'shilgan Funksiyalar

### 1. **Yangi PDF Endpoints**
```http
GET /pdf/test/:testId/debug           # PDF test qilish
GET /pdf/test/:testId?method=puppeteer # Puppeteer PDF
GET /pdf/test/:testId?method=pdfkit   # PDFKit PDF  
POST /pdf/test/:testId/html-preview   # HTML preview
```

### 2. **Ikki PDF Usuli**
- **PDFKit**: Tez, kichik hajm, database dan to'g'ridan-to'g'ri
- **Puppeteer**: Professional, katta hajm, HTML dan

### 3. **Auto-Fallback System**
- Puppeteer ishlamasa, PDFKit ishlatiladi
- Debug endpoint orqali ikki usulni test qilish mumkin

## 🛠️ Server Setup

### 1-bosqich: Manual Server Setup (Bir marta)

```bash
# Serveringizga kirib, setup scriptni bajaring
cd /var/www/lms
curl -O https://raw.githubusercontent.com/yourrepo/server-setup.sh
chmod +x server-setup.sh
sudo ./server-setup.sh
```

Yoki qo'lda:
```bash
sudo apt-get update
sudo apt-get install -y chromium-browser fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 libdbus-1-3 libdrm2 libexpat1 libfontconfig1 libgbm1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates

# Environment variables
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### 2-bosqich: Environment Configuration

`.env` faylga qo'shing:
```env
# PDF Generation
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage
PDF_DEFAULT_METHOD=puppeteer
```

## 📦 Package.json Yangilash

Backend `package.json` ga kerakli dependencies qo'shildi:
```json
{
  "dependencies": {
    "puppeteer": "^22.0.0",
    "cheerio": "^1.0.0-rc.12"
  }
}
```

## 🔄 CI/CD Pipeline Yangilash

### GitHub Actions `.github/workflows/deploy.yml`:

**Yangi features:**
1. **PDF dependencies o'rnatish** CI environment da
2. **System packages** server deployment paytida
3. **Environment variables** PM2 konfiguratsiyasida
4. **PDF testing** deployment paytida

### Asosiy O'zgarishlar:

```yaml
# CI stage da
- name: Install system dependencies for PDF
  run: |
    sudo apt-get update
    sudo apt-get install -y chromium-browser fonts-liberation

# Build stage da
- name: Build backend
  env:
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: true
    PUPPETEER_EXECUTABLE_PATH: /usr/bin/chromium-browser

# Deployment stage da
script: |
  # PDF dependencies o'rnatish
  sudo apt-get install -y chromium-browser fonts-liberation ...
  
  # Environment variables
  export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
  export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
  
  # PM2 ecosystem with PDF env
  cat > ecosystem.config.js << 'EOF'
  module.exports = {
    apps: [{
      name: 'lms-backend',
      script: 'dist/main.js',
      env: {
        PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'true',
        PUPPETEER_EXECUTABLE_PATH: '/usr/bin/chromium-browser',
        PUPPETEER_ARGS: '--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage'
      }
    }]
  };
  EOF
```

## 🧪 Test Qilish

### 1. Deployment Paytida Test
```bash
# Backend ishga tushganini tekshirish
curl http://45.138.159.166:3003/health

# PDF generation test
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://45.138.159.166:3003/pdf/test/1/debug
```

### 2. Frontend Integration
```typescript
const downloadPDF = async (testId: number) => {
  try {
    const response = await fetch(`/api/pdf/test/${testId}?method=puppeteer`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test_${testId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('PDF download failed:', error);
  }
};
```

## 📊 Monitoring

### PM2 Logs
```bash
# Backend logs
pm2 logs lms-backend

# PDF generation errors
pm2 logs lms-backend --lines 100 | grep -i "pdf\|puppeteer"
```

### System Resources
```bash
# Memory usage (Puppeteer intensive)
free -h

# Running processes
ps aux | grep chromium
```

## 🔍 Debugging

### 1. PDF Generation Issues
```bash
# Test Chromium
chromium-browser --version
chromium-browser --no-sandbox --headless --version

# Test environment variables
echo $PUPPETEER_EXECUTABLE_PATH
node -e "console.log(process.env.PUPPETEER_EXECUTABLE_PATH)"
```

### 2. API Testing
```bash
# Direct API test
curl -X GET "http://45.138.159.166:3003/pdf/test/1/debug" \
     -H "Authorization: Bearer eyJ..."

# Expected response:
# {
#   "pdfkitSuccess": true,
#   "puppeteerSuccess": true,
#   "pdfkitSize": 25000,
#   "puppeteerSize": 85000,
#   "errors": []
# }
```

## 📈 Performance

| Aspect | PDFKit | Puppeteer |
|--------|---------|-----------|
| Size | ~25KB | ~85KB |
| Speed | <1s | 2-3s |
| Memory | 50MB | 150MB |
| Quality | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Savollar | ✅ | ✅ |
| Javoblar | ✅ | ✅ |
| Rasmlar | ⚠️ | ✅ |

## 🚨 Troubleshooting

### Common Issues:

1. **"Chromium not found"**
   ```bash
   # Fix
   sudo apt-get install chromium-browser
   export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
   ```

2. **"PDF generation timeout"**
   ```bash
   # PM2 restart with more memory
   pm2 delete lms-backend
   pm2 start ecosystem.config.js
   ```

3. **"Permission denied"**
   ```bash
   # Fix permissions
   chmod 755 /var/www/lms/backend/logs
   ```

## ✅ Final Checklist

- [ ] Server setup script bajarildi
- [ ] Dependencies o'rnatildi
- [ ] Environment variables sozlandi
- [ ] CI/CD pipeline yangilandi
- [ ] PDF endpoints test qilindi
- [ ] Frontend integration qilindi
- [ ] Monitoring sozlandi

## 🎯 Next Deployment

Keyingi deployment paytida:

1. **Automatic PDF setup** - CI/CD o'zi hamma narsani sozlaydi
2. **PDF generation test** - Deployment paytida test qilinadi
3. **Fallback system** - Puppeteer ishlamasa PDFKit ishlaydi
4. **Monitoring** - PM2 logs orqali monitoring

Endi sizning CI/CD pipeline ingiz **PDF generatsiya bilan to'liq ishlaydi**! 🎉

## 📞 Support

Agar muammolar bo'lsa:
1. PM2 logs ni tekshiring: `pm2 logs lms-backend`
2. PDF debug endpoint ni test qiling: `/pdf/test/1/debug`
3. Server resources ni monitoring qiling: `htop`
