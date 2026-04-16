import { useState, useCallback } from "react";
import { message } from "antd";

interface DragOperation {
  id: string;
  type: "add" | "remove" | "move";
  item: any;
  timestamp: number;
}

const MAX_HISTORY = 20;

/**
 * 拖拽辅助 Hook
 */
export const useDragHelper = () => {
  const [history, setHistory] = useState<DragOperation[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

  /**
   * 记录操作
   */
  const recordOperation = useCallback(
    (operation: Omit<DragOperation, "timestamp">) => {
      setHistory((prev) => [
        { ...operation, timestamp: Date.now() },
        ...prev.slice(0, MAX_HISTORY - 1),
      ]);

      // 如果是添加操作，标记为最近添加
      if (operation.type === "add") {
        setRecentlyAdded((prev) => new Set(prev).add(operation.id));

        // 3秒后移除标记
        setTimeout(() => {
          setRecentlyAdded((prev) => {
            const newSet = new Set(prev);
            newSet.delete(operation.id);
            return newSet;
          });
        }, 3000);
      }
    },
    [],
  );

  /**
   * 撤销上一步操作
   */
  const undo = useCallback(() => {
    if (history.length === 0) {
      message.warning("没有可撤销的操作");
      return null;
    }

    const lastOperation = history[0];
    setHistory((prev) => prev.slice(1));

    message.success("已撤销操作");
    return lastOperation;
  }, [history]);

  /**
   * 清空历史
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setRecentlyAdded(new Set());
  }, []);

  /**
   * 检查是否为最近添加
   */
  const isRecentlyAdded = useCallback(
    (id: string) => {
      return recentlyAdded.has(id);
    },
    [recentlyAdded],
  );

  /**
   * 获取拖拽提示文本
   */
  const getDragHint = useCallback((sourceType: string, targetType: string) => {
    if (sourceType === "available" && targetType === "assigned") {
      return "即将分配此权限";
    }
    if (sourceType === "assigned" && targetType === "available") {
      return "即将取消此权限";
    }
    return "拖拽以调整顺序";
  }, []);

  return {
    history,
    recordOperation,
    undo,
    clearHistory,
    isRecentlyAdded,
    getDragHint,
  };
};
