import { ApiPropertyOptional } from '@nestjs/swagger';
import { CenterPermissionKey } from '../permissions/center-permissions';

export class UpdateCenterPermissionsDto {
  @ApiPropertyOptional({ description: 'Partial permissions map', example: { tests: true } })
  permissions: Partial<Record<CenterPermissionKey, boolean>>;
}
