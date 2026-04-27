import { theme } from "antd";
import { useGlobalStore } from "@/models/global";

export function useTheme() {
  const { theme: currentTheme, setTheme } = useGlobalStore();
  const isDark = currentTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return {
    isDark,
    toggleTheme,
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  };
}
