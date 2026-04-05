import { create } from 'zustand';

interface GlobalState {
  token?: string;
  currentUser?: {
    id: string;
    username: string;
    name: string;
    menus: Array<{ id: string; menu_name: string; route?: string; menu_code: string }>;
    buttons: Array<{ id: string; button_code: string }>;
  };
  setToken: (token?: string) => void;
  setCurrentUser: (currentUser?: GlobalState['currentUser']) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  token: typeof localStorage === 'undefined' ? undefined : localStorage.getItem('token') ?? undefined,
  currentUser:
    typeof localStorage === 'undefined'
      ? undefined
      : JSON.parse(localStorage.getItem('currentUser') ?? 'null') ?? undefined,
  setToken: (token) => {
    if (typeof localStorage !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
    set({ token });
  },
  setCurrentUser: (currentUser) => {
    if (typeof localStorage !== 'undefined') {
      if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('currentUser');
      }
    }
    set({ currentUser });
  }
}));
