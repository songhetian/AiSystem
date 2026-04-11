import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, InputNumber, Select, Space, Switch, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { knowledgeApi, type KnowledgeCategory } from '@/api/knowledge';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';
import LeixiModalForm from '@/components/common/LeixiModalForm';

type KnowledgeCategoryRow = KnowledgeCategory & { path_name: string };

const flattenCategories = (categories: KnowledgeCategory[], prefix = ''): KnowledgeCategoryRow[] => {
  const rows: KnowledgeCategoryRow[] = [];
  for (const category of categories) {
    const pathName = prefix ? `${prefix} / ${category.category_name}` : category.category_name;
    rows.push({ ...category, path_name: pathName });
    if (category.children?.length) {
      rows.push(...flattenCategories(category.children, pathName));
    }
  }
  return rows;
};

export default function KnowledgeCategoriesPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');

  const { data: categories = [], isLoading } = useQuery<KnowledgeCategory[]>({
    queryKey: ['knowledge-categories', keyword],
    queryFn: () => knowledgeApi.listCategories({ keyword: keyword || undefined })
  });

  const rows = useMemo(() => flattenCategories(categories), [categories]);
  const parentOptions = useMemo(() => rows.map(item => ({ label: item.path_name, value: item.id })), [rows]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['knowledge-categories'] });
  };

  const handleSave = async (values: any, id?: string) => {
    const payload = { ...values, enabled: values.enabled ? 1 : 0 };
    if (id) await knowledgeApi.updateCategory(id, payload);
    else await knowledgeApi.createCategory(payload);
    message.success('分类已保存');
    await refresh();
  };

  const columns: ProColumns<KnowledgeCategoryRow>[] = [
    { title: '分类名称', dataIndex: 'path_name', className: 'font-black text-slate-900' },
    { title: '分类编码', dataIndex: 'category_code', width: 180, className: 'font-bold text-slate-500' },
    { title: '排序', dataIndex: 'sort', width: 80 },
    {
      title: '状态',
      width: 120,
      render: (_, record) => <Tag color={record.enabled ? 'success' : 'default'} className="font-black rounded-lg border-none px-3">{record.enabled ? '已启用' : '已禁用'}</Tag>
    },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <Space size="middle">
          <Permission code="knowledge:category:update">
            <LeixiModalForm
              title="编辑知识分类"
              initialValues={{ ...record, enabled: !!record.enabled }}
              onFinish={(values) => handleSave(values, record.id)}
              trigger={<Button type="link" icon={<EditOutlined />} className="font-black p-0">编辑</Button>}
            >
              <CategoryFormItems parentOptions={parentOptions} editingId={record.id} />
            </LeixiModalForm>
          </Permission>
          <Permission code="knowledge:category:update">
            <Switch 
              size="small" 
              checked={!!record.enabled} 
              onChange={async (checked) => {
                if (checked) await knowledgeApi.enableCategory(record.id);
                else await knowledgeApi.disableCategory(record.id);
                refresh();
              }}
            />
          </Permission>
        </Space>
      )
    }
  ];

  return (
    <div className="bg-slate-50 p-6 min-h-full space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900">知识库分类</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Article Categories</p>
        </div>
        <Space size="middle">
          <Input 
            prefix={<SearchOutlined />} 
            placeholder="搜索分类名称..." 
            className="h-11 rounded-xl w-64 border-none shadow-sm font-bold" 
            onChange={e => setKeyword(e.target.value)} 
          />
          <Permission code="knowledge:category:create">
            <LeixiModalForm
              title="新建知识分类"
              initialValues={{ enabled: true, sort: 0 }}
              onFinish={(values) => handleSave(values)}
              trigger={<Button type="primary" size="large" icon={<PlusOutlined />} className="h-11 rounded-xl bg-slate-900 border-none font-black shadow-lg">新建分类</Button>}
            >
              <CategoryFormItems parentOptions={parentOptions} />
            </LeixiModalForm>
          </Permission>
        </Space>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <BaseTable<KnowledgeCategoryRow> rowKey="id" columns={columns} dataSource={rows} loading={isLoading} pagination={{ pageSize: 10 }} />
      </div>
    </div>
  );
}

// 进一步解耦：表单项独立出来，可被新建和编辑共用
const CategoryFormItems = ({ parentOptions, editingId }: { parentOptions: any[], editingId?: string }) => (
  <>
    <Form.Item label={<span className="font-black text-slate-700">分类名称</span>} name="category_name" rules={[{ required: true }]}>
      <Input className="h-11 rounded-xl font-bold" placeholder="输入分类展示名称" />
    </Form.Item>
    <Form.Item label={<span className="font-black text-slate-700">分类编码</span>} name="category_code" rules={[{ required: true }]}>
      <Input className="h-11 rounded-xl font-bold" placeholder="用于系统识别的唯一编码" />
    </Form.Item>
    <Form.Item label={<span className="font-black text-slate-700">上级分类</span>} name="parent_id">
      <Select allowClear options={parentOptions.filter(i => i.value !== editingId)} placeholder="选择所属上级分类（可选）" className="h-11 rounded-xl font-bold" />
    </Form.Item>
    <div className="grid grid-cols-2 gap-4">
      <Form.Item label={<span className="font-black text-slate-700">排序权重</span>} name="sort">
        <InputNumber min={0} className="w-full h-11 rounded-xl font-bold pt-1" />
      </Form.Item>
      <Form.Item label={<span className="font-black text-slate-700">状态</span>} name="enabled" valuePropName="checked">
        <Switch checkedChildren="已启用" unCheckedChildren="已禁用" className="mt-2" />
      </Form.Item>
    </div>
    <Form.Item label={<span className="font-black text-slate-700">备注说明</span>} name="description">
      <Input.TextArea rows={3} className="rounded-xl font-bold" placeholder="添加分类补充说明..." />
    </Form.Item>
  </>
);
