import { useEffect } from "react";

export interface HotkeyConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
  description: string;
}

/**
 * 快捷键 Hook
 */
export const useHotkeys = (hotkeys: HotkeyConfig[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const hotkey of hotkeys) {
        const ctrlMatch = hotkey.ctrl
          ? event.ctrlKey || event.metaKey
          : !event.ctrlKey && !event.metaKey;
        const shiftMatch = hotkey.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = hotkey.alt ? event.altKey : !event.altKey;
        const keyMatch = event.key.toLowerCase() === hotkey.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          event.preventDefault();
          hotkey.callback();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hotkeys]);
};

/**
 * 快捷键配置管理
 */
export const HotkeyManager = {
  /**
   * 获取快捷键配置
   */
  getConfig: (): Record<string, HotkeyConfig> => {
    const saved = localStorage.getItem("hotkey-config");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  },

  /**
   * 保存快捷键配置
   */
  saveConfig: (config: Record<string, HotkeyConfig>) => {
    localStorage.setItem("hotkey-config", JSON.stringify(config));
  },

  /**
   * 重置为默认配置
   */
  resetConfig: () => {
    localStorage.removeItem("hotkey-config");
  },
};
