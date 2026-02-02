import { kimyoTopics } from './kimyoFormulaTopics';
import { matematikaTopics } from './matematikaFormulaTopics';
import { biologiyaTopics } from './biologiyaFormulaTopics';

export type SubjectKey = 'kimyo' | 'matematika' | 'biologiya';

export type FormulaItem = {
	name: string;
	latex: string;
};

export type Topic = {
	key: string;
	label: string;
	items: FormulaItem[];
};

export type Subject = {
	key: SubjectKey;
	label: string;
	topics: Topic[];
};

export const subjects: Subject[] = [
	{ key: 'kimyo', label: 'Kimyo', topics: kimyoTopics },
	{ key: 'matematika', label: 'Matematika', topics: matematikaTopics },
	{ key: 'biologiya', label: 'Biologiya', topics: biologiyaTopics },
];

export const subjectLabels: Record<SubjectKey, string> = {
	kimyo: 'Kimyo',
	matematika: 'Matematika',
	biologiya: 'Biologiya',
};

// Back-compat exports (some parts of UI expect these names)
export * from './kimyoFormulaTopics';
export * from './matematikaFormulaTopics';
export * from './biologiyaFormulaTopics';
