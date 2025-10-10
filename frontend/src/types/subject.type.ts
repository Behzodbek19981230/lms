export enum SubjectCategory {
	exact_science = 'exact_science',
	social_science = 'social_science',
	other = 'other',
}

export const SubjectCategoryLabels: Record<SubjectCategory, string> = {
	[SubjectCategory.exact_science]: 'Aniq fanlar',
	[SubjectCategory.social_science]: 'Ijtimoiy fanlar',
	[SubjectCategory.other]: 'Boshqa',
};

export type SubjectType = {
	category: SubjectCategory;
	createdAt: string;
	description: string;
	hasFormulas: boolean;
	id: number;
	isActive: boolean;
	name: string;
	testsCount: number;
	updatedAt: string;
};
export type CreateSubjectType = {
	name: string;
	description?: string;
	category: SubjectCategory;
	hasFormulas: boolean;
};
export type UpdateSubjectType = {
	name?: string;
	description?: string;
	category?: SubjectCategory;
	hasFormulas?: boolean;
	isActive?: boolean;
};
