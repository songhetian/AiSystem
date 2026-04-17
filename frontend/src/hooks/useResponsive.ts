import { Grid } from "antd";
import { useMemo } from "react";

const { useBreakpoint } = Grid;

/**
 * 响应式设计 Hook
 * 提供响应式布局相关的工具函数和状态
 *
 * @example
 * ```tsx
 * const { isMobile, isTablet, isDesktop, screens, getResponsiveValue } = useResponsive();
 *
 * // 根据屏幕大小返回不同的值
 * const pageSize = getResponsiveValue({
 *   xs: 5,
 *   sm: 10,
 *   md: 15,
 *   lg: 20,
 *   xl: 25,
 * });
 *
 * // 条件渲染
 * {isMobile && <MobileView />}
 * {isDesktop && <DesktopView />}
 * ```
 */
export function useResponsive() {
  const screens = useBreakpoint();

  // 判断设备类型
  const isMobile = useMemo(() => {
    return screens.xs && !screens.sm;
  }, [screens]);

  const isTablet = useMemo(() => {
    return screens.sm && !screens.lg;
  }, [screens]);

  const isDesktop = useMemo(() => {
    return screens.lg || false;
  }, [screens]);

  /**
   * 根据当前屏幕大小返回对应的值
   * @param values - 不同断点对应的值
   * @returns 当前断点对应的值
   */
  const getResponsiveValue = <T>(values: {
    xs?: T;
    sm?: T;
    md?: T;
    lg?: T;
    xl?: T;
    xxl?: T;
  }): T | undefined => {
    if (screens.xxl && values.xxl !== undefined) return values.xxl;
    if (screens.xl && values.xl !== undefined) return values.xl;
    if (screens.lg && values.lg !== undefined) return values.lg;
    if (screens.md && values.md !== undefined) return values.md;
    if (screens.sm && values.sm !== undefined) return values.sm;
    if (screens.xs && values.xs !== undefined) return values.xs;
    return undefined;
  };

  /**
   * 获取响应式的表格配置
   */
  const getTableConfig = () => ({
    scroll: { x: isMobile ? 800 : undefined },
    pagination: {
      pageSize:
        getResponsiveValue({
          xs: 5,
          sm: 10,
          md: 15,
          lg: 20,
          xl: 25,
        }) || 10,
      showSizeChanger: !isMobile,
      showQuickJumper: isDesktop,
      size: isMobile ? "small" : "default",
    },
    size: isMobile ? "small" : "middle",
  });

  /**
   * 获取响应式的表单配置
   */
  const getFormConfig = () => ({
    layout: isMobile ? "vertical" : "horizontal",
    labelCol: isMobile ? undefined : { span: 6 },
    wrapperCol: isMobile ? undefined : { span: 18 },
  });

  /**
   * 获取响应式的栅格配置
   */
  const getGridConfig = () => ({
    xs: 24,
    sm: 12,
    md: 8,
    lg: 6,
    xl: 4,
  });

  /**
   * 获取响应式的模态框宽度
   */
  const getModalWidth = () => {
    return getResponsiveValue({
      xs: "100%",
      sm: "90%",
      md: 720,
      lg: 920,
      xl: 1200,
    });
  };

  return {
    screens,
    isMobile,
    isTablet,
    isDesktop,
    getResponsiveValue,
    getTableConfig,
    getFormConfig,
    getGridConfig,
    getModalWidth,
  };
}

/**
 * 响应式列配置 Hook
 * 用于动态调整表格列的显示
 *
 * @example
 * ```tsx
 * const { getVisibleColumns } = useResponsiveColumns();
 *
 * const allColumns = [
 *   { title: 'ID', dataIndex: 'id', key: 'id', priority: 1 },
 *   { title: '名称', dataIndex: 'name', key: 'name', priority: 1 },
 *   { title: '描述', dataIndex: 'desc', key: 'desc', priority: 2 },
 *   { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', priority: 3 },
 * ];
 *
 * const columns = getVisibleColumns(allColumns);
 * ```
 */
export function useResponsiveColumns() {
  const { isMobile, isTablet } = useResponsive();

  /**
   * 根据屏幕大小过滤列
   * @param columns - 所有列配置
   * @returns 当前屏幕应显示的列
   */
  const getVisibleColumns = <T extends { priority?: number }>(
    columns: T[],
  ): T[] => {
    if (isMobile) {
      // 移动端只显示优先级为 1 的列
      return columns.filter(
        (col) => col.priority === 1 || col.priority === undefined,
      );
    }
    if (isTablet) {
      // 平板显示优先级 1 和 2 的列
      return columns.filter((col) => !col.priority || col.priority <= 2);
    }
    // 桌面显示所有列
    return columns;
  };

  return {
    getVisibleColumns,
  };
}
