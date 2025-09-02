import { CenterType } from './center.type';

export type UserType = {
	id: number;
	username: string;
	firstName: string;
	lastName: string;
	fullName: string;
	role: RolesType;
	center: CenterType | null;
};
export type RolesType = 'superadmin' | 'admin' | 'teacher' | 'student';
