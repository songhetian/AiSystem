import { useEffect } from "react";

/**
 * 快捷键 Hook
 * @param shortcuts 快捷键映射对象，键为快捷键组合（如 "Ctrl+n"），值为回调函数
 *
 * @example
 * useKeyboardShortcuts({
 *   "Ctrl+n": () => setOpen(true),
 *   "Ctrl+f": () => searchInputRef.current?.focus(),
 *   "Escape": () => setOpen(false),
 * });
 */
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 构建快捷键字符串
      const key = `${e.ctrlKey || e.metaKey ? "Ctrl+" : ""}${e.shiftKey ? "Shift+" : ""}${e.altKey ? "Alt+" : ""}${e.key}`;

      const handler = shortcuts[key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
