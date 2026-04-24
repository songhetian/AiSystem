import { create } from "zustand";

type ButtonLike = { id?: string; button_code?: string } | string;

interface MenuLike {
  id: string;
  menu_name: string;
  route?: string;
  menu_code: string;
}

interface CurrentUser {
  id: string;
  username: string;
  name: string;
  avatar?: string;
  phone?: string;
  email?: string;
  menus: MenuLike[];
  buttons: ButtonLike[];
  buttonCodesSet?: Set<string>;
  menuCodesSet?: Set<string>;
  routesSet?: Set<string>;
}

interface GlobalState {
  token?: string;
  currentUser?: CurrentUser;
  setToken: (token?: string) => void;
  setCurrentUser: (currentUser?: CurrentUser) => void;
}

const extractButtonCode = (button: ButtonLike): string | undefined =>
  typeof button === "string" ? button : button?.button_code;

const buildPermissionSets = (currentUser?: {
  buttons?: ButtonLike[];
  menus?: MenuLike[];
}) => ({
  buttonCodesSet: new Set(
    (currentUser?.buttons ?? [])
      .map(extractButtonCode)
      .filter((code): code is string => Boolean(code)),
  ),
  menuCodesSet: new Set(
    (currentUser?.menus ?? [])
      .map((menu) => menu.menu_code)
      .filter((code): code is string => Boolean(code)),
  ),
  routesSet: new Set(
    (currentUser?.menus ?? [])
      .map((menu) => menu.route)
      .filter((route): route is string => Boolean(route)),
  ),
});

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

          const user = JSON.parse(stored) as CurrentUser;
          return user ? { ...user, ...buildPermissionSets(user) } : undefined;
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
    const normalizedUser = currentUser
      ? { ...currentUser, ...buildPermissionSets(currentUser) }
      : undefined;

    if (typeof localStorage !== "undefined") {
      if (normalizedUser) {
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            ...normalizedUser,
            buttonCodesSet: undefined,
            menuCodesSet: undefined,
            routesSet: undefined,
          }),
        );
      } else {
        localStorage.removeItem("currentUser");
      }
    }

    set({ currentUser: normalizedUser });
  },
}));
