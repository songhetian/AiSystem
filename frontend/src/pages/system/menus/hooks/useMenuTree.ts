import { useMemo } from 'react';

export const useMenuTree = (menus: any[]) => {
  return useMemo(() => {
    const buildTree = (items: any[], parentId: string | null = null): any[] => {
      return items
        .filter((item) => item.parent_id === parentId)
        .map((item) => ({
          ...item,
          key: item.id,
          children: buildTree(items, item.id),
        }));
    };
    return buildTree(menus);
  }, [menus]);
};
