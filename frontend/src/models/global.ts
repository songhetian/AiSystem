import { create } from "zustand";

interface GlobalState {
  token?: string;
  currentUser?: {
    id: string;
    username: string;
    name: string;
    avatar?: string;
    phone?: string;
    email?: string;
    menus: Array<{
      id: string;
      menu_name: string;
      route?: string;
      menu_code: string;
    }>;
    buttons: Array<{ id: string; button_code: string }>;
    // V2.0 性能优化：权限预处理
    buttonCodesSet?: Set<string>;
    menuCodesSet?: Set<string>;
    routesSet?: Set<string>;
  };
  setToken: (token?: string) => void;
  setCurrentUser: (currentUser?: GlobalState["currentUser"]) => void;
}

/**
 * 全局状态管理（V2.0 性能优化）
 * 优化点：
 * 1. 权限数据预处理（转换为Set）
 * 2. 权限检查从O(n)降到O(1)
 */
export const useGlobalStore = create<GlobalState>((set) => ({
  token:
    typeof localStorage === "undefined"
      ? undefined
      : (localStorage.getItem("token") ?? undefined),
  currentUser:
    typeof localStorage === "undefined"
      ? undefined
      : (() => {
          const stored = localStorage.getItem("currentUser");
          if (!stored) return undefined;
          const user = JSON.parse(stored);
          // 恢复时重新生成Set（Set不能序列化到localStorage）
          if (user) {
            user.buttonCodesSet = new Set(user.buttons?.map((b: any) => b.button_code) ?? []);
            user.menuCodesSet = new Set(user.menus?.map((m: any) => m.menu_code) ?? []);
            user.routesSet = new Set(user.menus?.map((m: any) => m.route).filter(Boolean) ?? []);
          }
          return user;
        })(),
  setToken: (token) => {
    if (typeof localStorage !== "undefined") {
      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }
    }
    set({ token });
  },
  setCurrentUser: (currentUser) => {
    if (typeof localStorage !== "undefined") {
      if (currentUser) {
        // 预处理：转换为Set（提升查询性能）
        currentUser.buttonCodesSet = new Set(
          currentUser.buttons?.map(b => b.button_code) ?? []
        );
        currentUser.menuCodesSet = new Set(
          currentUser.menus?.map(m => m.menu_code) ?? []
        );
        currentUser.routesSet = new Set(
          currentUser.menus?.map(m => m.route).filter(Boolean) ?? []
        );
        
        // 存储到localStorage（Set会被忽略，恢复时重新生成）
        localStorage.setItem("currentUser", JSON.stringify({
          ...currentUser,
          buttonCodesSet: undefined, // Set不能序列化
          menuCodesSet: undefined,
          routesSet: undefined,
        }));
      } else {
        localStorage.removeItem("currentUser");
      }
    }
    set({ currentUser });
  },
}));
