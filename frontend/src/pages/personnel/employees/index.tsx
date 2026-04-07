import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, DatePicker, Form, Image, Input, InputNumber, message, Popconfirm, Select, Space, Typography } from 'antd';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import { personnelApi } from '@/api/personnel';
import { systemApi } from '@/api/system';
import { BaseModal } from '@/components/common/BaseModal';
import { BaseUpload } from '@/components/common/BaseUpload';
import { BaseTable } from '@/components/table/BaseTable';

const { Title } = Typography;

interface EmployeeRecord {
  id: string;
  name: string;
  gender?: number;
  age?: number;
  phone?: string;
  email?: string;
  employee_no?: string;
  job_no?: string;
  department_id?: string;
  position_id?: string;
  status: number;
  join_date?: string;
  id_card_front_file?: string;
  id_card_back_file?: string;
}

interface DepartmentRecord {
  id: string;
  name: string;
}

interface PositionRecord {
  id: string;
  name: string;
}

const baseColumns: ProColumns<EmployeeRecord>[] = [
  { title: '姓名', dataIndex: 'name' },
  { title: '手机号', dataIndex: 'phone' },
  { title: '邮箱', dataIndex: 'email' },
  { title: '员工编号', dataIndex: 'employee_no' },
  { title: '工号', dataIndex: 'job_no' },
  { title: '状态', dataIndex: 'status', render: (_, record) => (record.status === 1 ? '在职' : '离职/禁用') }
];

export default function EmployeesPage() {
  const [open, setOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRecord | null>(null);
  const [uploadTarget, setUploadTarget] = useState<EmployeeRecord | null>(null);
  const [frontFileList, setFrontFileList] = useState<UploadFile[]>([]);
  const [backFileList, setBackFileList] = useState<UploadFile[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{ front: string | null; back: string | null }>({ front: null, back: null });
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery<EmployeeRecord[]>({
    queryKey: ['personnel-employees'],
    queryFn: personnelApi.listEmployees
  });
  const { data: departments = [] } = useQuery<DepartmentRecord[]>({
    queryKey: ['system-department-options'],
    queryFn: systemApi.listDepartments
  });
  const { data: positions = [] } = useQuery<PositionRecord[]>({
    queryKey: ['personnel-position-options'],
    queryFn: personnelApi.listPositions
  });

  useEffect(() => {
    if (uploadTarget && uploadOpen) {
      Promise.all([
        personnelApi.getEmployeeIdCardUrl(uploadTarget.id, 'front'),
        personnelApi.getEmployeeIdCardUrl(uploadTarget.id, 'back')
      ]).then(([frontRes, backRes]) => {
        setPreviewUrls({
          front: frontRes.url,
          back: backRes.url
        });
      });
    }
  }, [uploadTarget, uploadOpen]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['personnel-employees'] });
  const createMutation = useMutation({
    mutationFn: personnelApi.createEmployee,
    onSuccess: async () => {
      setOpen(false);
      form.resetFields();
      await refresh();
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => personnelApi.updateEmployee(id, payload),
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await refresh();
    }
  });
  const deleteMutation = useMutation({ mutationFn: personnelApi.deleteEmployee, onSuccess: refresh });
  const uploadMutation = useMutation({
    mutationFn: ({ id, side, file }: { id: string; side: 'front' | 'back'; file: File }) => personnelApi.uploadEmployeeIdCard(id, side, file),
    onSuccess: async () => {
      message.success('上传成功');
      await refresh();
    }
  });

  const uploadRequest = (side: 'front' | 'back'): UploadProps['customRequest'] => async (options) => {
    if (!uploadTarget || !(options.file instanceof File)) {
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        id: uploadTarget.id,
        side,
        file: options.file
      });
      options.onSuccess?.({}, options.file);
      const res = await personnelApi.getEmployeeIdCardUrl(uploadTarget.id, side);
      setPreviewUrls(prev => ({ ...prev, [side]: res.url }));
    } catch (error) {
      options.onError?.(error as Error);
    }
  };

  const columns: ProColumns<EmployeeRecord>[] = [
    ...baseColumns,
    {
      title: '证件',
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => {
            setUploadTarget(record);
            setFrontFileList([]);
            setBackFileList([]);
            setUploadOpen(true);
          }}
        >
          上传身份证
        </Button>
      )
    },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setEditing(record);
              form.setFieldsValue({
                ...record,
                join_date: record.join_date ? dayjs(record.join_date) : undefined
              });
              setOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm title="确认删除该员工？" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Card
      title="员工管理"
      extra={
        <Button type="primary" onClick={() => setOpen(true)}>
          新增员工
        </Button>
      }
    >
      <BaseTable<EmployeeRecord>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={isLoading}
      />
      <BaseModal
        open={open}
        title={editing ? '编辑员工' : '新增员工'}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            const payload = {
              ...values,
              join_date: values.join_date ? values.join_date.format('YYYY-MM-DD') : undefined
            };
            if (editing) {
              updateMutation.mutate({ id: editing.id, payload });
            } else {
              createMutation.mutate(payload);
            }
          }}
        >
          <Form.Item label="姓名" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="手机号" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="邮箱" name="email">
            <Input />
          </Form.Item>
          <Form.Item label="员工编号" name="employee_no">
            <Input />
          </Form.Item>
          <Form.Item label="工号" name="job_no">
            <Input />
          </Form.Item>
          <Form.Item label="性别" name="gender">
            <Select allowClear options={[{ label: '男', value: 1 }, { label: '女', value: 2 }]} />
          </Form.Item>
          <Form.Item label="年龄" name="age">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="所属部门" name="department_id">
            <Select allowClear options={departments.map((item) => ({ label: item.name, value: item.id }))} />
          </Form.Item>
          <Form.Item label="岗位" name="position_id">
            <Select allowClear options={positions.map((item) => ({ label: item.name, value: item.id }))} />
          </Form.Item>
          <Form.Item label="入职日期" name="join_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue={1}>
            <Select options={[{ label: '在职', value: 1 }, { label: '离职/禁用', value: 0 }]} />
          </Form.Item>
        </Form>
      </BaseModal>
      <BaseModal
        open={uploadOpen}
        title={uploadTarget ? `证件管理 - ${uploadTarget.name}` : '证件管理'}
        onCancel={() => {
          setUploadOpen(false);
          setUploadTarget(null);
          setFrontFileList([]);
          setBackFileList([]);
          setPreviewUrls({ front: null, back: null });
        }}
        onOk={() => setUploadOpen(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Title level={5}>身份证正面</Title>
            {previewUrls.front && (
              <div style={{ marginBottom: 12 }}>
                <Image src={previewUrls.front} alt="身份证正面" style={{ maxHeight: 200, borderRadius: 8 }} />
              </div>
            )}
            <BaseUpload
              description="上传/更换身份证正面，JPG/PNG，最大 10MB"
              fileList={frontFileList}
              maxCount={1}
              customRequest={uploadRequest('front')}
              onChange={({ fileList }) => setFrontFileList(fileList)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Title level={5}>身份证反面</Title>
            {previewUrls.back && (
              <div style={{ marginBottom: 12 }}>
                <Image src={previewUrls.back} alt="身份证反面" style={{ maxHeight: 200, borderRadius: 8 }} />
              </div>
            )}
            <BaseUpload
              description="上传/更换身份证反面，JPG/PNG，最大 10MB"
              fileList={backFileList}
              maxCount={1}
              customRequest={uploadRequest('back')}
              onChange={({ fileList }) => setBackFileList(fileList)}
            />
          </div>
        </Space>
      </BaseModal>
    </Card>
  );
}
