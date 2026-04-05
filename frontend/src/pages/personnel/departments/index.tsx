import { useQuery } from '@tanstack/react-query';
import { Card, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { personnelApi } from '@/api/personnel';

interface DepartmentRecord {
  id: string;
  name: string;
  parent_id?: string | null;
}

export default function DepartmentsPage() {
  const { data = [], isLoading } = useQuery<DepartmentRecord[]>({
    queryKey: ['personnel-departments'],
    queryFn: personnelApi.listDepartments
  });

  return (
    <Card title="组织架构视图" loading={isLoading}>
      <Tree defaultExpandAll treeData={buildTree(data)} />
    </Card>
  );
}

function buildTree(items: DepartmentRecord[]): DataNode[] {
  const nodeMap = new Map(items.map((item) => [item.id, { key: item.id, title: item.name, children: [] as DataNode[] }]));
  const roots: DataNode[] = [];

  items.forEach((item) => {
    const node = nodeMap.get(item.id)!;
    if (item.parent_id && nodeMap.has(item.parent_id)) {
      nodeMap.get(item.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
