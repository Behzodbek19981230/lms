/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-require-imports */
import { Injectable } from '@nestjs/common';

const katex = require('katex');

@Injectable()
export class LatexProcessorService {
  /**
   * Process text containing LaTeX formulas and Base64 images
   */
  processContent(text: string): ProcessedContent {
    if (!text) return { text: '', hasLatex: false, hasImages: false };

    const result: ProcessedContent = {
      text,
      hasLatex: false,
      hasImages: false,
    };

    // Extract LaTeX formulas (both inline $...$ and display $$...$$)
    const latexMatches = text.match(/\$\$[\s\S]*?\$\$|\$[^$\n]*?\$/g);
    if (latexMatches) {
      result.hasLatex = true;
      result.latexFormulas = [];
      latexMatches.forEach((match, index) => {
        const isDisplay = match.startsWith('$$');
        const formula = match.replace(/^\$+|\$+$/g, '');

        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          const rendered = katex.renderToString(formula, {
            displayMode: isDisplay,
            throwOnError: false,
            output: 'html',
          });

          const placeholder = `[LATEX_${index}]`;
          result.text = result.text.replace(match, placeholder);
          result.latexFormulas!.push({
            placeholder,
            original: match,
            formula,
            rendered,
            isDisplay,
          });
        } catch (error) {
          // If LaTeX rendering fails, keep original text
          console.warn(`LaTeX rendering failed for: ${formula}`, error);
        }
      });
    }

    // Extract Base64 images
    const base64Matches = text.match(
      /data:image\/[^;]+;base64,[A-Za-z0-9+/]+=*/g,
    );
    if (base64Matches) {
      result.hasImages = true;
      result.base64Images = [];
      base64Matches.forEach((match, index) => {
        const placeholder = `[IMAGE_${index}]`;
        result.text = result.text.replace(match, placeholder);
        result.base64Images!.push({
          placeholder,
          original: match,
          data: match,
        });
      });
    }

    return result;
  }

  /**
   * Convert LaTeX to plain text for PDF generation
   */
  convertLatexToText(latex: string): string {
    try {
      // Basic LaTeX to text conversion for PDF
      return latex
        .replace(/\$\$([^$]+)\$\$/g, '$1') // Display math
        .replace(/\$([^$]+)\$/g, '$1') // Inline math
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)') // Fractions
        .replace(/\\sqrt\{([^}]+)\}/g, '√($1)') // Square root
        .replace(/\^(\w+)/g, '^$1') // Superscript
        .replace(/_(\w+)/g, '_$1') // Subscript
        .replace(/\\alpha/g, 'α')
        .replace(/\\beta/g, 'β')
        .replace(/\\gamma/g, 'γ')
        .replace(/\\delta/g, 'δ')
        .replace(/\\pi/g, 'π')
        .replace(/\\theta/g, 'θ')
        .replace(/\\lambda/g, 'λ')
        .replace(/\\mu/g, 'μ')
        .replace(/\\sigma/g, 'σ')
        .replace(/\\omega/g, 'ω')
        .replace(/\\sum/g, '∑')
        .replace(/\\int/g, '∫')
        .replace(/\\infty/g, '∞')
        .replace(/\\pm/g, '±')
        .replace(/\\times/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\leq/g, '≤')
        .replace(/\\geq/g, '≥')
        .replace(/\\neq/g, '≠')
        .replace(/\\approx/g, '≈')
        .replace(/\\{|\\}/g, '') // Remove escaped braces
        .replace(/\\\\/g, ' '); // Line breaks
    } catch (error) {
      console.warn('LaTeX conversion failed:', error);
      return latex;
    }
  }

  /**
   * Extract image data from Base64 string
   */
  processBase64Image(base64String: string): ImageData | null {
    try {
      const matches = base64String.match(/data:image\/([^;]+);base64,(.+)/);
      if (!matches) return null;

      const [, mimeType, data] = matches;
      const buffer = Buffer.from(data, 'base64');

      return {
        mimeType: `image/${mimeType}`,
        buffer,
        size: buffer.length,
        extension: mimeType,
      };
    } catch (error) {
      console.warn('Base64 image processing failed:', error);
      return null;
    }
  }

  /**
   * Check if text contains LaTeX formulas
   */
  hasLatex(text: string): boolean {
    return /\$\$[\s\S]*?\$\$|\$[^$\n]*?\$/.test(text);
  }

  /**
   * Check if text contains Base64 images
   */
  hasBase64Images(text: string): boolean {
    return /data:image\/[^;]+;base64,[A-Za-z0-9+/]+=*/.test(text);
  }
}

export interface ProcessedContent {
  text: string;
  hasLatex: boolean;
  hasImages: boolean;
  latexFormulas?: LatexFormula[];
  base64Images?: Base64Image[];
}

export interface LatexFormula {
  placeholder: string;
  original: string;
  formula: string;
  rendered: string;
  isDisplay: boolean;
}

export interface Base64Image {
  placeholder: string;
  original: string;
  data: string;
}

export interface ImageData {
  mimeType: string;
  buffer: Buffer;
  size: number;
  extension: string;
}
