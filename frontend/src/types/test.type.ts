export enum TestTypeEnum {
	OPEN = 'open',
	CLOSED = 'closed',
	MIXED = 'mixed',
}

export enum TestStatus {
	DRAFT = 'draft',
	PUBLISHED = 'published',
	ARCHIVED = 'archived',
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
