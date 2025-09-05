import { CenterType } from './center.type';

export type UserType = {
	id: number;
	username: string;
	firstName: string;
	lastName: string;
	fullName: string;
	role: RolesType;
	center: CenterType | null;
	telegramId?: string;
	telegramConnected?: boolean;
	hasCenterAssigned?: boolean;
	needsCenterAssignment?: boolean;
};
export type RolesType = 'superadmin' | 'admin' | 'teacher' | 'student';
