import { Injectable } from '@nestjs/common';

const mjNode = require('mathjax-node');
const SVGtoPDFKit = require('svg-to-pdfkit');

// MathJax sozlash
mjNode.config({
  MathJax: {
    SVG: {
      font: 'STIX-Web',
      linebreaks: { automatic: true },
    },
  },
});
mjNode.start();

@Injectable()
export class LatexProcessorService {
  /**
   * Convert base64 image data to a buffer and return with size info
   */
  processBase64Image(data: string): { buffer: Buffer; size: number } | null {
    if (!data || typeof data !== 'string') return null;
    const matches = data.match(/^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/);
    if (!matches) return null;
    try {
      const buffer = Buffer.from(matches[2], 'base64');
      return { buffer, size: buffer.length };
    } catch {
      return null;
    }
  }
  /**
   * Check if the given text contains base64 image data
   */
  hasBase64Images(text: string): boolean {
    if (!text) return false;
    // Simple regex to detect base64 image data
    return /data:image\/[a-zA-Z]+;base64,/.test(text);
  }
  /**
   * LaTeX formulani SVG ga render qilish (MathJax)
   */
  async renderLatexToSvg(
    formula: string,
    isDisplay = false,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      mjNode.typeset(
        {
          math: formula,
          format: isDisplay ? 'TeX' : 'inline-TeX',
          svg: true,
        },
        (data: any) => {
          if (data.errors || !data.svg) {
            console.warn('MathJax rendering error:', data.errors);
            resolve(null);
          } else {
            // XML / DOCTYPE olib tashlash
            const cleanSvg = data.svg
              .replace(/^<\?xml[^>]*\?>/, '')
              .replace(/<!DOCTYPE[^>]*>/, '')
              .trim();
            resolve(cleanSvg);
          }
        },
      );
    });
  }

  /**
   * Matndan LaTeX formulalarni ajratib SVG ga aylantirish
   */
  async processLatexFormulas(text: string): Promise<ProcessedLatexContent> {
    const result: ProcessedLatexContent = {
      text,
      hasLatex: false,
      svgFormulas: [],
    };

    // $...$ yoki $$...$$ formulalarni topish
    const latexMatches = text.match(/\$\$[\s\S]*?\$\$|\$[^$\n]*?\$/g);
    if (latexMatches) {
      result.hasLatex = true;

      for (let i = 0; i < latexMatches.length; i++) {
        const match = latexMatches[i];
        const isDisplay = match.startsWith('$$');
        const formula = match.replace(/^\$+|\$+$/g, '');

        const svg = await this.renderLatexToSvg(formula, isDisplay);
        const placeholder = ``;

        result.text = result.text.replace(match, placeholder);
        result.svgFormulas.push({
          placeholder,
          formula,
          svg,
          isDisplay,
        });
      }
    }

    return result;
  }

  /**
   * Kontentni (matn + LaTeX + rasmlar) kompleks ishlov berish
   */
  async processContentEnhanced(text: string): Promise<EnhancedContent> {
    if (!text) {
      return {
        text: '',
        hasLatex: false,
        hasImages: false,
        svgFormulas: [],
        base64Images: [],
      };
    }

    // Avval LaTeX ni qayta ishlash
    const latexResult = await this.processLatexFormulas(text);

    // Rasmlar uchun placeholderlarni tekshirish
    const imageMatches = latexResult.text.match(/\[IMAGE_\d+\]/g) || [];

    // Direct base64 images in markdown format: ![alt](data:image/...)
    const base64ImageRegex =
      /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
    const base64Images: Base64Image[] = [];
    let processedText = latexResult.text;
    let match;
    let imageIndex = 0;

    while ((match = base64ImageRegex.exec(latexResult.text)) !== null) {
      const [fullMatch, alt, dataUrl] = match;
      const placeholder = ``;

      // Extract dimensions from alt text if present (format: alt|width: 100px; height: 100px)
      let width: number | undefined;
      let height: number | undefined;

      if (alt.includes('|')) {
        const [altText, dimensions] = alt.split('|');
        const widthMatch = dimensions.match(/width:\s*(\d+)px/);
        const heightMatch = dimensions.match(/height:\s*(\d+)px/);

        if (widthMatch) width = parseInt(widthMatch[1]);
        if (heightMatch) height = parseInt(heightMatch[1]);
      }

      base64Images.push({
        placeholder,
        original: fullMatch,
        data: dataUrl,
        width,
        height,
      });

      processedText = processedText.replace(fullMatch, placeholder);
      imageIndex++;
    }

    return {
      text: processedText,
      hasLatex: latexResult.hasLatex,
      hasImages: imageMatches.length > 0 || base64Images.length > 0,
      svgFormulas: latexResult.svgFormulas,
      base64Images: [
        ...imageMatches.map((ph) => ({
          placeholder: ph,
          original: ph,
          data: '',
        })),
        ...base64Images,
      ],
    };
  }

  /**
   * SVG ni PDFga joylash
   */
  renderSvgToPdf(
    doc: any,
    svg: string,
    x: number,
    y: number,
    options?: any,
  ): void {
    try {
      SVGtoPDFKit(doc, svg, x, y, options);
    } catch (error) {
      console.warn('Failed to render SVG to PDF:', error);
      doc.font('Times-Roman').fontSize(12).text('[LaTeX]', x, y);
    }
  }

  /**
   * Matndagi rasm placeholderlarini imageMap bilan almashtirish
   */
  mapImageData(content: any, imageMap: Record<string, string>) {
    if (!content || !content.text) return content;
    let newText = content.text;
    if (content.base64Images && Array.isArray(content.base64Images)) {
      content.base64Images = content.base64Images.map((img: any) => {
        const data = imageMap?.[img.placeholder] || '';
        newText = newText.replace(img.placeholder, '');
        return { ...img, data };
      });
    }
    return { ...content, text: newText };
  }

  /**
   * LaTeX placeholderlarini oddiy matnga aylantirish
   */
  convertLatexToText(text: string): string {
    if (!text) return '';
    // [LATEX_SVG_x] ni '[LaTeX]' ga almashtiradi
    return text.replace(/\[LATEX_SVG_\d+\]/g, '[LaTeX]');
  }

  /**
   * Oddiy kontentni qayta ishlash (LaTeX va rasm placeholderlari)
   */
  processContent(text: string): any {
    // Direct base64 images in markdown format: ![alt](data:image/...)
    const base64ImageRegex =
      /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
    const base64Images: Base64Image[] = [];
    let processedText = text;
    let match;
    let imageIndex = 0;

    while ((match = base64ImageRegex.exec(text)) !== null) {
      const [fullMatch, alt, dataUrl] = match;
      const placeholder = ``;

      // Extract dimensions from alt text if present (format: alt|width: 100px; height: 100px)
      let width: number | undefined;
      let height: number | undefined;

      if (alt && alt.includes('|')) {
        const dimensions = alt.split('|')[1];
        const widthMatch = dimensions?.match(/width:\s*(\d+)px/);
        const heightMatch = dimensions?.match(/height:\s*(\d+)px/);

        if (widthMatch) width = parseInt(widthMatch[1]);
        if (heightMatch) height = parseInt(heightMatch[1]);
      }

      base64Images.push({
        placeholder,
        original: fullMatch,
        data: dataUrl,
        width,
        height,
      });

      processedText = processedText.replace(fullMatch, placeholder);
      imageIndex++;
    }

    // Faqat LaTeX va rasm placeholderlarini aniqlash uchun soddalashtirilgan
    return {
      text: processedText,
      hasLatex: /\$.*?\$/.test(processedText),
      hasImages: /\[IMAGE_\d+\]/.test(processedText) || base64Images.length > 0,
      base64Images,
    };
  }
}

// ---- INTERFACES ----

export interface EnhancedContent {
  text: string;
  hasLatex: boolean;
  hasImages: boolean;
  svgFormulas: SvgFormula[];
  base64Images: Base64Image[];
}

export interface ProcessedLatexContent {
  text: string;
  hasLatex: boolean;
  svgFormulas: SvgFormula[];
}

export interface SvgFormula {
  placeholder: string;
  formula: string;
  svg: string | null;
  isDisplay?: boolean;
}

export interface Base64Image {
  placeholder: string;
  original: string;
  data: string;
  width?: number;
  height?: number;
}
