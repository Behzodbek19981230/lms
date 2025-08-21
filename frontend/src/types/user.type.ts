export type UserType = {
    id: string;
    name: string;
    email: string;
    password: string;
    image?: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    lastLogin?: Date; // Optional field for last login time
    role: RolesType
}
export type RolesType = 'superadmin' | 'admin' | 'teacher' | 'student';