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
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  perQuestion: Array<{
    index: number;
    correct: string;
    scanned: string;
    isCorrect: boolean;
  }>;
};





async function gradeByUnique(uniqueNumber: string, answers: string[], studentId?: number): Promise<GradeResult> {
  const { data } = await request.post(`/tests/generated/variant/${uniqueNumber}/grade`, { answers, studentId });
  return data;
}

export { gradeByUnique };