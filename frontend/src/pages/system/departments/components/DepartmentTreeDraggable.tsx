import { useState, useEffect } from "react";
import { Tree, Card, Space, Button, message } from "antd";
import type { DataNode } from "antd/es/tree";
import { SaveOutlined, UndoOutlined } from "@ant-design/icons";
import { systemApi } from "@/api/system";

interface DepartmentTreeDraggableProps {
  departments: any[];
  onUpdate: () => void;
}

export const DepartmentTreeDraggable = ({
  departments,
  onUpdate,
}: DepartmentTreeDraggableProps) => {
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTreeData(buildTreeData(departments));
    setHasChanges(false);
  }, [departments]);

  // 构建树形数据
  const buildTreeData = (departments: any[]): DataNode[] => {
    const deptMap = new Map<string, any>();

    departments.forEach((dept) => {
      deptMap.set(dept.id, {
        key: dept.id,
        title: dept.name,
        children: [],
        ...dept,
      });
    });

    const tree: DataNode[] = [];
    departments.forEach((dept) => {
      const node = deptMap.get(dept.id);
      if (dept.parent_id && deptMap.has(dept.parent_id)) {
        const parent = deptMap.get(dept.parent_id);
        parent.children.push(node);
      } else {
        tree.push(node);
      }
    });

    return tree;
  };

  // 处理拖拽
  const handleDrop = (info: any) => {
    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;
    const dropPos = info.node.pos.split("-");
    const dropPosition =
      info.dropPosition - Number(dropPos[dropPos.length - 1]);

    const loop = (
      data: DataNode[],
      key: string,
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
    let dragObj: DataNode;

    // 找到拖拽的节点
    loop(data, dragKey, (item, index, arr) => {
      arr.splice(index, 1);
      dragObj = item;
    });

    if (!info.dropToGap) {
      // 放到节点内部
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj!);
      });
    } else if (
      (info.node.children || []).length > 0 &&
      info.node.expanded &&
      dropPosition === 1
    ) {
      // 放到展开节点的第一个子节点
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj!);
      });
    } else {
      // 放到节点前后
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

  // 保存排序
  const handleSave = async () => {
    setSaving(true);
    try {
      // 提取排序数据
      const sortData = extractSortData(treeData);

      // 调用API保存（需要后端实现）
      await systemApi.updateDepartmentSort(sortData);

      message.success("部门排序已保存");
      setHasChanges(false);
      onUpdate();
    } catch (error) {
      message.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  // 提取排序数据
  const extractSortData = (
    nodes: DataNode[],
    parentId: string | null = null,
  ): any[] => {
    const result: any[] = [];
    nodes.forEach((node, index) => {
      result.push({
        id: node.key,
        parent_id: parentId,
        sort: index,
      });
      if (node.children && node.children.length > 0) {
        result.push(...extractSortData(node.children, node.key as string));
      }
    });
    return result;
  };

  // 重置
  const handleReset = () => {
    setTreeData(buildTreeData(departments));
    setHasChanges(false);
    message.info("已重置为原始顺序");
  };

  return (
    <Card
      title="部门排序"
      extra={
        <Space>
          {hasChanges && (
            <>
              <Button icon={<UndoOutlined />} onClick={handleReset}>
                重置
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSave}
              >
                保存排序
              </Button>
            </>
          )}
        </Space>
      }
    >
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          background: "#f5f5f5",
          borderRadius: 4,
        }}
      >
        <Space direction="vertical" size="small">
          <div style={{ fontWeight: 500 }}>拖拽说明：</div>
          <div style={{ fontSize: 12, color: "#666" }}>
            • 拖拽部门可调整同级顺序
            <br />
            • 拖拽到其他部门上可改变层级关系
            <br />
            • 拖拽后点击"保存排序"按钮生效
            <br />• 点击"重置"可恢复到拖拽前的状态
          </div>
        </Space>
      </div>

      <Tree
        draggable
        blockNode
        defaultExpandAll
        onDrop={handleDrop}
        treeData={treeData}
        style={{ background: "#fff" }}
      />

      {hasChanges && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#fff7e6",
            border: "1px solid #ffd591",
            borderRadius: 4,
            color: "#d46b08",
          }}
        >
          ⚠️ 您有未保存的更改，请点击"保存排序"按钮保存
        </div>
      )}
    </Card>
  );
};
