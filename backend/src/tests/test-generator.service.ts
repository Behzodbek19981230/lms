/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Center } from '../centers/entities/center.entity';
import { TelegramChat } from '../telegram/entities/telegram-chat.entity';
import { Test } from './entities/test.entity';
import { Question, QuestionType } from '../questions/entities/question.entity';
import { Subject } from '../subjects/entities/subject.entity';
import {
  GeneratedTest,
  GeneratedTestVariant,
} from './entities/generated-test.entity';
import { Results } from './entities/results.entity';
import { LatexProcessorService } from './latex-processor.service';
import { LogsService } from 'src/logs/logs.service';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as katex from 'katex';
// import { User } from 'src/users/entities/user.entity';

export interface GenerateTestDto {
  title: string;
  subjectId: number;
  questionCount: number;
  variantCount: number;
  timeLimit: number;
  difficulty: string;
  includeAnswers: boolean;
  showTitleSheet: boolean;
  testId?: number; // Optional: single test
  testIds?: number[]; // Optional: multiple tests
}

export interface TestVariant {
  id: string;
  variantNumber: string;
  uniqueNumber: string;
  questions: Question[];
  createdAt: Date;
}

@Injectable()
export class TestGeneratorService {
  constructor(
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Subject)
    private subjectRepository: Repository<Subject>,
    @InjectRepository(GeneratedTest)
    private generatedTestRepository: Repository<GeneratedTest>,
    @InjectRepository(GeneratedTestVariant)
    private generatedTestVariantRepository: Repository<GeneratedTestVariant>,
    @InjectRepository(Results)
    private resultsRepository: Repository<Results>,
    private latexProcessor: LatexProcessorService,
    private logService: LogsService,
    private telegramService: import('../telegram/telegram.service').TelegramService,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Center)
    private centerRepo: Repository<Center>,
    @InjectRepository(TelegramChat)
    private telegramChatRepo: Repository<TelegramChat>,
  ) {}

  /**
   * List all grading results, optionally filtered by student_id or uniqueNumber
   */
  async listResults(options?: {
    studentId?: number;
    uniqueNumber?: string;
    centerId?: number;
  }) {
    const where: any = {};
    if (options?.studentId !== undefined) {
      where.student_id = options.studentId;
    }
    if (options?.uniqueNumber) {
      where.uniqueNumber = options.uniqueNumber;
    }
    if (options?.centerId !== undefined) {
      where.center_id = options.centerId;
    }
    // If centerId is present, join with Center entity to get center name
    let results: Results[];
    // Always join user relation to get student name
    if (options?.centerId !== undefined) {
      results = await this.resultsRepository.find({
        where,
        relations: ['center', 'user'],
      });
    } else {
      results = await this.resultsRepository.find({
        where,
        relations: ['user'],
      });
    }
    return results.map(
      (
        r: Results & {
          center?: { name?: string };
          user?: { firstName?: string; lastName?: string };
        },
      ) => ({
        id: r.id,
        student_id: r.student_id,
        student_name: r.user
          ? `${r.user.firstName ?? ''} ${r.user.lastName ?? ''}`.trim()
          : undefined,
        center_id: r.center_id,
        center_name: r.center?.name ?? undefined,
        uniqueNumber: r.uniqueNumber,
        total: r.total,
        correctCount: r.correctCount,
        wrongCount: r.wrongCount,
        blankCount: r.blankCount,
        perQuestion: r.perQuestion,
        createdAt: r.createdAt,
      }),
    );
  }

  /**
   * Generate printable HTML files for provided variants and return public URLs
   */
  async generatePrintableHtmlFiles(input: {
    variants: TestVariant[];
    config: GenerateTestDto;
    subjectName: string;
    teacherId: number;
  }): Promise<{
    files: Array<{
      variantNumber: string;
      url: string;
      fileName: string;
    }>;
    title: string;
    combinedUrl?: string;
  }> {
    const title = input.config.title || `${input.subjectName} testi`;
    const timestamp = Date.now();
    const publicDir = this.getPublicDir();
    const uploadsDir = join(publicDir, 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const slug = (s: string) =>
      (s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 80);

    const files: Array<{
      variantNumber: string;
      url: string;
      fileName: string;
    }> = [];

    const variantInners: string[] = [];

    for (const variant of input.variants) {
      const inner = this.buildVariantHtml(variant, input);
      variantInners.push(inner);
      const pageTitle = `${title} — Variant ${variant.variantNumber} (#${variant.uniqueNumber})`;
      const html = this.wrapHtmlForBrowser(inner, pageTitle);

      const fileName = `${slug(title)}-variant-${slug(variant.variantNumber)}-${timestamp}.html`;
      const absolutePath = join(uploadsDir, fileName);
      await fs.writeFile(absolutePath, html, 'utf8');
      const url = `/uploads/${fileName}`;

      files.push({
        variantNumber: variant.variantNumber,
        url,
        fileName,
      });

      // Persist printable info and answer key by uniqueNumber
      try {
        const variantEntity = await this.generatedTestVariantRepository.findOne(
          {
            where: { uniqueNumber: variant.uniqueNumber },
            relations: ['generatedTest'],
          },
        );
        if (variantEntity) {
          const answerKey = this.buildAnswerKey(variant.questions);
          variantEntity.printableUrl = url;
          variantEntity.printableFileName = fileName;
          variantEntity.answerKey = answerKey;
          await this.generatedTestVariantRepository.save(variantEntity);
        } else {
          void this.logService.log(
            `Variant not found for uniqueNumber=${variant.uniqueNumber} to persist printable info`,
            'TestGenerator',
          );
        }
      } catch (e) {
        void this.logService.log(
          `Failed to persist printable info for variant ${variant.uniqueNumber}: ${String(e)}`,
          'TestGenerator',
        );
      }
    }

    // Build a combined HTML containing all variants and all answer sheets
    let combinedUrl: string | undefined;
    try {
      const combinedHtml = this.buildCombinedHtml({
        title,
        subjectName: input.subjectName,
        variantInners,
      });
      const combinedFileName = `${slug(title)}-combined-${timestamp}.html`;
      const combinedAbsolutePath = join(uploadsDir, combinedFileName);
      await fs.writeFile(combinedAbsolutePath, combinedHtml, 'utf8');
      combinedUrl = `/uploads/${combinedFileName}`;
    } catch (e) {
      void this.logService.log(
        `Failed to build combined HTML: ${String(e)}`,
        'TestGenerator',
      );
    }

    return { files, title, combinedUrl };
  }

  private getPublicDir(): string {
    return join(__dirname, '..', '..', 'public');
  }

  private buildVariantHtml(
    variant: TestVariant,
    ctx: { config: GenerateTestDto; subjectName: string },
  ): string {
    const header = `
      <div class="header">
        <div class="title">${escapeHtml(
          ctx.config.title || `${ctx.subjectName} testi`,
        )}</div>
        <div class="subtitle">Variant: ${escapeHtml(variant.variantNumber)} — ID: #${escapeHtml(variant.uniqueNumber)}</div>
        <div class="meta">Sana: ${new Date().toLocaleDateString('uz-UZ')}</div>
      </div>`;

    const questionsHtml = (variant.questions || [])
      .map((q, idx) => {
        const textProcessed = this.extractImageFromText(q.text || '');
        const renderedQuestionText = this.renderTextWithLatex(
          textProcessed.cleanedText,
        );

        // Prefer image extracted from text; otherwise use imageBase64 on question with normalization
        const fromTextUri = this.normalizeDataUri(
          textProcessed.imageDataUri || '',
        );
        const fromFieldUri = this.getImageSrc(q.imageBase64);
        const finalImageSrc = fromTextUri || fromFieldUri;
        const imgHtml = finalImageSrc
          ? `<div class="image-container"><img class="q-image" src="${finalImageSrc}" style="${textProcessed.imageStyles || ''}" alt="Savol rasmi" /></div>`
          : '';

        let answersHtml = '';
        if (
          q.type === QuestionType.MULTIPLE_CHOICE &&
          Array.isArray(q.answers) &&
          q.answers.length
        ) {
          answersHtml = `<div class="answers">${q.answers
            .map((a, i) => {
              const aProc = this.extractImageFromText(a.text || '');
              const aTextHtml = this.renderTextWithLatex(aProc.cleanedText);
              const aImgUri = this.normalizeDataUri(aProc.imageDataUri || '');
              const aImg = aImgUri
                ? `<div class="answer-image-container"><img class="answer-image" src="${aImgUri}" style="${aProc.imageStyles || ''}" alt="Javob rasmi"/></div>`
                : '';
              return `<div class="answer">${String.fromCharCode(65 + i)}) ${aTextHtml}${aImg}</div>`;
            })
            .join('')}</div>`;
        } else if (q.type === QuestionType.TRUE_FALSE) {
          answersHtml = `<div class="answers"><div class="answer">A) To'g'ri</div><div class="answer">B) Noto'g'ri</div></div>`;
        } else if (q.type === QuestionType.ESSAY) {
          answersHtml = `<div class="answers"><div class="answer">Javob: ___________________________</div></div>`;
        }

        return `<div class="question">
          <div class="q-row">
            <div class="q-no">${idx + 1}.</div>
            <div class="q-content">
              <div class="q-text">${renderedQuestionText}</div>
              ${imgHtml}
              ${answersHtml}
            </div>
          </div>
        </div>`;
      })
      .join('');

    return `<div class="page">${header}<div class="questions-container">${questionsHtml}</div></div>`;
  }

  // Build one combined HTML containing all variants and all answer sheets with print controls
  private buildCombinedHtml(input: {
    title: string;
    subjectName: string;
    variantInners: string[];
  }): string {
    const title = `${escapeHtml(input.title)} — Barcha variantlar va javoblar varagi`;
    const variantsSection = input.variantInners
      .map((inner) => `<div class="variant-item">${inner}</div>`)
      .join('');

    return `<!DOCTYPE html>
    <html lang="uz">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <link rel="preconnect" href="https://cdn.jsdelivr.net" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
      <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; }
        body { font-family: Times, 'Times New Roman', serif; margin: 0; color: #111; }
        .toolbar { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #eee; padding: 8px 12px; display:flex; gap:8px; align-items:center; z-index: 10; }
        .toolbar button { padding: 6px 10px; font-size: 14px; }
        .section { padding: 8px 12px; }
        .section-title { font-size: 18px; font-weight: 700; margin: 8px 0 12px; }
        .page-break { page-break-after: always; }

        /* Variants grid: show variants in two columns with centered separator */
        .variants-container {
          column-count: 1;
          column-gap: 36px;
          padding: 8px 12px;
        }
      
        .variant-item {
          display: block; /* each variant becomes a block constrained by the column */
          break-inside: avoid;
          -webkit-column-break-inside: avoid;
          -moz-column-break-inside: avoid;
          margin-bottom: 18px;
          /* ensure the inner .page layout uses full column width */
        }
           /* Two-column questions container with centered vertical separator */
  .questions-container {
    column-count: 2;
    column-gap: 36px;
    position: relative; /* needed for centered separator */
    padding: 8px 12px;
  }
  .questions-container:before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    background: #ddd;
    transform: translateX(-0.5px);
    pointer-events: none;
  }

        /* Print: force each .variant-item to start on a new page, but only for the left column */
  @media print {
  .toolbar {
    display: none;
  }
    



  /* Savollar ichida sahifa bo‘linmasin */
  .question {
    page-break-inside: avoid;
  }

  /* Keraksiz sahifa bo‘shliqlarini yo‘qotish */
  html, body {
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Oxirida bo‘sh sahifa chiqmasligi uchun */
  .variant-item:last-child {
    page-break-after: avoid;
  }
}

 
  
      </style>
      <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
      <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
    </head>
    <body>
      <div class="toolbar">
        <button onclick="(function(){ document.body.classList.remove('print-sheets'); document.body.classList.add('print-variants'); setTimeout(function(){ window.print(); setTimeout(function(){ document.body.classList.remove('print-variants'); }, 100); }, 0); })()">Faqat variantlar</button>
        <span style="color:#666; font-size:13px;">Chop etish oynasida "Save as PDF"ni tanlang.</span>
      </div>
      <div class="section" id="variants">
        <div class="section-title">Barcha variantlar</div>
        <div class="variants-container">${variantsSection}</div>
      </div>
     
      <script>

        window.addEventListener('DOMContentLoaded', function() {
          // Render math if available
          if (window.renderMathInElement) {
            try {
              window.renderMathInElement(document.body, {
                delimiters: [
                  {left: '$$', right: '$$', display: true},
                  {left: '$', right: '$', display: false},
                  {left: '\\(', right: '\\)', display: false},
                  {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError: false
              });
            } catch (e) { console.warn('KaTeX render error', e); }
          }

          // Handle query params: ?mode=variants|sheets|all and ?print=1
          try {
            var params = new URLSearchParams(window.location.search);
            var mode = (params.get('mode') || '').toLowerCase();
            if (mode === 'variants') {
              document.body.classList.add('print-variants');
              document.body.classList.remove('print-sheets');
            } else if (mode === 'sheets') {
              document.body.classList.add('print-sheets');
              document.body.classList.remove('print-variants');
            } else {
              document.body.classList.remove('print-variants');
              document.body.classList.remove('print-sheets');
            }
            if (params.get('print') === '1') {
              setTimeout(function(){ window.print(); }, 0);
            }
          } catch (e) { /* ignore */ }
        });
      </script>
    </body>
    </html>`;
  }

  private wrapHtmlForBrowser(inner: string, title: string): string {
    return `<!DOCTYPE html>
      <html lang="uz">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: Times, 'Times New Roman', serif; margin: 0; padding: 0; color: #111; }
          .toolbar { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #eee; padding: 8px 12px; display:flex; gap:8px; align-items:center; z-index: 10; }
          .toolbar button { padding: 6px 10px; font-size: 14px; }
          .page { page-break-after: always; padding: 0 6mm; }
          .header { text-align: center; margin-bottom: 12px; }
          .title { font-size: 20px; font-weight: 700; margin: 0 0 6px 0; }
          .subtitle { font-size: 12px; margin: 2px 0; color: #333; }
          .meta { font-size: 10px; color: #666; }

          /* Two-column questions container with centered vertical separator */
          .questions-container {
            column-count: 2;
            column-gap: 36px;
            position: relative; /* needed for centered separator */
            padding: 8px 12px;
            /* ensure content doesn't overlap separator */
          }
          .questions-container:before {
            content: "";
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 1px;
            background: #ddd;
            transform: translateX(-0.5px);
            pointer-events: none;
          }

          .question {
            margin: 10px 0 14px 0;
            break-inside: avoid;
            break-inside: avoid-column;
            -webkit-column-break-inside: avoid;
            -moz-column-break-inside: avoid;
          }
          .q-row { display: flex; align-items: flex-start; gap: 8px; }
          .q-no { color: #000; font-weight: 600; min-width: 20px; flex-shrink: 0; }
          .q-content { flex: 1; }
          .q-text { margin-bottom: 6px; }
          .points { color: #666; font-size: 10px; font-weight: 500; align-self: flex-start; flex-shrink: 0; margin-left: 8px; }
          .answers { margin-top: 6px; padding-left: 0; }
          .answer { margin: 2px 0; }
          .image-container { margin: 8px 0; }
          .answer-image-container { margin: 4px 0 4px 20px; display: inline-block; }
          .answer-image { max-width: 200px; height: auto; max-height: 150px; border: 1px solid #ddd; border-radius: 4px; margin: 2px 0; break-inside: avoid; display: inline-block; vertical-align: middle; }
          .katex-display { margin: 6px 0; }
          img.q-image { max-width: 100%; height: auto; max-height: 300px; border: 1px solid #ddd; border-radius: 4px; margin: 6px 0; break-inside: avoid; display: block; }
          img[style*="width"], img[style*="height"] { max-width: none !important; max-height: none !important; }
          .key-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
          .key-table th, .key-table td { border: 1px solid #ccc; padding: 6px 8px; text-align: center; }
          .key-table th { background: #f7f7f7; }
          @media print { .toolbar { display: none; } }

          /* Hide center separator on small screens when columns drop to one */
          @media screen and (max-width: 900px) {
            .questions-container { column-count: 1; }
            .questions-container:before { display: none; }
          }
        </style>
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
      </head>
      <body>
        <div class="toolbar">
          <button onclick="window.print()">PDFga chop etish</button>
          <span style="color:#666; font-size:13px;">Chop etish oynasida "Save as PDF"ni tanlang.</span>
        </div>
        ${inner}
        <script>
          window.addEventListener('DOMContentLoaded', function() {
            if (window.renderMathInElement) {
              try {
                window.renderMathInElement(document.body, {
                  delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                  ],
                  throwOnError: false
                });
              } catch (e) {
                console.warn('KaTeX render error', e);
              }
            }
          });
        </script>
      </body>
      </html>`;
  }

  private extractImageFromText(text: string): {
    cleanedText: string;
    imageDataUri: string | null;
    imageStyles?: string;
  } {
    if (!text) {
      return { cleanedText: '', imageDataUri: null };
    }

    const markdownImageWithSizePattern =
      /!\[[^\]]*\|([^\]]+)\]\((data:image\/[^\s)]+[^)]*)\)/gs;
    let cleanedText = text;
    let imageDataUri: string | null = null;
    let imageStyles: string | undefined;

    for (const match of text.matchAll(markdownImageWithSizePattern)) {
      const styles = match[1];
      let imageSrc = match[2];
      imageSrc = this.extractDataUriFromText(imageSrc);
      if (imageSrc && imageSrc.startsWith('data:image/') && !imageDataUri) {
        imageDataUri = this.normalizeDataUri(imageSrc) ?? null;
        imageStyles = this.parseImageStyles(styles);
      }
      cleanedText = cleanedText.replace(match[0], '');
    }

    if (!imageDataUri) {
      const markdownImagePattern =
        /!\[[^\]]*\]\((data:image\/[^\s)]+[^)]*)\)/gs;
      for (const match of text.matchAll(markdownImagePattern)) {
        let imageSrc = match[1];
        imageSrc = this.extractDataUriFromText(imageSrc);
        if (imageSrc && imageSrc.startsWith('data:image/') && !imageDataUri) {
          imageDataUri = this.normalizeDataUri(imageSrc) ?? null;
        }
        cleanedText = cleanedText.replace(match[0], '');
      }
    }

    cleanedText = cleanedText.replace(/!\[[^\]]*\]/g, '').trim();
    return { cleanedText, imageDataUri, imageStyles };
  }

  private extractDataUriFromText(s: string): string {
    if (!s) return '';
    const cleaned = s.replace(/\s+/g, '');
    const m = cleaned.match(/(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)/i);
    return m ? m[1] : cleaned;
  }

  private parseImageStyles(styleString: string): string {
    if (!styleString) return '';
    return styleString
      .split(';')
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
      .join('; ');
  }

  // Convert LaTeX delimiters in plain text to HTML using KaTeX; non-math text is HTML-escaped
  private renderTextWithLatex(text: string): string {
    try {
      return renderWithKatexAllowHtml(text ?? '');
    } catch (e) {
      void this.logService.log(
        `KaTeX render failed: ${e instanceof Error ? e.message : String(e)}`,
        'TestGenerator',
      );
      return escapeHtml(text ?? '');
    }
  }

  private getImageSrc(imageBase64?: string, mime?: string): string | null {
    if (!imageBase64) return null;

    try {
      const cleanBase64 = imageBase64.replace(/\s+/g, '');

      if (/^data:image\/[a-zA-Z]+;base64,/.test(cleanBase64)) {
        return this.normalizeDataUri(cleanBase64);
      }

      if (this.isValidBase64(cleanBase64)) {
        const safeMime =
          mime || this.detectImageMimeType(cleanBase64) || 'image/png';
        return `data:${safeMime};base64,${cleanBase64}`;
      }

      return null;
    } catch (error) {
      void this.logService.log(
        `Error processing image data: ${error instanceof Error ? error.message : String(error)}`,
        'TestGenerator',
      );
      return null;
    }
  }

  private isValidBase64(str: string): boolean {
    if (!str || str.length < 4) return false;
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) return false;
    const paddedLength = str.length + ((4 - (str.length % 4)) % 4);
    if (paddedLength % 4 !== 0) return false;
    try {
      const decoded = Buffer.from(str, 'base64').toString('binary');
      const reencoded = Buffer.from(decoded, 'binary').toString('base64');
      return str.replace(/=+$/, '') === reencoded.replace(/=+$/, '');
    } catch {
      return false;
    }
  }

  private normalizeDataUri(dataUri: string): string | null {
    if (!dataUri || !dataUri.startsWith('data:image/')) {
      return null;
    }
    try {
      const [header, base64Data] = dataUri.split(',');
      if (!header || !base64Data) {
        void this.logService.log(
          'Invalid data URI format: missing header or base64 data',
          'TestGenerator',
        );
        return null;
      }
      let cleanBase64 = base64Data.replace(/\s+/g, '');
      cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, '');
      const paddingNeeded = (4 - (cleanBase64.length % 4)) % 4;
      if (paddingNeeded > 0) cleanBase64 += '='.repeat(paddingNeeded);
      if (!this.isValidBase64(cleanBase64)) {
        void this.logService.log(
          'Invalid base64 data detected',
          'TestGenerator',
        );
        return null;
      }
      try {
        const decoded = Buffer.from(cleanBase64, 'base64');
        if (decoded.length < 50) {
          void this.logService.log(
            'Base64 data too small to be a valid image',
            'TestGenerator',
          );
          return null;
        }
      } catch (err) {
        void this.logService.log(
          `Failed to decode base64 data: ${String(err)}`,
          'TestGenerator',
        );
        return null;
      }
      return `${header},${cleanBase64}`;
    } catch (error) {
      void this.logService.log(
        `Failed to normalize data URI: ${String(error)}`,
        'TestGenerator',
      );
      return null;
    }
  }

  private detectImageMimeType(base64: string): string | null {
    if (base64.startsWith('/9j/')) return 'image/jpeg';
    if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
    if (base64.startsWith('R0lGODlh') || base64.startsWith('R0lGODdh'))
      return 'image/gif';
    if (base64.startsWith('UklGR')) return 'image/webp';
    return null;
  }

  /**
   * Generate unique 10-digit number for test variant
   */
  private generateUniqueNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return (timestamp.slice(-7) + random).padStart(10, '0');
  }

  /**
   * Generate random test variants
   */
  async generateRandomTest(dto: GenerateTestDto, teacherId: number) {
    // Validate subject
    const subject = await this.subjectRepository.findOne({
      where: { id: dto.subjectId },
    });

    if (!subject) {
      throw new NotFoundException('Fan topilmadi');
    }

    // Get available questions
    void this.logService.log(
      `Available questions for subject ${subject.name}: test id ${dto.testId}, test ids: ${(dto.testIds || []).join(',')}`,
      'TestGenerator',
    );

    let availableQuestions: Question[] = [];
    if (dto.testIds && dto.testIds.length > 0) {
      // Fetch questions from multiple tests
      availableQuestions = await this.questionRepository.find({
        where: dto.testIds.map((id) => ({ test: { id } })),
        relations: ['answers', 'test'],
      });
    } else {
      availableQuestions = await this.questionRepository.find({
        where: {
          test: dto.testId
            ? { id: dto.testId }
            : { subject: { id: dto.subjectId } },
        },
        relations: ['answers', 'test'],
      });
    }

    if (availableQuestions.length === 0) {
      throw new BadRequestException('Tanlangan fanda savollar mavjud emas');
    }

    if (availableQuestions.length < dto.questionCount) {
      throw new BadRequestException(
        `Fanda ${availableQuestions.length} ta savol bor, lekin ${dto.questionCount} ta so'rayapsiz`,
      );
    }

    // Create generated test record
    const generatedTest = this.generatedTestRepository.create({
      title: dto.title || `${subject.name} testi`,
      description: '',
      variantCount: dto.variantCount,
      questionCount: dto.questionCount,
      timeLimit: dto.timeLimit,
      difficulty: dto.difficulty,
      includeAnswers: dto.includeAnswers,
      showTitleSheet: dto.showTitleSheet,
      teacher: { id: teacherId },
      subject: { id: dto.subjectId },
    });

    const savedGeneratedTest =
      await this.generatedTestRepository.save(generatedTest);

    // Generate variants
    const variants: TestVariant[] = [];
    for (let v = 1; v <= dto.variantCount; v++) {
      // Randomly select questions for this variant
      const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, dto.questionCount);

      // Shuffle answer options for multiple choice questions
      const questionsWithShuffledAnswers = selectedQuestions.map((q) => {
        if (
          q.type === QuestionType.MULTIPLE_CHOICE &&
          q.answers &&
          q.answers.length > 1
        ) {
          const shuffledAnswers = [...q.answers].sort(
            () => 0.5 - Math.random(),
          );
          return { ...q, answers: shuffledAnswers };
        }
        return q;
      });

      const uniqueNumber = this.generateUniqueNumber();

      // Save variant to database
      const variant = this.generatedTestVariantRepository.create({
        uniqueNumber,
        variantNumber: v,
        questionsData: questionsWithShuffledAnswers,
        generatedAt: new Date(),
        generatedTest: savedGeneratedTest,
        answerKey: this.buildAnswerKey(questionsWithShuffledAnswers),
      });

      await this.generatedTestVariantRepository.save(variant);

      variants.push({
        id: `${Date.now()}-${v}`,
        variantNumber: v.toString(),
        uniqueNumber,
        questions: questionsWithShuffledAnswers,
        createdAt: new Date(),
      });
    }

    return {
      id: savedGeneratedTest.id,
      title: dto.title || `${subject.name} testi`,
      subject: subject.name,
      variants,
      config: dto,
      totalQuestions: dto.questionCount,
      totalVariants: dto.variantCount,
    };
  }

  /**
   * Build answer key JSON from questions list
   */
  private buildAnswerKey(questions: Question[]): {
    total: number;
    answers: string[]; // e.g., ['C', 'A', '-', ...]
  } {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const answers = (questions || []).map((q) => {
      if (
        q.type === QuestionType.MULTIPLE_CHOICE &&
        q.answers &&
        q.answers.length > 0
      ) {
        const idx = q.answers.findIndex((a) => a.isCorrect);
        return idx >= 0 ? letters[idx] || 'X' : 'X';
      }
      if (q.type === QuestionType.TRUE_FALSE) {
        // If answers array provided, index 0 => A (True), 1 => B (False)
        if (q.answers && q.answers.length > 0) {
          const idx = q.answers.findIndex((a) => a.isCorrect);
          if (idx === 0) return 'A';
          if (idx === 1) return 'B';
        }
        // Fallback heuristic: default to 'A'
        return 'A';
      }
      // Essay / other types do not have a single correct option
      return '-';
    });
    return { total: answers.length, answers };
  }

  /**
   * Retrieve stored variant info by unique number
   */
  async getVariantByUniqueNumber(uniqueNumber: string) {
    const variant = await this.generatedTestVariantRepository.findOne({
      where: { uniqueNumber },
      relations: [
        'generatedTest',
        'generatedTest.subject',
        'generatedTest.teacher',
      ],
    });
    if (!variant) {
      throw new NotFoundException('Variant topilmadi');
    }
    return {
      uniqueNumber: variant.uniqueNumber,
      variantNumber: variant.variantNumber,
      printableUrl: variant.printableUrl,
      printableFileName: variant.printableFileName,
      answerKey: variant.answerKey,
      generatedTest: {
        id: variant.generatedTest.id,
        title: variant.generatedTest.title,
        subject: variant.generatedTest.subject?.id,
        teacher: variant.generatedTest.teacher?.id,
      },
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
    };
  }

  /**
   * Grade scanned answers for a variant using its uniqueNumber
   */
  async gradeScannedAnswers(
    uniqueNumber: string,
    scannedAnswers: string[],
    studentId?: number,
    centerId?: number,
  ): Promise<{
    uniqueNumber: string;
    total: number;
    correctCount: number;
    wrongCount: number;
    blankCount: number;
    perQuestion: Array<{
      index: number; // 0-based
      scanned: string; // 'A'..'F' or '-' or 'X'
      correct: string; // 'A'..'F' or '-' or 'X'
      isCorrect: boolean;
    }>;
    resultId: number;
  }> {
    const variant = await this.generatedTestVariantRepository.findOne({
      where: { uniqueNumber },
    });
    if (!variant) throw new NotFoundException('Variant topilmadi');

    const key = variant.answerKey as unknown as {
      total: number;
      answers: string[];
    } | null;
    if (!key || !Array.isArray(key.answers)) {
      throw new BadRequestException('Javoblar kaliti topilmadi');
    }

    const total = Math.min(key.answers.length, scannedAnswers.length);
    const perQuestion: Array<{
      index: number;
      scanned: string;
      correct: string;
      isCorrect: boolean;
    }> = [];
    let correctCount = 0;
    let blankCount = 0;
    for (let i = 0; i < total; i++) {
      const scanned = (scannedAnswers[i] || '-').toUpperCase();
      const correct = (key.answers[i] || '-').toUpperCase();
      const isBlank = scanned === '-' || scanned === '';
      if (isBlank) blankCount++;
      const isCorrect = !isBlank && scanned === correct;
      if (isCorrect) correctCount++;
      perQuestion.push({ index: i, scanned, correct, isCorrect });
    }
    const wrongCount = total - correctCount - blankCount;

    // Save or update result by uniqueNumber
    let result = await this.resultsRepository.findOne({
      where: { uniqueNumber },
    });
    if (result) {
      // Update existing result
      result.student_id = studentId;
      result.center_id = centerId;
      result.total = total;
      result.correctCount = correctCount;
      result.wrongCount = wrongCount;
      result.blankCount = blankCount;
      result.perQuestion = perQuestion;
      await this.resultsRepository.save(result);
    } else {
      // Create new result
      result = this.resultsRepository.create({
        student_id: studentId,
        center_id: centerId,
        uniqueNumber,
        total,
        correctCount,
        wrongCount,
        blankCount,
        perQuestion,
      });
      await this.resultsRepository.save(result);
    }

    // --- Yangi kod: Telegram kanalga natija yuborish ---
    try {
      const student = result.student_id
        ? await this.userRepo.findOne({ where: { id: result.student_id } })
        : undefined;
      const center = result.center_id
        ? await this.centerRepo.findOne({ where: { id: result.center_id } })
        : undefined;
      const variantEntity = await this.generatedTestVariantRepository.findOne({
        where: { uniqueNumber },
        relations: ['generatedTest', 'generatedTest.subject'],
      });
      const subject = variantEntity?.generatedTest?.subject;

      // Kanalga xabar yuborish uchun TelegramService dan foydalanamiz
      await this.telegramService.sendTestResultToChannel({
        student: student ?? undefined,
        center: center ?? undefined,
        subject,
        correctCount,
        total,
      });
    } catch (err) {
      void this.logService.log(
        `Telegram kanalga natija yuborishda xatolik: ${err.message}`,
        'TestGenerator',
      );
    }

    return {
      uniqueNumber,
      total,
      correctCount,
      wrongCount,
      blankCount,
      perQuestion,
      resultId: result.id,
    };
  }

  /**
   * List generated tests for a teacher
   */
  async listGeneratedTests(teacherId: number) {
    const tests = await this.generatedTestRepository.find({
      where: { teacher: { id: teacherId } },
      relations: ['subject', 'teacher'],
      order: { createdAt: 'DESC' },
    });

    // Count variants per test without loading all questions
    const ids = tests.map((t) => t.id);
    const variantsByTest: Record<number, number> = {};
    if (ids.length > 0) {
      const qb = this.generatedTestVariantRepository
        .createQueryBuilder('v')
        .select('v.generatedTestId', 'generatedTestId')
        .addSelect('COUNT(*)', 'cnt')
        .where('v.generatedTestId IN (:...ids)', { ids })
        .groupBy('v.generatedTestId');
      const rows = await qb.getRawMany<{
        generatedTestId: string;
        cnt: string;
      }>();
      for (const r of rows)
        variantsByTest[Number(r.generatedTestId)] = Number(r.cnt);
    }

    return tests.map((t) => ({
      id: t.id,
      title: t.title,
      subject: {
        id: t.subject?.id,
        name: t.subject?.name,
      },
      teacher: {
        id: t.teacher?.id,
        fullName: (t as any).teacher?.fullName,
      },
      createdAt: t.createdAt,
      variantCount: variantsByTest[t.id] ?? t.variantCount ?? 0,
      questionCount: t.questionCount,
      timeLimit: t.timeLimit,
      difficulty: t.difficulty,
    }));
  }

  /**
   * List variants of a generated test, ensuring ownership
   */
  async listGeneratedTestVariants(testId: number, teacherId: number) {
    const test = await this.generatedTestRepository.findOne({
      where: { id: testId },
      relations: ['teacher'],
    });
    if (!test) throw new NotFoundException('Yaratilgan test topilmadi');
    if (test.teacher?.id !== teacherId)
      throw new BadRequestException("Bu testga ruxsatingiz yo'q");

    const variants = await this.generatedTestVariantRepository.find({
      where: { generatedTest: { id: testId } },
      order: { variantNumber: 'ASC' },
    });

    return variants.map((v) => ({
      uniqueNumber: v.uniqueNumber,
      variantNumber: v.variantNumber,
      printableUrl: v.printableUrl,
      printableFileName: v.printableFileName,
      generatedAt: v.generatedAt ?? v.createdAt,
      answerKey: v.answerKey,
    }));
  }

  /**
   * Generate PDF for test variants with 2-column layout
   */
  generateTestPDF(): Promise<Buffer> {
    // PDF generation is deprecated; use HTML printable flow instead
    return Promise.reject(
      new BadRequestException('PDF generation is disabled. Use HTML output.'),
    );
  }

  /**
   * Generate PDF for a single variant with 2-column layout
   */
  private async generateVariantPDF(
    doc: any,
    variant: TestVariant,
    config: GenerateTestDto,
    subjectName: string,
    contentMappings?: {
      latexMap?: Record<string, string>;
      imageMap?: Record<string, string>;
    },
  ): Promise<void> {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    const columnWidth = (pageWidth - margin * 2 - 60) / 2; // 60px gap between columns
    const columnSeparator = margin + columnWidth + 30; // Center line position

    // === HEADER PAGE ===
    if (config.showTitleSheet) {
      this.generateHeaderPage(
        doc,
        variant,
        config,
        subjectName,
        pageWidth as number,
        margin,
      );

      // Add new page for questions
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      doc.addPage();
    }

    // === QUESTIONS PAGE ===
    await this.generateQuestionsPage(
      doc,
      variant,
      config,
      pageWidth as number,
      pageHeight as number,
      margin,
      columnWidth,
      columnSeparator,
      contentMappings,
    );
  }

  /**
   * Generate header page with title and student info
   */
  private generateHeaderPage(
    doc: any,
    variant: TestVariant,
    config: GenerateTestDto,
    subjectName: string,
    pageWidth: number,
    margin: number,
  ): void {
    // Main title
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .font('Times-Bold')
      .fontSize(18)
      .text(config.title || `${subjectName} testi`, margin, margin + 80, {
        width: pageWidth - margin * 2,
        align: 'center',
      });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(1);

    // Variant info
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .font('Times-Roman')
      .fontSize(14)
      .text(`Variant ${variant.variantNumber}`, {
        align: 'center',
      });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.fontSize(12).text(`Unique ID: #${variant.uniqueNumber}`, {
      align: 'center',
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(2);

    // Test info box
    const infoStartY = doc.y;
    const boxHeight = 120;

    // Draw box
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .rect(margin + 50, infoStartY, pageWidth - margin * 2 - 100, boxHeight)
      .stroke();

    // Test info
    const testInfo = [
      `Fan: ${subjectName}`,
      `Vaqt: ${config.timeLimit} daqiqa`,
      `Savollar soni: ${variant.questions.length}`,
      `Sana: ${new Date().toLocaleDateString('uz-UZ')}`,
    ];

    let infoY = infoStartY + 20;
    testInfo.forEach((info) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      doc
        .font('Times-Roman')
        .fontSize(12)
        .text(info, margin + 70, infoY);
      infoY += 20;
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(3);

    // Student info section
    const studentInfoY = doc.y;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.font('Times-Bold').fontSize(14);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.text("Talaba ma'lumotlari:", margin, studentInfoY);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.font('Times-Roman').fontSize(12);

    const fieldY = studentInfoY + 40;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.text('Ism-familiya:', margin, fieldY);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .moveTo(margin + 80, fieldY + 15)
      .lineTo(pageWidth - margin, fieldY + 15)
      .stroke();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.text('Guruh:', margin, fieldY + 40);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .moveTo(margin + 50, fieldY + 55)
      .lineTo(margin + 200, fieldY + 55)
      .stroke();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.text('Variant:', margin + 250, fieldY + 40);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .moveTo(margin + 300, fieldY + 55)
      .lineTo(pageWidth - margin, fieldY + 55)
      .stroke();

    // Instructions
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(4);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.font('Times-Bold').fontSize(12);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.text("Ko'rsatmalar:", margin, doc.y);

    const instructions = [
      "• Barcha savollarni diqqat bilan o'qing",
      "• Har bir savol uchun eng to'g'ri javobni tanlang",
      '• Javoblaringizni aniq va tushunarli yozing',
      '• Berilgan vaqt ichida ishni yakunlang',
    ];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.font('Times-Roman').fontSize(11);
    instructions.forEach((instruction) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      doc.text(instruction, margin, doc.y + 15);
    });
  }

  /**
   * Generate questions page with 2-column layout
   */
  private async generateQuestionsPage(
    doc: any,
    variant: TestVariant,
    config: GenerateTestDto,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    columnWidth: number,
    columnSeparator: number,
    contentMappings?: {
      latexMap?: Record<string, string>;
      imageMap?: Record<string, string>;
    },
  ): Promise<void> {
    // Page header
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .font('Times-Bold')
      .fontSize(16)
      .text('SAVOLLAR', margin, margin, {
        width: pageWidth - margin * 2,
        align: 'center',
      });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(1);

    // Draw vertical line between columns on each page
    this.drawColumnSeparator(doc, columnSeparator, margin, pageHeight);

    // Questions in 2-column layout
    const startY = doc.y;
    let leftY = startY;
    let rightY = startY;
    let currentColumn = 'left';
    let questionCounter = 1;

    for (let i = 0; i < variant.questions.length; i++) {
      const question = variant.questions[i];
      const questionText = `${questionCounter}. ${question.text}`;

      // Better space calculation with LaTeX and image support
      const processedQuestionForSpace = this.latexProcessor
        .processContentEnhanced
        ? this.latexProcessor.processContentEnhanced(questionText)
        : { hasImages: false, base64Images: [] };

      // More accurate space calculation
      const baseSpace = 50; // Space for question text (increased for better spacing)

      // Calculate answer space more accurately
      const answerCount = question.answers?.length || 0;
      let answerSpace = answerCount * 20; // 20px per answer line

      // Add space for True/False or Essay questions
      if (question.type === QuestionType.TRUE_FALSE) {
        answerSpace = 40; // Space for A) and B) options
      } else if (question.type === QuestionType.ESSAY) {
        answerSpace = 30; // Space for answer line
      }

      // Calculate image space
      const questionImageSpace = processedQuestionForSpace.hasImages
        ? (processedQuestionForSpace.base64Images?.length || 0) * 100
        : 0;

      // Calculate answer image space (rough estimate)
      let answerImageSpace = 0;
      if (question.answers) {
        question.answers.forEach((answer) => {
          if (this.latexProcessor.hasBase64Images(answer.text)) {
            answerImageSpace += 50; // Smaller space for answer images
          }
        });
      }

      const totalSpace =
        baseSpace + answerSpace + questionImageSpace + answerImageSpace + 30; // Total with padding

      let xPos: number;
      let yPos: number;

      // Determine position and column
      if (currentColumn === 'left') {
        if (leftY + totalSpace > pageHeight - 80) {
          // Switch to right column
          currentColumn = 'right';
          xPos = columnSeparator + 30;
          yPos = rightY;
          rightY += totalSpace;
        } else {
          xPos = margin;
          yPos = leftY;
          leftY += totalSpace;
        }
      } else {
        if (rightY + totalSpace > pageHeight - 80) {
          // Add new page
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          doc.addPage();

          // Redraw column separator on new page
          this.drawColumnSeparator(doc, columnSeparator, margin, pageHeight);

          leftY = margin + 30;
          rightY = margin + 30;
          currentColumn = 'left';
          xPos = margin;
          yPos = leftY;
          leftY += totalSpace;
        } else {
          xPos = columnSeparator + 30;
          yPos = rightY;
          rightY += totalSpace;
        }
      }

      // Draw question with enhanced LaTeX and image support using MathJax
      let processedQuestion =
        this.latexProcessor.processContentEnhanced(questionText);

      // Apply content mappings if provided
      if (contentMappings?.imageMap) {
        processedQuestion = {
          ...processedQuestion,
          ...this.latexProcessor.mapImageData(
            processedQuestion,
            contentMappings.imageMap,
          ),
        };
      }

      // Remove IMAGE placeholders that don't have data and LATEX_SVG placeholders
      let questionDisplayText = processedQuestion.text;
      processedQuestion.base64Images.forEach((imageInfo) => {
        if (!imageInfo.data || !imageInfo.data.startsWith('data:image/')) {
          // Replace IMAGE placeholder with empty string
          questionDisplayText = questionDisplayText.replace(
            imageInfo.placeholder,
            '',
          );
        } else {
          // Remove IMAGE placeholder since we'll render the image separately
          questionDisplayText = questionDisplayText.replace(
            imageInfo.placeholder,
            '',
          );
        }
      });

      // Remove LATEX_SVG placeholders since we'll render them as SVG
      processedQuestion.svgFormulas?.forEach((svgFormula) => {
        questionDisplayText = questionDisplayText.replace(
          svgFormula.placeholder,
          '',
        );
      });

      // Calculate text height for better positioning
      const textHeight = this.estimateTextHeight(
        questionDisplayText,
        columnWidth - 10,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      doc
        .font('Times-Roman')
        .fontSize(13)
        .text(questionDisplayText, xPos, yPos, {
          width: columnWidth - 10,
          align: 'left',
          lineGap: 3, // Increased line gap for better readability
        });

      let currentYPos = yPos + textHeight + 10; // Dynamic spacing based on text height      // Handle Base64 images in question if any
      if (processedQuestion.hasImages && processedQuestion.base64Images) {
        processedQuestion.base64Images.forEach((imageInfo) => {
          if (imageInfo.data && imageInfo.data.startsWith('data:image/')) {
            const imageData = this.latexProcessor.processBase64Image(
              imageInfo.data,
            );
            if (imageData && imageData.size < 1024 * 1024) {
              // Max 1MB
              try {
                // Use custom dimensions if available, otherwise default
                const imageWidth = imageInfo.width || 120;
                const imageHeight = imageInfo.height || 80;

                // Scale to fit column while maintaining aspect ratio
                const maxWidth = columnWidth - 20;
                const maxHeight = 120;

                let finalWidth = imageWidth;
                let finalHeight = imageHeight;

                // Scale down if too large
                if (finalWidth > maxWidth) {
                  const ratio = maxWidth / finalWidth;
                  finalWidth = maxWidth;
                  finalHeight = finalHeight * ratio;
                }

                if (finalHeight > maxHeight) {
                  const ratio = maxHeight / finalHeight;
                  finalHeight = maxHeight;
                  finalWidth = finalWidth * ratio;
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                doc.image(imageData.buffer, xPos + 10, currentYPos, {
                  width: finalWidth,
                  height: finalHeight,
                  align: 'left',
                });
                currentYPos += finalHeight + 10; // Space for image
              } catch (error) {
                console.warn('Failed to add image to PDF:', error);
                // Fallback: show placeholder text
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                doc
                  .font('Times-Roman')
                  .fontSize(10)
                  .text('[Rasm mavjud emas]', xPos + 10, currentYPos, {
                    width: columnWidth - 20,
                  });
                currentYPos += 15;
              }
            }
          } else {
            // Show placeholder for images without data
            const dimensions =
              imageInfo.width && imageInfo.height
                ? `${imageInfo.width}×${imageInfo.height}px`
                : '';
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            doc
              .font('Times-Roman')
              .fontSize(10)
              .text(`[Rasm ${dimensions}]`, xPos + 10, currentYPos, {
                width: columnWidth - 20,
              });
            currentYPos += 15;
          }
        });
      }

      // Handle SVG LaTeX formulas in question
      if (processedQuestion.hasLatex && processedQuestion.svgFormulas) {
        processedQuestion.svgFormulas.forEach((svgFormula) => {
          if (svgFormula.svg) {
            try {
              // Render SVG formula to PDF
              // PDF rendering removed; skip server-side SVG to PDF embedding
              this.latexProcessor.renderSvgToPdf();
              currentYPos += 45; // Space for SVG formula
            } catch (error) {
              console.warn('Failed to render LaTeX SVG formula:', error);
              // Fallback: show formula text in italic 12pt font
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              doc
                .font('Times-Italic')
                .fontSize(12)
                .text(svgFormula.formula, xPos + 10, currentYPos, {
                  width: columnWidth - 20,
                });
              currentYPos += 20;
            }
          }
        });
      }

      // Draw answers
      if (question.answers && question.answers.length > 0) {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

        // Process all answers with LaTeX support
        const processedAnswers = await Promise.all(
          question.answers.map((answer, index) => {
            const letter = letters[index] || `${index + 1}`;

            // Process LaTeX in answer text
            const processedAnswer = this.latexProcessor.processContentEnhanced(
              answer.text,
            );

            // Apply content mappings if provided
            if (contentMappings?.imageMap) {
              this.latexProcessor.mapImageData(
                processedAnswer,
                contentMappings.imageMap,
              );
            }

            // Remove IMAGE placeholders and LATEX_SVG placeholders
            let answerDisplayText = processedAnswer.text;
            processedAnswer.base64Images.forEach((imageInfo) => {
              if (
                !imageInfo.data ||
                !imageInfo.data.startsWith('data:image/')
              ) {
                // Replace IMAGE placeholder with empty string
                answerDisplayText = answerDisplayText.replace(
                  imageInfo.placeholder,
                  '',
                );
              } else {
                // Remove IMAGE placeholder since we'll render the image separately
                answerDisplayText = answerDisplayText.replace(
                  imageInfo.placeholder,
                  '',
                );
              }
            });

            // Remove LATEX_SVG placeholders since we'll render them as SVG
            processedAnswer.svgFormulas?.forEach((svgFormula) => {
              answerDisplayText = answerDisplayText.replace(
                svgFormula.placeholder,
                '',
              );
            });

            return {
              letter,
              processedAnswer,
              displayText: answerDisplayText,
            };
          }),
        );

        // Render each processed answer
        processedAnswers.forEach((answerData) => {
          const { letter, processedAnswer, displayText } = answerData;
          const answerText = `${letter}) ${displayText}`;

          // Don't show correct answer inline when answer key is enabled
          // Individual answers will be shown in the answer key section instead

          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          doc
            .font('Times-Roman')
            .fontSize(12)
            .text(answerText, xPos + 10, currentYPos, {
              width: columnWidth - 20,
              lineGap: 2, // Better line spacing for answers
            });

          // Calculate answer text height for better spacing
          const answerTextHeight = this.estimateTextHeight(
            answerText,
            columnWidth - 20,
          );
          currentYPos += Math.max(20, answerTextHeight + 5); // Dynamic spacing or minimum 20px

          // Handle SVG LaTeX formulas in answer
          if (processedAnswer.hasLatex && processedAnswer.svgFormulas) {
            processedAnswer.svgFormulas.forEach((svgFormula) => {
              if (svgFormula.svg) {
                try {
                  // Render SVG formula to PDF
                  // PDF rendering removed; skip server-side SVG to PDF embedding
                  this.latexProcessor.renderSvgToPdf();
                  currentYPos += 35; // Space for SVG formula
                } catch (error) {
                  console.warn(
                    'Failed to render LaTeX SVG formula in answer:',
                    error,
                  );
                  // Fallback: show formula text in italic 12pt font
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                  doc
                    .font('Times-Italic')
                    .fontSize(12)
                    .text(svgFormula.formula, xPos + 20, currentYPos, {
                      width: columnWidth - 30,
                    });
                  currentYPos += 15;
                }
              }
            });
          }

          // Handle Base64 images in answers
          if (processedAnswer.hasImages && processedAnswer.base64Images) {
            processedAnswer.base64Images.forEach((imageInfo) => {
              if (imageInfo.data) {
                const imageData = this.latexProcessor.processBase64Image(
                  imageInfo.data,
                );
                if (imageData && imageData.size < 512 * 1024) {
                  // Max 512KB for answer images
                  try {
                    // Use custom dimensions if available, otherwise default smaller for answers
                    const imageWidth = imageInfo.width
                      ? imageInfo.width * 0.5
                      : 60; // Scale down for answers
                    const imageHeight = imageInfo.height
                      ? imageInfo.height * 0.5
                      : 40;

                    // Scale to fit answer area
                    const maxWidth = columnWidth - 30;
                    const maxHeight = 60;

                    let finalWidth = imageWidth;
                    let finalHeight = imageHeight;

                    if (finalWidth > maxWidth) {
                      const ratio = maxWidth / finalWidth;
                      finalWidth = maxWidth;
                      finalHeight = finalHeight * ratio;
                    }

                    if (finalHeight > maxHeight) {
                      const ratio = maxHeight / finalHeight;
                      finalHeight = maxHeight;
                      finalWidth = finalWidth * ratio;
                    }

                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    doc.image(imageData.buffer, xPos + 20, currentYPos, {
                      width: finalWidth,
                      height: finalHeight,
                      align: 'left',
                    });
                    currentYPos += finalHeight + 5; // Space for image
                  } catch (error) {
                    console.warn('Failed to add answer image to PDF:', error);
                    // Fallback: show placeholder text
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    doc
                      .font('Times-Roman')
                      .fontSize(9)
                      .text('   [Rasm]', xPos + 20, currentYPos, {
                        width: columnWidth - 30,
                      });
                    currentYPos += 12;
                  }
                }
              } else {
                // This should not happen since we removed placeholders from display text
                // But keeping as fallback
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                doc
                  .font('Times-Roman')
                  .fontSize(9)
                  .text(`   [Rasm]`, xPos + 20, currentYPos, {
                    width: columnWidth - 30,
                  });
                currentYPos += 12;
              }
            });
          }
        });
      } else if (question.type === QuestionType.TRUE_FALSE) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        doc
          .font('Times-Roman')
          .fontSize(12)
          .text("A) To'g'ri", xPos + 10, currentYPos, {
            width: columnWidth - 20,
          });
        currentYPos += 18;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        doc.text("B) Noto'g'ri", xPos + 10, currentYPos, {
          width: columnWidth - 20,
        });
        currentYPos += 18;
      } else if (question.type === QuestionType.ESSAY) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        doc
          .font('Times-Roman')
          .fontSize(12)
          .text(
            'Javob: _________________________________',
            xPos + 10,
            currentYPos,
            {
              width: columnWidth - 20,
            },
          );
        currentYPos += 25;
      }

      // Update column position tracking
      if (currentColumn === 'left') {
        leftY = currentYPos + 10; // Add some padding between questions
      } else {
        rightY = currentYPos + 10; // Add some padding between questions
      }

      questionCounter++;
    }

    // Footer on questions page
    const footerY = pageHeight - 30;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .font('Times-Roman')
      .fontSize(8)
      .text(
        `EduOne LMS • ${new Date().toLocaleDateString('uz-UZ')} • Variant: ${variant.uniqueNumber}`,
        margin,
        footerY,
        {
          width: pageWidth - margin * 2,
          align: 'center',
        },
      );

    // Add answer key on separate page if enabled
    if (config.includeAnswers) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      doc.addPage();
      this.addAnswerKeyPage(doc, variant, pageWidth, pageHeight, margin);
    }
  }

  /**
   * Draw vertical line between columns
   */
  private drawColumnSeparator(
    doc: any,
    columnSeparator: number,
    margin: number,
    pageHeight: number,
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .moveTo(columnSeparator, margin + 50)
      .lineTo(columnSeparator, pageHeight - 50)
      .stroke();
  }

  /**
   * Estimate text height for better spacing
   */
  private estimateTextHeight(text: string, width: number): number {
    // Rough estimation: each character is about 7px wide, each line is about 16px tall
    const avgCharWidth = 7;
    const lineHeight = 16;
    const charsPerLine = Math.floor(width / avgCharWidth);
    const lines = Math.ceil(text.length / charsPerLine);
    return lines * lineHeight;
  }

  /**
   * Add answer key on a separate dedicated page
   */
  private addAnswerKeyPage(
    doc: any,
    variant: TestVariant,
    pageWidth: number,
    pageHeight: number,
    margin: number,
  ): void {
    // Page title
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .font('Times-Bold')
      .fontSize(18)
      .text('JAVOBLAR KALITI', margin, margin + 80, {
        width: pageWidth - margin * 2,
        align: 'center',
      });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(1);

    // Variant info
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .font('Times-Roman')
      .fontSize(14)
      .text(`Variant ${variant.variantNumber}`, {
        align: 'center',
      });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.fontSize(12).text(`Unique ID: #${variant.uniqueNumber}`, {
      align: 'center',
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(3);

    // Generate answer key content
    const answersPerLine = 10; // Show 10 answers per line
    const totalQuestions = variant.questions.length;
    let currentY = doc.y;
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

    for (let i = 0; i < totalQuestions; i += answersPerLine) {
      let lineText = '';

      for (let j = 0; j < answersPerLine && i + j < totalQuestions; j++) {
        const questionIndex = i + j;
        const question = variant.questions[questionIndex];
        const questionNumber = questionIndex + 1;

        let correctAnswer = 'X'; // Default if no correct answer found

        if (question.answers && question.answers.length > 0) {
          const correctAnswerIndex = question.answers.findIndex(
            (answer) => answer.isCorrect,
          );
          if (correctAnswerIndex !== -1) {
            correctAnswer = letters[correctAnswerIndex] || 'X';
          }
        } else if (question.type === QuestionType.TRUE_FALSE) {
          // For True/False questions, check if there's a correct answer in the question data
          // This might be stored differently in your database structure
          if (question.answers && question.answers.length > 0) {
            const correctAnswerIndex = question.answers.findIndex(
              (answer) => answer.isCorrect,
            );
            correctAnswer = correctAnswerIndex === 0 ? 'A' : 'B';
          } else {
            // Try to determine from question text patterns (basic logic)
            const questionLower = question.text.toLowerCase();
            if (
              questionLower.includes("noto'g'ri") ||
              questionLower.includes("yolg'on")
            ) {
              correctAnswer = 'B'; // Likely false
            } else {
              correctAnswer = 'A'; // Default to true
            }
          }
        } else if (question.type === QuestionType.ESSAY) {
          correctAnswer = '-'; // No specific answer for essay questions
        }

        lineText += `${questionNumber}.${correctAnswer}    `;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      doc
        .font('Times-Roman')
        .fontSize(12)
        .text(lineText.trim(), margin + 20, currentY, {
          width: pageWidth - margin * 2 - 40,
          align: 'left',
        });

      currentY += 25; // More spacing between lines for better readability
    }

    // Instructions section
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(3);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.font('Times-Bold').fontSize(12);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.text("Baholash ko'rsatmalari:", margin, doc.y);

    const instructions = [
      "• Har bir to'g'ri javob uchun 1 ball beriladi",
      "• Noto'g'ri javob uchun 0 ball beriladi",
      '• Javob bermaslik ham 0 ball deb hisoblanadi',
      '• Maksimal ball: ' + totalQuestions + ' ball',
    ];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.font('Times-Roman').fontSize(11);
    instructions.forEach((instruction) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      doc.text(instruction, margin, doc.y + 15);
    });

    // Footer on answer key page
    const footerY = pageHeight - 30;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .font('Times-Roman')
      .fontSize(8)
      .text(
        `EduOne LMS • Javoblar kaliti • ${new Date().toLocaleDateString('uz-UZ')}`,
        margin,
        footerY,
        {
          width: pageWidth - margin * 2,
          align: 'center',
        },
      );
  }

  /**
   * Save generated test variants to database (optional)
   */
  saveGeneratedTest(generatedTest: any, teacherId: number): Promise<any> {
    // For now, we'll just return the generated test without saving
    // In the future, you can implement saving to a separate table
    return Promise.resolve({
      ...generatedTest,
      savedAt: new Date(),
      teacherId,
    });
  }
}

// Small utility copied to keep this service self-contained
function escapeHtml(str: string) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Basic HTML sanitizer: removes scripts/styles, event handlers, and javascript: URLs; keeps common tags like div/span/b/i/br/ul/ol/li etc.
function sanitizeHtmlBasic(html: string): string {
  if (!html) return '';
  let out = String(html);
  // remove script/style blocks
  out = out.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  // remove event handler attributes like onclick="..."
  out = out.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // neutralize javascript: in href/src
  out = out.replace(
    /\s(href|src)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    (_m, attr, val) => {
      const v = String(val).replace(/^['"]|['"]$/g, '');
      if (/^\s*javascript:/i.test(v)) return '';
      return ` ${attr}="${v}"`;
    },
  );
  return out;
}

// Server-side KaTeX renderer that preserves sanitized HTML for non-math segments
function renderWithKatexAllowHtml(text: string): string {
  if (!text) return '';
  const parts: string[] = [];
  const regex =
    /\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$|\\\[((?:.|\n)*?)\\\]|\\\(((?:.|\n)*?)\\\)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const index = m.index;
    const before = text.slice(lastIndex, index);
    if (before) parts.push(sanitizeHtmlBasic(before));
    const formula = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').trim();
    const display = Boolean(m[1] || m[3]);
    try {
      const html: string = katex.renderToString(formula, {
        displayMode: display,
        throwOnError: false,
        strict: 'ignore',
        trust: false,
      });
      parts.push(html);
    } catch {
      parts.push(`<span class="katex-error">${escapeHtml(formula)}</span>`);
    }
    lastIndex = index + m[0].length;
  }
  const rest = text.slice(lastIndex);
  if (rest) parts.push(sanitizeHtmlBasic(rest));
  return parts.join('');
}
