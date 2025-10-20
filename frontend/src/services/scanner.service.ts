import { request } from '@/configs/request';

export type DetectUniqueResponse = {
  uniqueNumber?: string;
  method?: 'grid' | 'ocr' | 'unknown';
  needsAnswers?: boolean;
  statusCode?: number;
  message?: string;
  totalQuestions?: number;
};

export type GradeResult = {
  total: number;
  correct: number;
  wrong: number;
  blank: number;
  details: Array<{
    index: number;
    correct: string;
    scanned: string;
    isCorrect: boolean;
  }>;
};

export async function detectUniqueFromImage(file: File): Promise<DetectUniqueResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await request.post('/tests/scanner/answer-sheet/detect-unique', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function gradeFromImage(
  file: File,
  answers?: string[],
): Promise<
  {
    uniqueNumber: string;
    method?: string;
    result?: GradeResult;
    needsAnswers?: boolean;
    autoDetectedAnswers?: string[];
    answers?: string[];
  } & DetectUniqueResponse
> {
  const form = new FormData();
  form.append('file', file);
  if (answers) form.append('answers', JSON.stringify(answers));
  const { data } = await request.post('/tests/scanner/answer-sheet/grade', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function gradeByUnique(uniqueNumber: string, answers: string[]): Promise<GradeResult> {
  const { data } = await request.post(`/tests/generated/variant/${uniqueNumber}/grade`, { answers });
  return data;
}
