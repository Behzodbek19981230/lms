export interface Group {
  id: string;
  name: string;
  description?: string;
  subject?: string;
  teacherId: string;
  centerId: string;
  studentCount?: number;
  capacity?: number;
  schedule?: string;
  room?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupDto {
  name: string;
  description?: string;
  subject?: string;
  capacity?: number;
  schedule?: string;
  room?: string;
}

export interface UpdateGroupDto extends Partial<CreateGroupDto> {
  isActive?: boolean;
}

export interface GroupWithStudents extends Group {
  students?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    username?: string;
    isActive: boolean;
  }>;
}
