import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Image,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
} from "antd";
import type { UploadFile, UploadProps } from "antd/es/upload/interface";
import {
  DownloadOutlined,
  UploadOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { personnelApi } from "@/api/personnel";
import { systemApi } from "@/api/system";
import { BaseModal } from "@/components/common/BaseModal";
import { BaseUpload } from "@/components/common/BaseUpload";
import { BaseTable } from "@/components/table/BaseTable";
import {
  ColumnCustomizer,
  loadColumnConfig,
  type ColumnConfig,
} from "@/components/table/ColumnCustomizer";
import { Permission } from "@/components/permission/Permission";
import {
  defaultColumnConfig,
  getEmployeeColumns,
  type EmployeeRecord,
} from "./components/columns";
import { useDebounce, useFormDraft, useKeyboardShortcuts } from "@/hooks";
import { GlobalLoading } from "@/components/common";
import {
  confirmBatchAction,
  handleExportWithProgress,
  resetColumnConfig,
  saveColumnConfig,
} from "@/utils/ui-helpers";

const { Title } = Typography;

interface DepartmentRecord {
  id: string;
  name: string;
}

interface PositionRecord {
  id: string;
  name: string;
}

export default function EmployeesPage() {
  const [open, setOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRecord | null>(null);
  const [uploadTarget, setUploadTarget] = useState<EmployeeRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [frontFileList, setFrontFileList] = useState<UploadFile[]>([]);
  const [backFileList, setBackFileList] = useState<UploadFile[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{
    front: string | null;
    back: string | null;
  }>({ front: null, back: null });
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<number | undefined>(
    undefined,
  );
  const [columns, setColumns] = useState<ColumnConfig[]>(() =>
    loadColumnConfig("employee-table-columns", defaultColumnConfig),
  );
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<any>(null);

  // 使用防抖优化搜索
  const debouncedSearchText = useDebounce(searchText, 500);

  // 使用表单草稿自动保存
  const { clearDraft } = useFormDraft(form, "employee-form", 30000);

  // 添加快捷键支持
  useKeyboardShortcuts({
    "Ctrl+n": () => {
      setOpen(true);
      setEditing(null);
      form.resetFields();
    },
    "Ctrl+f": () => searchInputRef.current?.focus(),
    "Ctrl+r": () => refresh(),
    Escape: () => {
      if (open) setOpen(false);
      if (uploadOpen) setUploadOpen(false);
    },
  });

  const { data = [], isLoading } = useQuery<EmployeeRecord[]>({
    queryKey: ["personnel-employees"],
    queryFn: async () => {
      const res = await personnelApi.listEmployees();
      return Array.isArray(res) ? res : [];
    },
  });
  const { data: departments = [] } = useQuery<DepartmentRecord[]>({
    queryKey: ["system-department-options"],
    queryFn: async () => {
      const res = await systemApi.listDepartments();
      return Array.isArray(res) ? res : [];
    },
  });
  const { data: positions = [] } = useQuery<PositionRecord[]>({
    queryKey: ["personnel-position-options"],
    queryFn: async () => {
      const res = await personnelApi.listPositions();
      return Array.isArray(res) ? res : [];
    },
  });

  useEffect(() => {
    if (uploadTarget && uploadOpen) {
      Promise.all([
        personnelApi.getEmployeeIdCardUrl(uploadTarget.id, "front"),
        personnelApi.getEmployeeIdCardUrl(uploadTarget.id, "back"),
      ]).then(([frontRes, backRes]) => {
        setPreviewUrls({
          front: frontRes.url,
          back: backRes.url,
        });
      });
    }
  }, [uploadTarget, uploadOpen]);

  const refresh = async () => {
    setSelectedIds([]);
    await queryClient.invalidateQueries({ queryKey: ["personnel-employees"] });
  };

  const createMutation = useMutation({
    mutationFn: personnelApi.createEmployee,
    onSuccess: async () => {
      setOpen(false);
      form.resetFields();
      clearDraft(); // 清除草稿
      message.success("创建成功");
      await refresh();
    },
    onError: () => {
      message.error("创建失败，请重试");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) => personnelApi.updateEmployee(id, payload),
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      form.resetFields();
      clearDraft(); // 清除草稿
      message.success("更新成功");
      await refresh();
    },
    onError: () => {
      message.error("更新失败，请重试");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: personnelApi.deleteEmployee,
    onSuccess: () => {
      message.success("删除成功");
      refresh();
    },
    onError: () => {
      message.error("删除失败，请重试");
    },
  });

  const batchStatusMutation = useMutation({
    mutationFn: personnelApi.batchUpdateEmployeeStatus,
    onSuccess: () => {
      message.success("批量操作成功");
      setSelectedIds([]);
      refresh();
    },
    onError: () => {
      message.error("批量操作失败，请重试");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({
      id,
      side,
      file,
    }: {
      id: string;
      side: "front" | "back";
      file: File;
    }) => personnelApi.uploadEmployeeIdCard(id, side, file),
    onSuccess: async () => {
      message.success("上传成功");
      await refresh();
    },
  });

  const uploadRequest =
    (side: "front" | "back"): UploadProps["customRequest"] =>
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

  // 过滤数据 - 使用防抖后的搜索文本
  const filteredData = data.filter((item) => {
    const matchSearch =
      !debouncedSearchText ||
      item.name?.includes(debouncedSearchText) ||
      item.phone?.includes(debouncedSearchText) ||
      item.employee_no?.includes(debouncedSearchText) ||
      item.job_no?.includes(debouncedSearchText);

    const matchStatus =
      statusFilter === undefined || item.status === statusFilter;

    return matchSearch && matchStatus;
  });

  // 获取列配置
  const tableColumns = getEmployeeColumns(columns, {
    onEdit: (record) => {
      setEditing(record);
      form.setFieldsValue({
        ...record,
        join_date: record.join_date ? dayjs(record.join_date) : undefined,
      });
      setOpen(true);
    },
    onDelete: (id) => deleteMutation.mutate(id),
    onIdCardManage: (record) => {
      setUploadTarget(record);
      setFrontFileList([]);
      setBackFileList([]);
      setUploadOpen(true);
    },
  });

  return (
    <Card
      title="员工管理"
      extra={
        <Space>
          <ColumnCustomizer
            columns={columns}
            onChange={(newColumns) => {
              setColumns(newColumns);
              saveColumnConfig("employee-table-columns", newColumns);
            }}
            storageKey="employee-table-columns"
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() =>
              resetColumnConfig(
                "employee-table-columns",
                defaultColumnConfig,
                setColumns,
              )
            }
            title="重置列配置"
          >
            重置列
          </Button>
          <Permission code="personnel:employee:batch-status">
            <Button
              disabled={selectedIds.length === 0}
              onClick={() => {
                confirmBatchAction(
                  selectedIds.length,
                  "设置为在职",
                  async () => {
                    await batchStatusMutation.mutateAsync({
                      ids: selectedIds,
                      status: 1,
                    });
                  },
                  "员工",
                );
              }}
            >
              批量在职
            </Button>
            <Button
              disabled={selectedIds.length === 0}
              onClick={() => {
                confirmBatchAction(
                  selectedIds.length,
                  "设置为离职",
                  async () => {
                    await batchStatusMutation.mutateAsync({
                      ids: selectedIds,
                      status: 0,
                    });
                  },
                  "员工",
                );
              }}
            >
              批量离职
            </Button>
          </Permission>
          <Permission code="personnel:employee:create">
            <Button
              type="primary"
              onClick={() => {
                setOpen(true);
                setEditing(null);
                form.resetFields();
              }}
              title="快捷键: Ctrl+N"
            >
              新增员工
            </Button>
          </Permission>
          <Permission code="personnel:employee:export">
            <Button
              icon={<DownloadOutlined />}
              loading={false}
              onClick={async () => {
                await handleExportWithProgress(
                  async () => {
                    const blob = await personnelApi.exportEmployees();
                    const url = window.URL.createObjectURL(new Blob([blob]));
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `员工列表_${dayjs().format("YYYYMMDD")}.xlsx`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  },
                  `员工列表_${dayjs().format("YYYYMMDD")}.xlsx`,
                );
              }}
            >
              导出
            </Button>
          </Permission>
          <Permission code="personnel:employee:import">
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              customRequest={async ({ file }) => {
                try {
                  message.loading({
                    content: "正在导入...",
                    key: "import",
                    duration: 0,
                  });
                  const res = await personnelApi.importEmployees(file as File);
                  if (res.failed > 0) {
                    Modal.warning({
                      title: `导入完成：成功 ${res.success} 条，失败 ${res.failed} 条`,
                      content: (
                        <div className="max-h-48 overflow-auto">
                          {res.errors.map((e: string, i: number) => (
                            <div key={i} className="text-red-500 text-xs">
                              {e}
                            </div>
                          ))}
                        </div>
                      ),
                    });
                    message.destroy("import");
                  } else {
                    message.success({
                      content: `导入成功 ${res.success} 条`,
                      key: "import",
                    });
                  }
                  queryClient.invalidateQueries({
                    queryKey: ["personnel-employees"],
                  });
                } catch {
                  message.error({
                    content: "导入失败，请检查文件格式",
                    key: "import",
                  });
                }
              }}
            >
              <Button icon={<UploadOutlined />}>批量导入</Button>
            </Upload>
          </Permission>
          <Permission code="personnel:employee:import">
            <Button
              onClick={async () => {
                const blob = await personnelApi.downloadImportTemplate();
                const url = window.URL.createObjectURL(new Blob([blob]));
                const a = document.createElement("a");
                a.href = url;
                a.download = "员工导入模板.xlsx";
                a.click();
                window.URL.revokeObjectURL(url);
              }}
            >
              下载模板
            </Button>
          </Permission>
        </Space>
      }
    >
      {/* 搜索和筛选 */}
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          ref={searchInputRef}
          placeholder="搜索姓名、手机号、员工编号、工号 (Ctrl+F)"
          allowClear
          style={{ width: 350 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={(value) => setSearchText(value)}
        />
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 120 }}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          options={[
            { label: "全部", value: undefined },
            { label: "在职", value: 1 },
            { label: "离职/禁用", value: 0 },
          ]}
        />
        {selectedIds.length > 0 && (
          <Tag color="blue">已选择 {selectedIds.length} 项</Tag>
        )}
      </Space>

      <GlobalLoading loading={isLoading}>
        <BaseTable<EmployeeRecord>
          rowKey="id"
          columns={tableColumns}
          dataSource={filteredData}
          loading={isLoading}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys: React.Key[]) => setSelectedIds(keys as string[]),
          }}
        />
      </GlobalLoading>
      <BaseModal
        open={open}
        title={editing ? "编辑员工" : "新增员工"}
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
              join_date: values.join_date
                ? values.join_date.format("YYYY-MM-DD")
                : undefined,
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
            <Select
              allowClear
              options={[
                { label: "男", value: 1 },
                { label: "女", value: 2 },
              ]}
            />
          </Form.Item>
          <Form.Item label="年龄" name="age">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="所属部门" name="department_id">
            <Select
              allowClear
              options={departments.map((item: any) => ({
                label: item.name,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="岗位" name="position_id">
            <Select
              allowClear
              options={positions.map((item: any) => ({
                label: item.name,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="入职日期" name="join_date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue={1}>
            <Select
              options={[
                { label: "在职", value: 1 },
                { label: "离职/禁用", value: 0 },
              ]}
            />
          </Form.Item>
        </Form>
      </BaseModal>
      <BaseModal
        open={uploadOpen}
        title={uploadTarget ? `证件管理 - ${uploadTarget.name}` : "证件管理"}
        onCancel={() => {
          setUploadOpen(false);
          setUploadTarget(null);
          setFrontFileList([]);
          setBackFileList([]);
          setPreviewUrls({ front: null, back: null });
        }}
        onOk={() => setUploadOpen(false)}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Title level={5}>身份证正面</Title>
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
                customRequest={uploadRequest("front")}
                onChange={({ fileList }) => setFrontFileList(fileList)}
              />
            </Permission>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Title level={5}>身份证反面</Title>
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
                customRequest={uploadRequest("back")}
                onChange={({ fileList }) => setBackFileList(fileList)}
              />
            </Permission>
          </div>
        </Space>
      </BaseModal>
    </Card>
  );
}
