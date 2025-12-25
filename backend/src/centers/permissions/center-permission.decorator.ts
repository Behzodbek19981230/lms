import { SetMetadata } from '@nestjs/common';
import type { CenterPermissionKey } from './center-permissions';

export const CENTER_PERMISSIONS_KEY = 'centerPermissions';

export const RequireCenterPermissions = (...permissions: CenterPermissionKey[]) =>
  SetMetadata(CENTER_PERMISSIONS_KEY, permissions);
