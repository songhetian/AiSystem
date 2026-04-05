import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permissionCode';
export const Permission = (code: string) => SetMetadata(PERMISSION_KEY, code);
