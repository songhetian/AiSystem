import type { ReactNode } from 'react';
import { useGlobalStore } from '@/models/global';

interface PermissionProps {
  allow?: boolean;
  code?: string;
  children: ReactNode;
}

export function Permission({ allow = true, code, children }: PermissionProps) {
  const currentUser = useGlobalStore((state) => state.currentUser);
  const hasPermission = code
    ? currentUser?.buttons?.some((button) => button.button_code === code)
    : true;

  if (!allow || !hasPermission) {
    return null;
  }

  return <>{children}</>;
}
