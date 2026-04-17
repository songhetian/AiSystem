import { useState, useEffect } from "react";
import { theme } from "antd";

/**
 * 主题切换 Hook
 * @returns { isDark, toggleTheme, algorithm }
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // 从本地存储加载主题设置
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setIsDark(true);
    } else if (saved === "light") {
      setIsDark(false);
    } else {
      // 如果没有保存的设置，检查系统偏好
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setIsDark(prefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  const setTheme = (dark: boolean) => {
    setIsDark(dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  };

  return {
    isDark,
    toggleTheme,
    setTheme,
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  };
}
