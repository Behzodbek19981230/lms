export type CenterType = {
	id: number;
	name: string;
	isActive?: boolean;
	location?: string;
	address?: string;
	phone?: string;
	description?: string;
	permissions?: Record<string, boolean>;
};
