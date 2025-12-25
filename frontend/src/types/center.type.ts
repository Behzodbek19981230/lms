export type CenterType = {
	id: number;
	name: string;
	location?: string;
	address?: string;
	phone?: string;
	description?: string;
	permissions?: Record<string, boolean>;
};
