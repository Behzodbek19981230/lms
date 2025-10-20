import { Injectable, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

// This is a minimal, placeholder scanner service to outline the flow.
// Later we can implement robust detection (deskewing, contour detection, bubble segmentation, thresholding).
// For now, expose a method signature and basic pre-processing so the API is ready.

export interface ScanResult {
  uniqueNumber: string | null; // If detected from the 10-digit blocks (future)
  answers: string[]; // Letters A..D or '-' when not filled
  debug?: { steps: string[] };
}

@Injectable()
export class AnswerSheetScannerService {
  private letters = ['A', 'B', 'C', 'D'];

  // Accepts an image buffer (JPEG/PNG) of the filled answer-sheet
  // Returns detected answers per question (A..D or '-')
  async scanFilledSheet(image: Buffer): Promise<ScanResult> {
    if (!image || image.length < 100) {
      throw new BadRequestException('Rasm topilmadi yoki juda kichik');
    }

    // Basic preprocess example: grayscale + contrast bump
    await sharp(image).grayscale().normalise().toBuffer();

    // Try detect ID via grid/OCR
    let uniqueNumber: string | null = null;
    try {
      const grid = await this.detectUniqueFromBottomRightGrid(image);
      if (grid.uniqueNumber) uniqueNumber = grid.uniqueNumber;
    } catch {
      /* ignore */
    }
    if (!uniqueNumber) {
      try {
        const ocr = await this.ocrUniqueNumber(image);
        uniqueNumber = ocr.uniqueNumber;
      } catch {
        /* ignore */
      }
    }

    return {
      uniqueNumber: uniqueNumber || null,
      answers: [],
      debug: {
        steps: ['grayscale', 'normalize', uniqueNumber ? 'id:ok' : 'id:none'],
      },
    };
  }

  // OCR-only pass to extract 10-digit unique number from the image
  async ocrUniqueNumber(
    image: Buffer,
  ): Promise<{ uniqueNumber: string | null; rawText: string }> {
    if (!image || image.length < 100) {
      throw new BadRequestException('Rasm topilmadi yoki juda kichik');
    }
    // Optional crop attempt (footer band heuristic) can be added later
    const { data } = await Tesseract.recognize(image, 'eng');
    const text = (data?.text || '').replace(/\s+/g, ' ').trim();
    const matchHash = text.match(/#\s*(\d{10})/);
    const matchDigits = matchHash || text.match(/\b(\d{10})\b/);
    const number = matchDigits ? matchDigits[1] : null;
    return { uniqueNumber: number, rawText: text };
  }

  // Heuristic grid-based detection: crop bottom-right area where 10 boxes lie and OCR each cell
  async detectUniqueFromBottomRightGrid(image: Buffer): Promise<{
    uniqueNumber: string | null;
    digits: string[];
    debug: Record<string, unknown>;
  }> {
    const meta = await sharp(image).metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    if (width < 200 || height < 200) {
      throw new BadRequestException("Rasm o'lchami juda kichik");
    }

    // Crop bottom ~22% and right ~45% area (heuristic for footer block "Test raqami")
    const cropX = Math.floor(width * 0.55);
    const cropY = Math.floor(height * 0.78);
    const cropW = Math.max(50, width - cropX);
    const cropH = Math.max(50, height - cropY);

    const region = await sharp(image)
      .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
      .grayscale()
      .normalise()
      .threshold(170)
      .toBuffer();

    // Resize for better OCR consistency
    const scaled = await sharp(region)
      .resize({ width: cropW * 2 })
      .toBuffer();

    // Split into 10 equal vertical slices and OCR each digit
    const perBoxWidth = Math.floor((cropW * 2) / 10);
    const digits: string[] = [];

    for (let i = 0; i < 10; i++) {
      const left = i * perBoxWidth;
      const slice = await sharp(scaled)
        .extract({
          left,
          top: 0,
          width: perBoxWidth,
          height: Math.floor(cropH * 2),
        })
        .toBuffer();
      const { data } = await Tesseract.recognize(slice, 'eng');
      const text = (data?.text || '').replace(/\s+/g, '');
      const digitMatch = text.match(/\d/);
      digits.push(digitMatch ? digitMatch[0] : '');
    }

    const uniqueNumber = digits.join('').replace(/[^0-9]/g, '');
    return {
      uniqueNumber: uniqueNumber.length === 10 ? uniqueNumber : null,
      digits,
      debug: { width, height, cropX, cropY, cropW, cropH },
    };
  }

  // Combined: try grid detection first, fallback to full-image OCR
  async scanAndDetectUnique(image: Buffer): Promise<{
    uniqueNumber: string | null;
    method: 'grid' | 'ocr';
    digits?: string[];
    rawText?: string;
  }> {
    try {
      const grid = await this.detectUniqueFromBottomRightGrid(image);
      if (grid.uniqueNumber)
        return {
          uniqueNumber: grid.uniqueNumber,
          method: 'grid',
          digits: grid.digits,
        };
    } catch {
      // ignore and fallback to OCR
    }
    const ocr = await this.ocrUniqueNumber(image);
    return {
      uniqueNumber: ocr.uniqueNumber,
      method: 'ocr',
      rawText: ocr.rawText,
    };
  }

  // Naive bubble-detection over a heuristic answers area.
  // Assumptions: photo is roughly straight; answers are arranged in N rows and 4 columns (A..D)
  async detectAnswersFromImage(
    image: Buffer,
    totalQuestions: number,
  ): Promise<{ answers: string[]; debug?: Record<string, unknown> }> {
    if (totalQuestions <= 0) return { answers: [] };

    // Preprocess: grayscale -> normalize -> resize to fixed width -> threshold -> raw buffer
    const base = sharp(image)
      .grayscale()
      .normalise()
      .resize({ width: 1200, withoutEnlargement: false })
      .threshold(160);
    const { data, info } = await base
      .raw()
      .toBuffer({ resolveWithObject: true });
    const W = info.width;
    const H = info.height;

    // Horizontal boundaries are relatively stable for our templates
    const baseLeft = Math.floor(W * 0.07);
    const baseRight = Math.floor(W * 0.93);

    const channel = 1; // raw thresholded grayscale (1 channel)
    const scoreCell = (x1: number, y1: number, x2: number, y2: number) => {
      let black = 0;
      let total = 0;
      const _x1 = Math.max(0, Math.min(W - 1, x1));
      const _y1 = Math.max(0, Math.min(H - 1, y1));
      const _x2 = Math.max(0, Math.min(W - 1, x2));
      const _y2 = Math.max(0, Math.min(H - 1, y2));
      for (let y = _y1; y < _y2; y++) {
        const rowIdx = y * W * channel;
        for (let x = _x1; x < _x2; x++) {
          const v = data[rowIdx + x];
          if (v < 128) black++;
          total++;
        }
      }
      return total > 0 ? black / total : 0;
    };

    const tryGrid = (
      GRID_COLS: number,
      left: number,
      right: number,
      top: number,
      bottom: number,
    ) => {
      const regionW = Math.max(1, right - left);
      const regionH = Math.max(1, bottom - top);
      const rows = Math.max(1, Math.ceil(totalQuestions / GRID_COLS));
      const cellW = Math.floor(regionW / GRID_COLS);
      const cellH = Math.floor(regionH / rows);
      const answers: string[] = [];
      const scoresDebug: Array<{
        q: number;
        row: number;
        col: number;
        scores: number[];
        off?: number;
        band?: number;
        yoff?: number;
        yband?: number;
      }> = [];
      let quality = 0;
      const allScoresPerQ: number[][] = [];
      let globalMax = 0;

      for (let i = 0; i < totalQuestions; i++) {
        const r = Math.floor(i / GRID_COLS);
        const c = i % GRID_COLS;

        const cx1 = left + c * cellW;
        const cx2 = Math.min(right, cx1 + cellW);
        const cy1 = top + r * cellH;
        const cy2 = Math.min(bottom, cy1 + cellH);

        const padX = Math.floor((cx2 - cx1) * 0.06);
        const padY = Math.floor((cy2 - cy1) * 0.1);
        const ix1 = cx1 + padX;
        const ix2 = cx2 - padX;
        const iy1 = cy1 + padY;
        const iy2 = cy2 - padY;
        const innerW = Math.max(1, ix2 - ix1);
        const innerH = Math.max(1, iy2 - iy1);
        // Horizontal search per question to align 4 segments to bubble cluster
        const numBoxW = Math.floor(innerW * 0.2);
        const baseStart = ix1 + numBoxW + Math.floor(innerW * 0.02);

        const offsetFactors = [-0.12, -0.08, -0.04, 0, 0.04, 0.08, 0.12];
        const bandFactors = [0.72, 0.8, 0.88];
        const yOffsetFactors = [-0.1, 0, 0.1];
        const yBandFactors = [0.5, 0.6, 0.7];

        let chosenScores: number[] = [0, 0, 0, 0];
        let chosenQuality = -Infinity;
        let chosenOffset = 0;
        let chosenBand = 0.76;
        let chosenYOff = 0;
        let chosenYBand = 0.6;

        for (const off of offsetFactors) {
          for (const bf of bandFactors) {
            const optX1c = baseStart + Math.floor(innerW * off);
            const optX2c = Math.min(ix2, optX1c + Math.floor(innerW * bf));
            const optWc = Math.max(1, optX2c - optX1c);
            for (const yoff of yOffsetFactors) {
              for (const yb of yBandFactors) {
                const yCenter = Math.floor((iy1 + iy2) / 2);
                const bandHalf = Math.floor((innerH * yb) / 2);
                const yShift = Math.floor(innerH * yoff);
                const y1c = Math.max(iy1, yCenter - bandHalf + yShift);
                const y2c = Math.min(iy2, yCenter + bandHalf + yShift);
                const rowScoresC: number[] = [];
                for (let k = 0; k < 4; k++) {
                  const ox1 = optX1c + Math.floor((k * optWc) / 4);
                  const ox2 = optX1c + Math.floor(((k + 1) * optWc) / 4);
                  const ow = Math.max(1, ox2 - ox1);
                  const centerPadX = Math.floor(ow * 0.12);
                  const sx1 = ox1 + centerPadX;
                  const sx2 = ox2 - centerPadX;
                  rowScoresC.push(scoreCell(sx1, y1c, sx2, y2c));
                }
                const sortedC = [...rowScoresC].sort((a, b) => b - a);
                const bestC = sortedC[0] ?? 0;
                const secondC = sortedC[1] ?? 0;
                const qualityC = Math.max(0, bestC - secondC) + 0.5 * bestC;
                if (qualityC > chosenQuality) {
                  chosenQuality = qualityC;
                  chosenScores = rowScoresC;
                  chosenOffset = off;
                  chosenBand = bf;
                  chosenYOff = yoff;
                  chosenYBand = yb;
                }
              }
            }
          }
        }

        const rowScores: number[] = chosenScores;

        // Update global maximum fill
        for (const v of rowScores) if (v > globalMax) globalMax = v;

        // Provisional quality uses raw best and margin
        let bestIdx = 0;
        for (let k = 1; k < 4; k++) {
          if (rowScores[k] > rowScores[bestIdx]) bestIdx = k;
        }
        const best = rowScores[bestIdx] ?? 0;
        const sorted = [...rowScores].sort((a, b) => b - a);
        const second = sorted[1] ?? 0;
        const margin = best - second;
        quality += Math.max(0, margin) + best * 0.5;

        // Store for second-pass thresholding
        allScoresPerQ[i] = rowScores;
        scoresDebug.push({
          q: i + 1,
          row: r,
          col: c,
          scores: rowScores,
          off: chosenOffset,
          band: chosenBand,
          yoff: chosenYOff,
          yband: chosenYBand,
        });
      }

      // Second pass: dynamic thresholds based on globalMax and per-question best
      const baseThresh = Math.max(0.04, 0.25 * globalMax);
      for (let i = 0; i < totalQuestions; i++) {
        const rowScores = allScoresPerQ[i] || [0, 0, 0, 0];
        let bestIdx = 0;
        for (let k = 1; k < 4; k++) {
          if (rowScores[k] > rowScores[bestIdx]) bestIdx = k;
        }
        const best = rowScores[bestIdx] ?? 0;
        const sorted = [...rowScores].sort((a, b) => b - a);
        const second = sorted[1] ?? 0;
        const margin = best - second;
        const marginThresh = Math.max(0.02, 0.12 * best);
        // Relax multi-mark gate; ring edges often raise multiple bands slightly
        const isMarked = best > baseThresh && margin > marginThresh;
        answers[i] = isMarked ? this.letters[bestIdx] : '-';
      }

      return {
        GRID_COLS,
        rows,
        cellW,
        cellH,
        left,
        right,
        top,
        bottom,
        answers,
        scoresDebug,
        quality,
      };
    };

    // Search for the best vertical band (top/height) and grid columns (4 or 6)
    const topFactors = [0.14, 0.18, 0.22, 0.26];
    const heightFactors = [0.28, 0.34, 0.4, 0.46];
    const colCandidates = [4, 6];
    const trials: Array<ReturnType<typeof tryGrid>> = [] as Array<
      ReturnType<typeof tryGrid>
    >;
    for (const tf of topFactors) {
      const top = Math.floor(H * tf);
      for (const hf of heightFactors) {
        const bottom = Math.min(H - 1, top + Math.floor(H * hf));
        for (const cols of colCandidates) {
          trials.push(tryGrid(cols, baseLeft, baseRight, top, bottom));
        }
      }
    }
    trials.sort((a, b) => b.quality - a.quality);
    const best = trials[0];

    return {
      answers: best.answers,
      debug: {
        W,
        H,
        left: best.left,
        right: best.right,
        top: best.top,
        bottom: best.bottom,
        cellW: best.cellW,
        cellH: best.cellH,
        rows: best.rows,
        GRID_COLS: best.GRID_COLS,
        scores: best.scoresDebug,
        qualities: trials.slice(0, 12).map((t) => ({
          cols: t.GRID_COLS,
          top: t.top,
          bottom: t.bottom,
          quality: t.quality,
        })),
      },
    };
  }

  // Try to auto-detect the number of questions by testing multiple candidate row counts
  async detectTotalQuestions(image: Buffer): Promise<{
    total: number;
    scores: Array<{ count: number; score: number }>;
    debug?: Record<string, unknown>;
  }> {
    // Preprocess same as answers
    const base = sharp(image)
      .grayscale()
      .normalise()
      .resize({ width: 1200, withoutEnlargement: false })
      .threshold(160);
    const { data, info } = await base
      .raw()
      .toBuffer({ resolveWithObject: true });
    const W = info.width;
    const H = info.height;

    const left = Math.floor(W * 0.08);
    const right = Math.floor(W * 0.92);
    const top = Math.floor(H * 0.2);
    const bottom = Math.floor(H * 0.78);
    const regionW = right - left;
    const regionH = bottom - top;
    const channel = 1;

    const scoreCell = (x1: number, y1: number, x2: number, y2: number) => {
      let black = 0;
      let total = 0;
      const _x1 = Math.max(0, Math.min(W - 1, x1));
      const _y1 = Math.max(0, Math.min(H - 1, y1));
      const _x2 = Math.max(0, Math.min(W - 1, x2));
      const _y2 = Math.max(0, Math.min(H - 1, y2));
      for (let y = _y1; y < _y2; y++) {
        const rowIdx = y * W * channel;
        for (let x = _x1; x < _x2; x++) {
          const v = data[rowIdx + x];
          if (v < 128) black++;
          total++;
        }
      }
      return total > 0 ? black / total : 0;
    };

    const candidates = [10, 15, 20, 25, 30, 35, 40, 45, 50];
    const scores: Array<{ count: number; score: number }> = [];
    let best = { count: 0, score: -Infinity };

    for (const count of candidates) {
      const rowHeight = Math.floor(regionH / Math.max(1, count));
      let sumBest = 0;
      let sumMargin = 0;
      let penalties = 0;
      for (let i = 0; i < count; i++) {
        const y1 = top + i * rowHeight + Math.floor(rowHeight * 0.15);
        const y2 = Math.min(bottom, y1 + Math.floor(rowHeight * 0.7));
        const colWidth = Math.floor(regionW / 4);
        const rowScores: number[] = [];
        for (let k = 0; k < 4; k++) {
          const x1 = left + k * colWidth + Math.floor(colWidth * 0.15);
          const x2 = Math.min(right, x1 + Math.floor(colWidth * 0.7));
          rowScores.push(scoreCell(x1, y1, x2, y2));
        }
        const sorted = [...rowScores].sort((a, b) => b - a);
        const b1 = sorted[0] ?? 0;
        const b2 = sorted[1] ?? 0;
        sumBest += b1;
        sumMargin += Math.max(0, b1 - b2);
        if (b1 < 0.08) penalties += 0.05; // penalize very faint rows
      }
      const score = sumMargin + 0.5 * sumBest - penalties;
      scores.push({ count, score });
      if (score > best.score) best = { count, score };
    }

    const total = best.count > 0 ? best.count : 0;
    return { total, scores, debug: { W, H, left, right, top, bottom } };
  }

  // Convenience: detect totalQuestions first, then detect answers
  async detectAnswersAuto(
    image: Buffer,
  ): Promise<{ totalQuestions: number; answers: string[]; debug?: any }> {
    const totalInfo = await this.detectTotalQuestions(image);
    const totalQuestions = totalInfo.total;
    if (totalQuestions && totalQuestions > 0) {
      const ans = await this.detectAnswersFromImage(image, totalQuestions);
      return {
        totalQuestions,
        answers: ans.answers,
        debug: { totalInfo, ans },
      };
    }
    return { totalQuestions: 0, answers: [], debug: { totalInfo } };
  }
}
