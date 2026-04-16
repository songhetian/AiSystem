import { useMemo } from "react";
import type { DataNode } from "antd/es/tree";

/**
 * 权限树构建Hook
 * 用于构建菜单树和按钮树
 */
export function usePermissionTree(menus: any[], buttons: any[]) {
  // 构建菜单树
  const menuTreeData = useMemo(() => {
    const menuMap = new Map<string, DataNode>();

    menus.forEach((menu) => {
      menuMap.set(menu.id, {
        key: menu.id,
        title: menu.menu_name,
        children: [],
      });
    });

    const tree: DataNode[] = [];
    menus.forEach((menu) => {
      const node = menuMap.get(menu.id);
      if (!node) return;

      if (menu.parent_id && menuMap.has(menu.parent_id)) {
        const parent = menuMap.get(menu.parent_id);
        if (parent && parent.children) {
          parent.children.push(node);
        }
      } else {
        tree.push(node);
      }
    });

    return tree;
  }, [menus]);

  // 按菜单分组按钮
  const groupedButtons = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    buttons.forEach((button) => {
      if (!grouped[button.menu_id]) {
        grouped[button.menu_id] = [];
      }
      grouped[button.menu_id].push(button);
    });
    return grouped;
  }, [buttons]);

  // 构建按钮树
  const buttonTreeData = useMemo(() => {
    return menus
      .filter((m: any) => groupedButtons[m.id]?.length > 0)
      .map((menu: any) => ({
        key: menu.id,
        title: menu.menu_name,
        selectable: false,
        children: groupedButtons[menu.id].map((button: any) => ({
          key: button.id,
          title: button.button_name,
        })),
      }));
  }, [menus, groupedButtons]);

  return {
    menuTreeData,
    buttonTreeData,
    groupedButtons,
  };
}
