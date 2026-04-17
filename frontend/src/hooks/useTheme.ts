import { useState, useEffect } from "react";
import { theme } from "antd";

export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    setIsDark(saved === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  return {
    isDark,
    toggleTheme,
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  };
}
