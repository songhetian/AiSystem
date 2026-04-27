/**
 * 员工管理页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和用户体验
 */

import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  DatePicker,
  Form,
  Image,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import {
  DownloadOutlined,
  UploadOutlined,
  ReloadOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  StopOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageContainer, SectionCard } from '@/components/layout';
import { FilterBar, ActionBar, StatusTag } from '@/components/business';
import { Table, Modal } from '@/components/ui';
import { personnelApi } from '@/api/personnel';
import { systemApi } from '@/api/system';
import { BaseUpload } from '@/components/common/BaseUpload';
import {
  ColumnCustomizer,
  loadColumnConfig,
  type ColumnConfig,
} from '@/components/table/ColumnCustomizer';
import { Permission } from '@/components/permission/Permission';
import {
  defaultColumnConfig,
  getEmployeeColumns,
  type EmployeeRecord,
} from './components/columns';
import { useDebounce, useFormDraft, useKeyboardShortcuts } from '@/hooks';
import {
  confirmBatchAction,
  handleExportWithProgress,
  resetColumnConfig,
  saveColumnConfig,
} from '@/utils/ui-helpers';
import { formatDate } from '@/utils/format';

/**
 * 部门数据类型
 */
interface DepartmentRecord {
  id: string;
  name: string;
}

/**
 * 岗位数据类型
 */
interface PositionRecord {
  id: string;
  name: string;
}

