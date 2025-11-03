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

export type ResolveCodeResult =
	| {
			source: 'exam';
			variantId: number;
			variantNumber: string;
			studentId: number;
			studentName: string;
			examId: number;
			examTitle: string;
			totalQuestions: number;
	  }
	| {
			source: 'generated';
			uniqueNumber: string;
			variantNumber: string | number;
			generatedTestId: number;
			title: string;
			subjectId?: number;
			printableUrl?: string | null;
	  };

async function resolveCode(code: string): Promise<ResolveCodeResult> {
	const { data } = await request.get(`/exams/scanner/${code}`);
	return data as ResolveCodeResult;
}

async function gradeByCode(code: string, answers: string[], studentId?: number): Promise<GradeResult> {
	const { data } = await request.post(`/exams/scanner/grade`, {
		code,
		answers,
		studentId,
	});
	return data as GradeResult;
}

async function gradeByUnique(uniqueNumber: string, answers: string[], studentId?: number): Promise<GradeResult> {
	const { data } = await request.post(`/tests/generated/variant/${uniqueNumber}/grade`, { answers, studentId });
	return data;
}
export { gradeByUnique, resolveCode, gradeByCode };
