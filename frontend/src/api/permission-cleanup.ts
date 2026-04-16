import { request } from "@/utils/request";

export interface CleanupResult {
  success: boolean;
  message: string;
  details?: {
    redundantMenus: number;
    redundantButtons: number;
    invalidRoles: number;
    orphanedPermissions: number;
    totalCleaned: number;
  };
}

export interface DetectionResult {
  hasIssues: boolean;
  totalIssues: number;
  issues: {
    redundantMenus: Array<{
      resourceId: string;
      resourceName: string;
      count: number;
    }>;
    redundantButtons: Array<{
      resourceId: string;
      resourceName: string;
      count: number;
    }>;
    invalidRoles: Array<{
      roleId: string;
      roleName: string;
      count: number;
    }>;
    orphanedPermissions: Array<{
      type: string;
      menuCount: number;
      buttonCount: number;
      total: number;
    }>;
  };
}

export const permissionCleanupApi = {
  /**
   * 检测冗余配置
   */
  detect: (): Promise<DetectionResult> => {
    return request.get("/system/permission-cleanup/detect");
  },

  /**
   * 执行清理
   */
  execute: (): Promise<CleanupResult> => {
    return request.post("/system/permission-cleanup/execute");
  },
};