const EmployeeManagementPage: React.FC = () => {
  // 状态管理
  const [modalVisible, setModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [editing, setEditing] = useState<EmployeeRecord | null>(null);
  const [uploadTarget, setUploadTarget] = useState<EmployeeRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [frontFileList, setFrontFileList] = useState<UploadFile[]>([]);
  const [backFileList, setBackFileList] = useState<UploadFile[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{
    front: string | null;
    back: string | null;
  }>({ front: null, back: null });
  const [filters, setFilters] = useState<any>({});
  const [columns, setColumns] = useState<ColumnConfig[]>(() =>
    loadColumnConfig('employee-table-columns', defaultColumnConfig),
  );

  // 表单实例
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<any>(null);

  // 使用表单草稿自动保存
  const { clearDraft } = useFormDraft(form, 'employee-form', 30000);

  // 添加快捷键支持
  useKeyboardShortcuts({
    'Ctrl+n': () => {
      handleAdd();
    },
    'Ctrl+f': () => searchInputRef.current?.focus(),
    'Ctrl+r': () => refresh(),
    Escape: () => {
      if (modalVisible) setModalVisible(false);
      if (uploadModalVisible) setUploadModalVisible(false);
    },
  });

  // 查询员工列表
  const { data = [], isLoading } = useQuery<EmployeeRecord[]>({
    queryKey: ['personnel-employees'],
    queryFn: async () => {
      const res = await personnelApi.listEmployees();
      return Array.isArray(res) ? res : [];
    },
  });

  // 查询部门列表
  const { data: departments = [] } = useQuery<DepartmentRecord[]>({
    queryKey: ['system-department-options'],
    queryFn: async () => {
      const res = await systemApi.listDepartments();
      return Array.isArray(res) ? res : [];
    },
  });

  // 查询岗位列表
  const { data: positions = [] } = useQuery<PositionRecord[]>({
    queryKey: ['personnel-position-options'],
    queryFn: async () => {
      const res = await personnelApi.listPositions();
      return Array.isArray(res) ? res : [];
    },
  });

  useEffect(() => {
    if (uploadTarget && uploadModalVisible) {
      Promise.all([
        personnelApi.getEmployeeIdCardUrl(uploadTarget.id, 'front'),
        personnelApi.getEmployeeIdCardUrl(uploadTarget.id, 'back'),
      ]).then(([frontRes, backRes]) => {
        setPreviewUrls({
          front: frontRes.url,
          back: backRes.url,
        });
      });
    }
  }, [uploadTarget, uploadModalVisible]);

  // 刷新数据
  const refresh = async () => {
    setSelectedIds([]);
    await queryClient.invalidateQueries({ queryKey: ['personnel-employees'] });
  };

  // 创建员工
  const createMutation = useMutation({
    mutationFn: personnelApi.createEmployee,
    onSuccess: async () => {
      setModalVisible(false);
      form.resetFields();
      clearDraft();
      message.success('创建员工成功');
      await refresh();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '创建员工失败');
    },
  });

  // 更新员工
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) => personnelApi.updateEmployee(id, payload),
    onSuccess: async () => {
      setModalVisible(false);
      setEditing(null);
      form.resetFields();
      clearDraft();
      message.success('更新员工成功');
      await refresh();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '更新员工失败');
    },
  });

  // 删除员工
  const deleteMutation = useMutation({
    mutationFn: personnelApi.deleteEmployee,
    onSuccess: () => {
      message.success('删除员工成功');
      refresh();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '删除员工失败');
    },
  });

  // 批量状态更新
  const batchStatusMutation = useMutation({
    mutationFn: personnelApi.batchUpdateEmployeeStatus,
    onSuccess: () => {
      message.success('批量操作成功');
      setSelectedIds([]);
      refresh();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '批量操作失败');
    },
  });

  // 上传证件
  const uploadMutation = useMutation({
    mutationFn: ({
      id,
      side,
      file,
    }: {
      id: string;
      side: 'front' | 'back';
      file: File;
    }) => personnelApi.uploadEmployeeIdCard(id, side, file),
    onSuccess: async () => {
      message.success('上传成功');
      await refresh();
    },
  });

  // 上传请求处理
  const uploadRequest =
    (side: 'front' | 'back'): UploadProps['customRequest'] =>
    async (options) => {
      if (!uploadTarget || !(options.file instanceof File)) {
        return;
      }

      try {
        await uploadMutation.mutateAsync({
          id: uploadTarget.id,
          side,
          file: options.file,
        });
        options.onSuccess?.({}, options.file);
        const res = await personnelApi.getEmployeeIdCardUrl(
          uploadTarget.id,
          side,
        );
        setPreviewUrls((prev) => ({ ...prev, [side]: res.url }));
      } catch (error) {
        options.onError?.(error as Error);
      }
    };

  // 新增员工
  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 1 });
    setModalVisible(true);
  };

  // 编辑员工
  const handleEdit = (record: EmployeeRecord) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      join_date: record.join_date ? dayjs(record.join_date) : undefined,
    });
    setModalVisible(true);
  };

  // 删除员工
  const handleDelete = (record: EmployeeRecord) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除员工 "${record.name}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  // 证件管理
  const handleIdCardManage = (record: EmployeeRecord) => {
    setUploadTarget(record);
    setFrontFileList([]);
    setBackFileList([]);
    setUploadModalVisible(true);
  };

  // 批量在职
  const handleBatchActive = () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要设置为在职的员工');
      return;
    }

    Modal.confirm({
      title: '确认批量在职',
      content: `确定要将选中的 ${selectedIds.length} 个员工设置为在职吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => batchStatusMutation.mutate({ ids: selectedIds, status: 1 }),
    });
  };

  // 批量离职
  const handleBatchInactive = () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要设置为离职的员工');
      return;
    }

    Modal.confirm({
      title: '确认批量离职',
      content: `确定要将选中的 ${selectedIds.length} 个员工设置为离职吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => batchStatusMutation.mutate({ ids: selectedIds, status: 0 }),
    });
  };

  // 筛选处理
  const handleSearch = (values: any) => {
    setFilters(values);
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({});
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        join_date: values.join_date
          ? values.join_date.format('YYYY-MM-DD')
          : undefined,
      };
      if (editing) {
        updateMutation.mutate({ id: editing.id, payload });
      } else {
        createMutation.mutate(payload);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 过滤数据
  const filteredData = data.filter((item) => {
    if (filters.searchText) {
      const searchMatch =
        item.name?.includes(filters.searchText) ||
        item.phone?.includes(filters.searchText) ||
        item.employee_no?.includes(filters.searchText) ||
        item.job_no?.includes(filters.searchText);
      if (!searchMatch) return false;
    }

    if (filters.status !== undefined && item.status !== filters.status) {
      return false;
    }

    if (filters.department_id && item.department_id !== filters.department_id) {
      return false;
    }

    if (filters.position_id && item.position_id !== filters.position_id) {
      return false;
    }

    return true;
  });

  // 获取列配置
  const tableColumns = getEmployeeColumns(columns, {
    onEdit: handleEdit,
    onDelete: (id) => {
      const record = data.find(item => item.id === id);
      if (record) handleDelete(record);
    },
    onIdCardManage: handleIdCardManage,
  });

  return (
    <PageContainer
      title="员工管理"
      subTitle="管理企业员工信息，支持批量操作和证件管理"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: '人事管理' },
          { title: '员工管理' },
        ],
      }}
    >
      {/* 筛选区域 */}
      <SectionCard title="筛选条件" collapsible defaultCollapsed={false}>
        <FilterBar
          items={[
            {
              name: 'searchText',
              label: '搜索',
              type: 'input',
              placeholder: '搜索姓名、手机号、员工编号、工号',
            },
            {
              name: 'status',
              label: '状态',
              type: 'select',
              options: [
                { label: '全部', value: undefined },
                { label: '在职', value: 1 },
                { label: '离职/禁用', value: 0 },
              ],
            },
            {
              name: 'department_id',
              label: '部门',
              type: 'select',
              options: [
                { label: '全部', value: undefined },
                ...departments.map((item: any) => ({
                  label: item.name,
                  value: item.id,
                })),
              ],
            },
            {
              name: 'position_id',
              label: '岗位',
              type: 'select',
              options: [
                { label: '全部', value: undefined },
                ...positions.map((item: any) => ({
                  label: item.name,
                  value: item.id,
                })),
              ],
            },
          ]}
          glass
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </SectionCard>

      {/* 数据区域 */}
      <SectionCard>
        <ActionBar
          actions={[
            {
              key: 'add',
              label: '新增员工',
              icon: <PlusOutlined />,
              type: 'primary',
              onClick: handleAdd,
            },
            {
              key: 'batch-active',
              label: `批量在职${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`,
              icon: <CheckCircleOutlined />,
              disabled: selectedIds.length === 0,
              onClick: handleBatchActive,
            },
            {
              key: 'batch-inactive',
              label: `批量离职${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`,
              icon: <StopOutlined />,
              disabled: selectedIds.length === 0,
              onClick: handleBatchInactive,
            },
            {
              key: 'export',
              label: '导出',
              icon: <DownloadOutlined />,
              onClick: async () => {
                await handleExportWithProgress(
                  async () => {
                    const blob = await personnelApi.exportEmployees();
                    const url = window.URL.createObjectURL(new Blob([blob]));
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `员工列表_${dayjs().format('YYYYMMDD')}.xlsx`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  },
                  `员工列表_${dayjs().format('YYYYMMDD')}.xlsx`,
                );
              },
            },
            {
              key: 'import',
              label: '批量导入',
              icon: <UploadOutlined />,
              onClick: () => {
                // 创建隐藏的文件输入
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.xlsx,.xls';
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    try {
                      message.loading({
                        content: '正在导入...',
                        key: 'import',
                        duration: 0,
                      });
                      const res = await personnelApi.importEmployees(file);
                      if (res.failed > 0) {
                        Modal.warning({
                          title: `导入完成：成功 ${res.success} 条，失败 ${res.failed} 条`,
                          content: (
                            <div style={{ maxHeight: 200, overflow: 'auto' }}>
                              {res.errors.map((e: string, i: number) => (
                                <div key={i} style={{ color: '#ff4d4f', fontSize: 12 }}>
                                  {e}
                                </div>
                              ))}
                            </div>
                          ),
                        });
                        message.destroy('import');
                      } else {
                        message.success({
                          content: `导入成功 ${res.success} 条`,
                          key: 'import',
                        });
                      }
                      queryClient.invalidateQueries({
                        queryKey: ['personnel-employees'],
                      });
                    } catch {
                      message.error({
                        content: '导入失败，请检查文件格式',
                        key: 'import',
                      });
                    }
                  }
                };
                input.click();
              },
            },
            {
              key: 'template',
              label: '下载模板',
              onClick: async () => {
                const blob = await personnelApi.downloadImportTemplate();
                const url = window.URL.createObjectURL(new Blob([blob]));
                const a = document.createElement('a');
                a.href = url;
                a.download = '员工导入模板.xlsx';
                a.click();
                window.URL.revokeObjectURL(url);
              },
            },
          ]}
          extra={
            <Space>
              <ColumnCustomizer
                columns={columns}
                onChange={(newColumns) => {
                  setColumns(newColumns);
                  saveColumnConfig('employee-table-columns', newColumns);
                }}
                storageKey="employee-table-columns"
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={() =>
                  resetColumnConfig(
                    'employee-table-columns',
                    defaultColumnConfig,
                    setColumns,
                  )
                }
                title="重置列配置"
              >
                重置列
              </Button>
              <span style={{ color: '#999', fontSize: 14 }}>
                共 {filteredData.length} 条记录
                {selectedIds.length > 0 && ` / 已选 ${selectedIds.length} 条`}
              </span>
            </Space>
          }
          align="space-between"
          glass
        />

        <Table
          columns={tableColumns}
          dataSource={filteredData}
          loading={isLoading}
          glass
          density="compact"
          striped
          hoverable
          rowKey="id"
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys: React.Key[]) => setSelectedIds(keys as string[]),
          }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </SectionCard>
      {/* 员工表单弹窗 */}
      <Modal
        visible={modalVisible}
        title={editing ? '编辑员工' : '新增员工'}
        width={600}
        glass
        onCancel={() => {
          setModalVisible(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: 1 }}
        >
          <Form.Item
            label="姓名"
            name="name"
            rules={[
              { required: true, message: '请输入姓名' },
              { max: 50, message: '姓名最多50个字符' },
            ]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { type: 'email', message: '请输入正确的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            label="员工编号"
            name="employee_no"
            rules={[
              { max: 20, message: '员工编号最多20个字符' },
            ]}
          >
            <Input placeholder="请输入员工编号" />
          </Form.Item>

          <Form.Item
            label="工号"
            name="job_no"
            rules={[
              { max: 20, message: '工号最多20个字符' },
            ]}
          >
            <Input placeholder="请输入工号" />
          </Form.Item>

          <Form.Item label="性别" name="gender">
            <Select
              allowClear
              placeholder="请选择性别"
              options={[
                { label: '男', value: 1 },
                { label: '女', value: 2 },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="年龄"
            name="age"
            rules={[
              { type: 'number', min: 16, max: 70, message: '年龄必须在16-70之间' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入年龄"
              min={16}
              max={70}
            />
          </Form.Item>

          <Form.Item label="所属部门" name="department_id">
            <Select
              allowClear
              placeholder="请选择所属部门"
              options={departments.map((item: any) => ({
                label: item.name,
                value: item.id,
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item label="岗位" name="position_id">
            <Select
              allowClear
              placeholder="请选择岗位"
              options={positions.map((item: any) => ({
                label: item.name,
                value: item.id,
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item label="入职日期" name="join_date">
            <DatePicker
              style={{ width: '100%' }}
              placeholder="请选择入职日期"
            />
          </Form.Item>

          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Select.Option value={1}>在职</Select.Option>
              <Select.Option value={0}>离职/禁用</Select.Option>
            </Select>
          </Form.Item>

          {editing && (
            <div style={{
              padding: 12,
              background: '#f0f9ff',
              borderRadius: 8,
              marginTop: 16,
            }}>
              <div style={{ fontSize: 12, color: '#0369a1' }}>💡 提示：</div>
              <ul style={{
                fontSize: 12,
                color: '#0369a1',
                marginTop: 8,
                paddingLeft: 20,
              }}>
                <li>修改员工信息后会立即生效</li>
                <li>离职员工将无法登录系统</li>
                <li>建议在员工离职前备份相关数据</li>
              </ul>
            </div>
          )}
        </Form>
      </Modal>

      {/* 证件管理弹窗 */}
      <Modal
        visible={uploadModalVisible}
        title={uploadTarget ? `证件管理 - ${uploadTarget.name}` : '证件管理'}
        width={700}
        glass
        onCancel={() => {
          setUploadModalVisible(false);
          setUploadTarget(null);
          setFrontFileList([]);
          setBackFileList([]);
          setPreviewUrls({ front: null, back: null });
        }}
        onOk={() => setUploadModalVisible(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Typography.Title level={5}>
              <IdcardOutlined /> 身份证正面
            </Typography.Title>
            {previewUrls.front && (
              <div style={{ marginBottom: 12 }}>
                <Image
                  src={previewUrls.front}
                  alt="身份证正面"
                  style={{ maxHeight: 200, borderRadius: 8 }}
                />
              </div>
            )}
            <Permission code="personnel:employee:id-card-upload">
              <BaseUpload
                description="上传/更换身份证正面，JPG/PNG，最大 10MB"
                fileList={frontFileList}
                maxCount={1}
                customRequest={uploadRequest('front')}
                onChange={({ fileList }) => setFrontFileList(fileList)}
              />
            </Permission>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Typography.Title level={5}>
              <IdcardOutlined /> 身份证反面
            </Typography.Title>
            {previewUrls.back && (
              <div style={{ marginBottom: 12 }}>
                <Image
                  src={previewUrls.back}
                  alt="身份证反面"
                  style={{ maxHeight: 200, borderRadius: 8 }}
                />
              </div>
            )}
            <Permission code="personnel:employee:id-card-upload">
              <BaseUpload
                description="上传/更换身份证反面，JPG/PNG，最大 10MB"
                fileList={backFileList}
                maxCount={1}
                customRequest={uploadRequest('back')}
                onChange={({ fileList }) => setBackFileList(fileList)}
              />
            </Permission>
          </div>

          <div style={{
            padding: 12,
            background: '#f0f9ff',
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 12, color: '#0369a1' }}>💡 提示：</div>
            <ul style={{
              fontSize: 12,
              color: '#0369a1',
              marginTop: 8,
              paddingLeft: 20,
            }}>
              <li>支持 JPG、PNG 格式，文件大小不超过 10MB</li>
              <li>请确保证件信息清晰可见</li>
              <li>上传的证件仅用于员工身份验证</li>
            </ul>
          </div>
        </Space>
      </Modal>
    </PageContainer>
  );
};

export default EmployeeManagementPage;
