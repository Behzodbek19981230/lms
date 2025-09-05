import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PuppeteerPdfService {
  private readonly logger = new Logger(PuppeteerPdfService.name);

  /**
   * HTML dan PDF yaratish (Puppeteer yordamida)
   */
  async generatePDFFromHTML(html: string, options: any = {}): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;
    
    try {
      this.logger.log('Starting Puppeteer PDF generation');

      // Puppeteer browser ochish
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
      });

      const page = await browser.newPage();
      
      // HTML kontentni sahifaga yuklash
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // PDF yaratish
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true,
        ...options
      });

      this.logger.log(`Puppeteer PDF generated successfully. Size: ${pdfBuffer.length} bytes`);
      
      return pdfBuffer as Buffer;
    } catch (error) {
      this.logger.error('Puppeteer PDF generation failed:', error);
      throw new InternalServerErrorException(`PDF yaratishda xatolik: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Test HTML template yaratish
   */
  generateTestHTML(testData: any, options: any = {}): string {
    const { 
      title, 
      subject, 
      questions = [], 
      variantNumber, 
      studentName,
      duration,
      totalPoints,
      isAnswerKey = false 
    } = testData;

    return `
      <!DOCTYPE html>
      <html lang="uz">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title || 'Test'}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm 15mm;
          }
          
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 0;
          }
          
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
          }
          
          .title {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 8px;
            text-transform: uppercase;
          }
          
          .subtitle {
            font-size: 14pt;
            margin-bottom: 5px;
          }
          
          .info {
            font-size: 11pt;
            margin: 3px 0;
          }
          
          .test-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 10pt;
            border: 1px solid #ccc;
            padding: 10px;
            background-color: #f9f9f9;
          }
          
          .question {
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          
          .question-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-weight: bold;
          }
          
          .question-number {
            font-size: 12pt;
            color: #333;
          }
          
          .question-points {
            font-size: 10pt;
            color: #666;
            font-style: italic;
          }
          
          .question-text {
            margin-bottom: 10px;
            padding-left: 15px;
            line-height: 1.5;
          }
          
          .question-image {
            max-width: 100%;
            height: auto;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          
          .answers {
            padding-left: 25px;
          }
          
          .answer {
            margin: 5px 0;
            display: flex;
            align-items: flex-start;
          }
          
          .answer-letter {
            min-width: 25px;
            font-weight: bold;
            margin-right: 8px;
          }
          
          .answer-text {
            flex: 1;
            line-height: 1.4;
          }
          
          .correct-answer {
            background-color: #e8f5e8;
            padding: 2px 4px;
            border-radius: 3px;
          }
          
          .answer-line {
            border-bottom: 1px solid #000;
            min-width: 200px;
            display: inline-block;
            margin: 0 5px;
          }
          
          .footer {
            position: fixed;
            bottom: 10mm;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 9pt;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 5px;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          /* LaTeX formula placeholder */
          .formula {
            font-style: italic;
            background-color: #f0f0f0;
            padding: 2px 4px;
            border-radius: 3px;
            margin: 0 2px;
          }
          
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${title || 'TEST'}</div>
          ${subject ? `<div class="subtitle">Fan: ${subject}</div>` : ''}
          ${variantNumber ? `<div class="info">Variant: ${variantNumber}</div>` : ''}
          ${studentName ? `<div class="info">Talaba: ${studentName}</div>` : ''}
          <div class="info">Sana: ${new Date().toLocaleDateString('uz-UZ')}</div>
        </div>
        
        <div class="test-info">
          <span>Savollar soni: ${questions.length}</span>
          ${totalPoints ? `<span>Jami ball: ${totalPoints}</span>` : ''}
          ${duration ? `<span>Vaqt: ${duration} daqiqa</span>` : ''}
          ${isAnswerKey ? '<span style="font-weight: bold; color: #d00;">JAVOBLAR KALITI</span>' : ''}
        </div>
        
        ${questions.map((question: any, index: number) => this.generateQuestionHTML(question, index + 1, isAnswerKey)).join('')}
        
        <div class="footer">
          Universal LMS - Test tizimi | ${new Date().toLocaleString('uz-UZ')}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Savol uchun HTML yaratish
   */
  private generateQuestionHTML(question: any, number: number, isAnswerKey: boolean): string {
    const { text, type, points, answers = [], imageBase64 } = question;

    let questionHTML = `
      <div class="question">
        <div class="question-header">
          <span class="question-number">${number}.</span>
          <span class="question-points">${points} ball</span>
        </div>
        <div class="question-text">
          ${this.formatText(text)}
        </div>
    `;

    // Rasm qo'shish
    if (imageBase64) {
      const imageSrc = imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;
      questionHTML += `
        <div>
          <img src="${imageSrc}" alt="Savol rasmi" class="question-image" />
        </div>
      `;
    }

    // Javob variantlari
    if (type === 'multiple_choice' && answers.length > 0) {
      questionHTML += '<div class="answers">';
      answers.forEach((answer: any, index: number) => {
        const letter = String.fromCharCode(65 + index); // A, B, C, D
        const isCorrect = isAnswerKey && answer.isCorrect;
        questionHTML += `
          <div class="answer">
            <span class="answer-letter">${letter})</span>
            <span class="answer-text ${isCorrect ? 'correct-answer' : ''}">
              ${this.formatText(answer.text)} ${isCorrect ? '✓' : ''}
            </span>
          </div>
        `;
      });
      questionHTML += '</div>';
    } else if (type === 'true_false') {
      questionHTML += `
        <div class="answers">
          <div class="answer">
            <span class="answer-letter">A)</span>
            <span class="answer-text ${isAnswerKey && answers.find((a: any) => a.isCorrect && a.text.toLowerCase().includes('to\'g\'ri')) ? 'correct-answer' : ''}">
              To'g'ri ${isAnswerKey && answers.find((a: any) => a.isCorrect && a.text.toLowerCase().includes('to\'g\'ri')) ? '✓' : ''}
            </span>
          </div>
          <div class="answer">
            <span class="answer-letter">B)</span>
            <span class="answer-text ${isAnswerKey && answers.find((a: any) => a.isCorrect && a.text.toLowerCase().includes('noto\'g\'ri')) ? 'correct-answer' : ''}">
              Noto'g'ri ${isAnswerKey && answers.find((a: any) => a.isCorrect && a.text.toLowerCase().includes('noto\'g\'ri')) ? '✓' : ''}
            </span>
          </div>
        </div>
      `;
    } else {
      // Essay yoki short answer
      questionHTML += `
        <div class="answers">
          <div>Javob: <span class="answer-line"></span></div>
        </div>
      `;
    }

    questionHTML += '</div>';
    return questionHTML;
  }

  /**
   * Matnni formatlash (LaTeX, HTML)
   */
  private formatText(text: string): string {
    if (!text) return '';

    let formattedText = text;

    // LaTeX formulalarni formatlash
    formattedText = formattedText.replace(/\$\$(.*?)\$\$/g, '<span class="formula">[$1]</span>');
    formattedText = formattedText.replace(/\$(.*?)\$/g, '<span class="formula">[$1]</span>');

    // HTML taglarni tozalash (xavfsizlik uchun)
    formattedText = formattedText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    return formattedText;
  }
}
