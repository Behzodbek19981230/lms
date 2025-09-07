import { ApiProperty } from '@nestjs/swagger';
import type { UserRole } from '../../users/entities/user.entity';

export class AuthResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    fullName: string;
    role: UserRole;
    hasCenterAssigned?: boolean;
    needsCenterAssignment?: boolean;
    center?: {
      id: number;
      name: string;
    } | null;
  };
}
