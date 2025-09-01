# PDF faylni yuklab olish skripti
# Foydalanish: .\download-pdf.ps1 -Token "YOUR_JWT_TOKEN_HERE"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$url = "https://lms.api.universal-uz.uz/exams/variants/3/pdf"
$outputPath = "exam_variant_3.pdf"

$headers = @{
    "Authorization" = "Bearer $Token"
    "Accept" = "application/pdf"
}

try {
    Write-Host "PDF yuklab olinmoqda..." -ForegroundColor Yellow
    
    Invoke-WebRequest -Uri $url -Headers $headers -OutFile $outputPath
    
    Write-Host "PDF muvaffaqiyatli yuklandi: $outputPath" -ForegroundColor Green
    
    # PDF faylni ochish
    Start-Process $outputPath
    
} catch {
    Write-Host "Xatolik yuz berdi:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "Token noto'g'ri yoki muddati tugagan. Qayta login qiling." -ForegroundColor Yellow
    }
}
