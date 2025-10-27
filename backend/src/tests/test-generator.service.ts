/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
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
import { TelegramService } from 'src/telegram/telegram.service';
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
    private moduleRef: ModuleRef,
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
    // Ensure question numbers start from 1 for each variant
    // Remove extra page breaks at the top
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
        body { font-family: Times, 'Times New Roman', serif; margin: 0; color: #111; font-size: 12px; }
        .toolbar { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #eee; padding: 8px 12px; display:flex; gap:8px; align-items:center; z-index: 10; }
        .toolbar button { padding: 6px 10px; font-size: 14px; }
        .section { padding: 8px 12px; }
        .section-title { font-size: 18px; font-weight: 700; margin: 8px 0 12px; }
        .page-break { page-break-after: always; }
        .no-page-break { page-break-after: avoid !important; }
        .variants-container {
          column-count: 1;
          column-gap: 36px;
          padding: 8px 12px;
        }
        .variant-item {
          display: block;
          break-inside: avoid;
          -webkit-column-break-inside: avoid;
          -moz-column-break-inside: avoid;
          margin-bottom: 18px;
        }
        .questions-container {
          column-count: 2;
          column-gap: 36px;
          position: relative;
          padding: 8px 12px;
          font-size: 12px;
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
        @media print {
          .toolbar { display: none; }
          .question { page-break-inside: avoid; font-size: 12px; }
          html, body { margin: 0 !important; padding: 0 !important; font-size: 12px !important; overflow: visible !important; }
          .section#variants { page-break-before: auto !important; }
          .section-title { page-break-after: avoid !important; margin-bottom: 4px !important; padding-bottom: 4px !important; }
          .variants-container { page-break-before: avoid !important; margin-top: 0 !important; padding-top: 0 !important; }
          .variant-item { page-break-before: avoid !important; page-break-after: auto !important; }
          .variant-item:first-child { page-break-before: avoid !important; margin-top: 0 !important; }
          .variant-item:last-child { page-break-after: avoid; }
          .no-page-break { page-break-after: avoid !important; page-break-before: avoid !important; }
          .section { page-break-inside: avoid; }
        }
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
        <button onclick="(function(){ document.body.classList.remove('print-sheets'); document.body.classList.add('print-variants'); setTimeout(function(){ window.print(); setTimeout(function(){ document.body.classList.remove('print-variants'); }, 100); }, 0); })()">Faqat variantlar</button>
        <span style="color:#666; font-size:13px;">Chop etish oynasida "Save as PDF"ni tanlang.</span>
      </div>
      <div class="section no-page-break" id="variants">
        <div class="section-title no-page-break">Barcha variantlar</div>
        <div class="variants-container no-page-break">${variantsSection}</div>
      </div>
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
            } catch (e) { console.warn('KaTeX render error', e); }
          }
          // No extra page breaks at top
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
      const telegramService = this.moduleRef.get(TelegramService, {
        strict: false,
      });
      await telegramService.sendTestResultToChannel({
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
