export enum TestTypeEnum {
	OPEN = 'OPEN',
	CLOSED = 'CLOSED',
	MIXED = 'MIXED',
}

export enum TestStatus {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	ARCHIVED = 'ARCHIVED',
}

export type Test = {
	id: number;
	title: string;
	description: string;
	type: TestTypeEnum;
	status: TestStatus;
	duration: number;
	totalQuestions: number;
	totalPoints: number;
	shuffleQuestions: boolean;
	showResults: boolean;
	subject: {
		id: number;
		name: string;
		category: string;
		hasFormulas: boolean;
	};
	teacher: {
		id: number;
		fullName: string;
	};
	createdAt: string;
	updatedAt: string;
};

export type CreateTestType = {
	title: string;
	description?: string;
	type: TestTypeEnum;
	duration: number;
	shuffleQuestions: boolean;
	showResults: boolean;
	subjectid: number;
};

export type UpdateTestType = {
	title?: string;
	description?: string;
	type?: TestTypeEnum;
	duration?: number;
	shuffleQuestions?: boolean;
	showResults?: boolean;
	subjectid?: number;
};
