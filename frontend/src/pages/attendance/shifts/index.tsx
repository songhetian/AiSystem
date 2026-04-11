import React, { useRef, useState } from "react";
import { Button, Form, message, Space, Tag, Popconfirm } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ProColumns } from "@ant-design/pro-components";
import BaseTable from "@/components/table/BaseTable";
import BaseModal from "@/components/common/BaseModal";
import BaseForm from "@/components/form/BaseForm";
import ActionGroup from "@/components/common/ActionGroup";
import StatusTag from "@/components/common/StatusTag";
import Permission from "@/components/permission/Permission";
import { attendanceApi } from "@/api/attendance";
import type { AttendanceShiftPayload } from "@/api/attendance";

const AttendanceShifts: React.FC = () => {
  const tableRef = useRef<any>();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<any>(null);
  const [form] = Form.useForm();

  const columns: ProColumns<object>[] = [
    {
      title: "班次名称",
      dataIndex: "name",
      key: "name",
      className: "font-bold text-slate-900",
    },
    {
      title: "上班时间",
      dataIndex: "on_duty_time",
      key: "on_duty_time",
      className: "text-slate-600",
    },
    {
      title: "下班时间",
      dataIndex: "off_duty_time",
      key: "off_duty_time",
      className: "text-slate-600",
    },
    {
      title: "迟到阈值(分)",
      dataIndex: "late_threshold",
      key: "late_threshold",
      render: (val: unknown) => (
        <span className="text-slate-600">{val as number} 分钟</span>
      ),
    },
    {
      title: "早退阈值(分)",
      dataIndex: "early_threshold",
      key: "early_threshold",
      render: (val: unknown) => (
        <span className="text-slate-600">{val as number} 分钟</span>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: unknown) => (
        <StatusTag
          status={(status as number) === 1 ? "enabled" : "disabled"}
          text={(status as number) === 1 ? "启用" : "禁用"}
        />
      ),
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      width: 150,
      render: (_: any, record: any) => (
        <ActionGroup
          actions={[
            {
              key: "edit",
              label: "编辑",
              permission: "attendance:shifts:update",
              onClick: () => handleEdit(record),
            },
            {
              key: "delete",
              label: "删除",
              permission: "attendance:shifts:delete",
              danger: true,
              confirm: {
                title: "确认删除该班次吗？",
                onConfirm: () => handleDelete(record.id),
              },
            },
          ]}
        />
      ),
    },
  ];

  const handleAdd = () => {
    setCurrentRow(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setCurrentRow(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await attendanceApi.deleteShift(id);
      message.success("删除成功");
      tableRef.current?.reload();
    } catch (error) {
      message.error("删除失败");
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (currentRow) {
        await attendanceApi.updateShift(currentRow.id, values);
        message.success("更新成功");
      } else {
        await attendanceApi.createShift(values);
        message.success("创建成功");
      }
      setModalVisible(false);
      tableRef.current?.reload();
    } catch (error) {
      // Form validation error handled by BaseForm
    }
  };

  return (
    <div className="p-4">
      <BaseTable
        ref={tableRef}
        columns={columns}
        request={async (params) => {
          const res = await attendanceApi.listShifts();
          return {
            data: res,
            success: true,
          };
        }}
        toolBarRender={() => [
          <Permission key="add" code="attendance:shifts:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增班次
            </Button>
          </Permission>,
        ]}
      />

      <BaseModal
        title={currentRow ? "编辑班次" : "新增班次"}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <BaseForm
          form={form}
          layout="vertical"
          items={[
            {
              name: "name",
              label: "班次名称",
              type: "input",
              required: true,
              placeholder: "请输入班次名称",
            },
            {
              name: "on_duty_time",
              label: "上班时间",
              type: "time",
              required: true,
              props: { format: "HH:mm" },
            },
            {
              name: "off_duty_time",
              label: "下班时间",
              type: "time",
              required: true,
              props: { format: "HH:mm" },
            },
            {
              name: "late_threshold",
              label: "迟到阈值 (分钟)",
              type: "number",
              defaultValue: 0,
              props: { min: 0, className: "w-full" },
            },
            {
              name: "early_threshold",
              label: "早退阈值 (分钟)",
              type: "number",
              defaultValue: 0,
              props: { min: 0, className: "w-full" },
            },
            {
              name: "absenteeism_threshold",
              label: "旷工阈值 (分钟)",
              type: "number",
              defaultValue: 0,
              props: { min: 0, className: "w-full" },
            },
            {
              name: "status",
              label: "状态",
              type: "select",
              options: [
                { label: "启用", value: 1 },
                { label: "禁用", value: 0 },
              ],
              defaultValue: 1,
            },
          ]}
        />
      </BaseModal>
    </div>
  );
};

export default AttendanceShifts;
