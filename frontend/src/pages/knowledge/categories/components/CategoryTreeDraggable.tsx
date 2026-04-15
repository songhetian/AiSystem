import React, { useState, useEffect } from "react";
import { Button, Space, Tree, message } from "antd";
import type { DataNode } from "antd/es/tree";
import { SaveOutlined, ReloadOutlined } from "@ant-design/icons";
import { knowledgeApi, type KnowledgeCategory } from "@/api/knowledge";

interface CategoryTreeDraggableProps {
  categories: KnowledgeCategory[];
  onUpdate: () => void;
}

/**
 * 将分类数据转换为Tree组件所需的DataNode格式
 */
const convertToTreeData = (categories: KnowledgeCategory[]): DataNode[] => {
  return categories.map((category) => ({
    key: category.id,
    title: `${category.category_name} (排序: ${category.sort})`,
    children: category.children
      ? convertToTreeData(category.children)
      : undefined,
  }));
};

/**
 * 从Tree的DataNode重建分类排序数据
 */
const buildSortData = (
  nodes: DataNode[],
  parentId: string | null = null,
): Array<{ id: string; parent_id: string | null; sort: number }> => {
  const result: Array<{ id: string; parent_id: string | null; sort: number }> =
    [];

  nodes.forEach((node, index) => {
    result.push({
      id: node.key as string,
      parent_id: parentId,
      sort: index,
    });

    if (node.children && node.children.length > 0) {
      result.push(...buildSortData(node.children, node.key as string));
    }
  });

  return result;
};

/**
 * 知识库分类拖拽排序组件
 */
export const CategoryTreeDraggable: React.FC<CategoryTreeDraggableProps> = ({
  categories,
  onUpdate,
}) => {
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const data = convertToTreeData(categories);
    setTreeData(data);
    // 默认展开所有节点
    const allKeys = getAllKeys(data);
    setExpandedKeys(allKeys);
    setHasChanges(false);
  }, [categories]);

  const getAllKeys = (nodes: DataNode[]): React.Key[] => {
    const keys: React.Key[] = [];
    const traverse = (items: DataNode[]) => {
      items.forEach((item) => {
        keys.push(item.key);
        if (item.children) {
          traverse(item.children);
        }
      });
    };
    traverse(nodes);
    return keys;
  };

  const onDrop = (info: any) => {
    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;
    const dropPos = info.node.pos.split("-");
    const dropPosition =
      info.dropPosition - Number(dropPos[dropPos.length - 1]);

    const loop = (
      data: DataNode[],
      key: React.Key,
      callback: (node: DataNode, i: number, data: DataNode[]) => void,
    ) => {
      for (let i = 0; i < data.length; i++) {
        if (data[i].key === key) {
          return callback(data[i], i, data);
        }
        if (data[i].children) {
          loop(data[i].children!, key, callback);
        }
      }
    };

    const data = [...treeData];

    // Find dragObject
    let dragObj: DataNode;
    loop(data, dragKey, (item, index, arr) => {
      arr.splice(index, 1);
      dragObj = item;
    });

    if (!info.dropToGap) {
      // Drop on the content
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj!);
      });
    } else if (
      (info.node.children || []).length > 0 &&
      info.node.expanded &&
      dropPosition === 1
    ) {
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj!);
      });
    } else {
      let ar: DataNode[] = [];
      let i: number;
      loop(data, dropKey, (_item, index, arr) => {
        ar = arr;
        i = index;
      });
      if (dropPosition === -1) {
        ar.splice(i!, 0, dragObj!);
      } else {
        ar.splice(i! + 1, 0, dragObj!);
      }
    }

    setTreeData(data);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const sortData = buildSortData(treeData);
      await knowledgeApi.updateCategorySort({ items: sortData });
      message.success("分类排序已保存");
      setHasChanges(false);
      onUpdate();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const data = convertToTreeData(categories);
    setTreeData(data);
    setHasChanges(false);
    message.info("已恢复原始排序");
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-900">拖拽调整分类排序</h3>
          <p className="text-sm text-slate-500 mt-1">
            拖拽分类节点可调整顺序和层级，支持跨层级拖拽
          </p>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            disabled={!hasChanges}
          >
            重置
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges}
          >
            保存排序
          </Button>
        </Space>
      </div>

      {hasChanges && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800">
            ⚠️ 您有未保存的更改，请点击"保存排序"按钮保存
          </p>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <Tree
          className="draggable-tree"
          draggable
          blockNode
          onDrop={onDrop}
          treeData={treeData}
          expandedKeys={expandedKeys}
          onExpand={setExpandedKeys}
        />
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">💡 提示：</p>
        <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4">
          <li>• 拖拽节点可调整同级分类的顺序</li>
          <li>• 拖拽到其他节点上可调整父子关系</li>
          <li>• 支持多级分类的层级调整</li>
          <li>• 修改后需点击"保存排序"才会生效</li>
        </ul>
      </div>
    </div>
  );
};
