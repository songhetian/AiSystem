/**
 * 学历管理页面
 * 包含：学历字典管理（学历层次标准化）+ 员工学历查询与备案审核
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tabs,
  Typography,
  Popconfirm,
  Badge,
  Descriptions,
  Empty,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BookOutlined,
  ApartmentOutlined,
  ReloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { personnelApi } from '@/api/personnel';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// 学历层次选项（标准化）
const EDU_LEVEL_OPTIONS = [
  { label: '博士', value: '博士', color: 'purple' },
  { label: '硕士', value: '硕士', color: 'blue' },
  { label: '本科', value: '本科', color: 'geekblue' },
  { label: '专科', value: '专科', color: 'cyan' },
  { label: '高中', value: '高中', color: 'green' },
  { label: '初中', value: '初中', color: 'default' },
  { label: '小学', value: '小学', color: 'default' },
];

const getEduLevelColor = (level: string) => {
  return EDU_LEVEL_OPTIONS.find((o) => o.value === level)?.color || 'default';
};

// 备案状态配置
const RECORD_STATUS_MAP: Record<string, { color: string; text: string }> = {
  unrecorded: { color: 'default', text: '未备案' },
  reviewing: { color: 'processing', text: '审核中' },
  recorded: { color: 'success', text: '已备案' },
};

export default function EducationManagePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dict');

  // ============ 学历字典 ============
  const [dictModalVisible, setDictModalVisible] = useState(false);
  const [editingDict, setEditingDict] = useState<any>(null);
  const [dictForm] = Form.useForm();

  const { data: dictList = [], isLoading: dictLoading } = useQuery({
    queryKey: ['education-dict'],
    queryFn: () => personnelApi.listEducationDict(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const saveDictMutation = useMutation({
    mutationFn: personnelApi.saveEducationDict,
    onSuccess: () => {
      message.success('保存成功');
      setDictModalVisible(false);
      dictForm.resetFields();
      setEditingDict(null);
      queryClient.invalidateQueries({ queryKey: ['education-dict'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || '保存失败'),
  });

  const deleteDictMutation = useMutation({
    mutationFn: personnelApi.deleteEducationDict,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['education-dict'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || '删除失败'),
  });

  const handleDictAdd = () => {
    setEditingDict(null);
    dictForm.resetFields();
    dictForm.setFieldsValue({ sort: 0, status: 1 });
    setDictModalVisible(true);
  };

  const handleDictEdit = (record: any) => {
    setEditingDict(record);
    dictForm.setFieldsValue(record);
    setDictModalVisible(true);
  };

  const handleDictSubmit = async () => {
    const values = await dictForm.validateFields();
    saveDictMutation.mutate({ ...editingDict, ...values });
  };

  const dictColumns = [
    {
      title: '学历层次',
      dataIndex: 'edu_level',
      key: 'edu_level',
      render: (v: string) => (
        <Tag color={getEduLevelColor(v)} className="font-bold">
          {v}
        </Tag>
      ),
    },
    {
      title: '专业分类',
      dataIndex: 'major_category',
      key: 'major_category',
      render: (v: string) => v || <Text type="secondary">-</Text>,
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: number) => (
        <Badge
          status={v === 1 ? 'success' : 'default'}
          text={v === 1 ? '启用' : '禁用'}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleDictEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除此学历字典吗？"
            onConfirm={() => deleteDictMutation.mutate(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ============ 员工学历备案 ============
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [auditRecord, setAuditRecord] = useState<any>(null);

  const { data: allEmployeeEdu = [], isLoading: employeeEduLoading } = useQuery({
    queryKey: ['all-employee-education'],
    queryFn: () => personnelApi.listAllEmployeeEducation(),
    enabled: activeTab === 'records',
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const auditMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      personnelApi.auditEducation(id, status),
    onSuccess: () => {
      message.success('审核操作成功');
      setAuditModalVisible(false);
      setAuditRecord(null);
      queryClient.invalidateQueries({ queryKey: ['all-employee-education'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || '审核失败'),
  });

  const handleAudit = (record: any) => {
    setAuditRecord(record);
    setAuditModalVisible(true);
  };

  const employeeEduColumns = [
    {
      title: '员工姓名',
      dataIndex: ['hr_employee', 'name'],
      key: 'employee_name',
      width: 100,
    },
    {
      title: '学历层次',
      dataIndex: ['education_dict', 'edu_level'],
      key: 'edu_level',
      width: 100,
      render: (v: string) =>
        v ? (
          <Tag color={getEduLevelColor(v)} className="font-bold">
            {v}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '专业',
      dataIndex: 'major',
      key: 'major',
      render: (v: string) => v || <Text type="secondary">-</Text>,
    },
    {
      title: '毕业院校',
      dataIndex: 'graduate_school',
      key: 'graduate_school',
    },
    {
      title: '毕业时间',
      dataIndex: 'graduate_time',
      key: 'graduate_time',
      width: 110,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM') : '-'),
    },
    {
      title: '备案状态',
      dataIndex: 'record_status',
      key: 'record_status',
      width: 100,
      render: (v: string) => {
        const cfg = RECORD_STATUS_MAP[v] || { color: 'default', text: v };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: '备案时间',
      dataIndex: 'record_time',
      key: 'record_time',
      width: 130,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleAudit(record)}
          >
            审核备案
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 bg-[#f8fafc] min-h-full">
      {/* 页头 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <BookOutlined className="text-white text-lg" />
          </div>
          <div>
            <Title level={4} className="!m-0 font-black text-slate-900">
              学历管理
            </Title>
            <Text className="text-slate-500 text-sm">
              管理学历字典标准与员工学历备案审核
            </Text>
          </div>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        className="leixi-tabs"
        items={[
          {
            key: 'dict',
            label: (
              <Space>
                <ApartmentOutlined />
                学历字典
              </Space>
            ),
            children: (
              <Card
                className="rounded-2xl shadow-sm border-slate-100"
                extra={
                  <Space>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() =>
                        queryClient.invalidateQueries({ queryKey: ['education-dict'] })
                      }
                      loading={dictLoading}
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleDictAdd}
                      className="bg-blue-600 hover:bg-blue-500 border-none rounded-lg font-bold"
                    >
                      新增学历
                    </Button>
                  </Space>
                }
              >
                <Table
                  rowKey="id"
                  columns={dictColumns}
                  dataSource={Array.isArray(dictList) ? dictList : []}
                  loading={dictLoading}
                  pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
                />
              </Card>
            ),
          },
          {
            key: 'records',
            label: (
              <Space>
                <BookOutlined />
                学历备案记录
              </Space>
            ),
            children: (
              <Card
                className="rounded-2xl shadow-sm border-slate-100"
                extra={
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() =>
                      queryClient.invalidateQueries({ queryKey: ['all-employee-education'] })
                    }
                    loading={employeeEduLoading}
                  />
                }
              >
                {(Array.isArray(allEmployeeEdu) && allEmployeeEdu.length > 0) ? (
                  <Table
                    rowKey="id"
                    columns={employeeEduColumns}
                    dataSource={allEmployeeEdu}
                    loading={employeeEduLoading}
                    scroll={{ x: 1000 }}
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showTotal: (t) => `共 ${t} 条`,
                    }}
                  />
                ) : (
                  <Empty description="暂无学历备案记录" />
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* 学历字典新增/编辑弹窗 */}
      <Modal
        title={editingDict ? '编辑学历字典' : '新增学历字典'}
        open={dictModalVisible}
        onOk={handleDictSubmit}
        onCancel={() => {
          setDictModalVisible(false);
          setEditingDict(null);
          dictForm.resetFields();
        }}
        confirmLoading={saveDictMutation.isPending}
        width={500}
      >
        <Form form={dictForm} layout="vertical" className="mt-4">
          <Form.Item
            name="edu_level"
            label="学历层次"
            rules={[{ required: true, message: '请选择学历层次' }]}
          >
            <Select
              placeholder="请选择学历层次"
              options={EDU_LEVEL_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
            />
          </Form.Item>
          <Form.Item name="major_category" label="专业分类">
            <Input placeholder="如：计算机类、文史类、理工类" />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber min={0} max={999} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={[
                { label: '启用', value: 1 },
                { label: '禁用', value: 0 },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 学历备案审核弹窗 */}
      <Modal
        title="学历备案审核"
        open={auditModalVisible}
        onCancel={() => {
          setAuditModalVisible(false);
          setAuditRecord(null);
        }}
        footer={
          auditRecord?.record_status !== 'recorded' ? (
            <Space>
              <Button onClick={() => setAuditModalVisible(false)}>取消</Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                loading={auditMutation.isPending}
                onClick={() =>
                  auditMutation.mutate({ id: auditRecord.id, status: 'unrecorded' })
                }
              >
                驳回
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                className="bg-green-600 hover:bg-green-500 border-none"
                loading={auditMutation.isPending}
                onClick={() =>
                  auditMutation.mutate({ id: auditRecord.id, status: 'recorded' })
                }
              >
                通过备案
              </Button>
            </Space>
          ) : (
            <Button onClick={() => setAuditModalVisible(false)}>关闭</Button>
          )
        }
        width={600}
      >
        {auditRecord && (
          <Descriptions column={2} bordered className="mt-4">
            <Descriptions.Item label="员工姓名">
              {auditRecord.hr_employee?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="学历层次">
              {auditRecord.education_dict?.edu_level ? (
                <Tag color={getEduLevelColor(auditRecord.education_dict.edu_level)} className="font-bold">
                  {auditRecord.education_dict.edu_level}
                </Tag>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="所学专业">
              {auditRecord.major || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="毕业院校">
              {auditRecord.graduate_school || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="毕业时间">
              {auditRecord.graduate_time ? dayjs(auditRecord.graduate_time).format('YYYY-MM') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="当前状态">
              {(() => {
                const cfg = RECORD_STATUS_MAP[auditRecord.record_status] || { color: 'default', text: auditRecord.record_status };
                return <Tag color={cfg.color}>{cfg.text}</Tag>;
              })()}
            </Descriptions.Item>
            {auditRecord.record_time && (
              <Descriptions.Item label="备案时间" span={2}>
                {dayjs(auditRecord.record_time).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            )}
            {auditRecord.remark && (
              <Descriptions.Item label="备注" span={2}>
                {auditRecord.remark}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
