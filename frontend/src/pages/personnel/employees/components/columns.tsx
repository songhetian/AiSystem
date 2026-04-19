import React from "react";
import { Button, Popconfirm, Space, Tag } from "antd";
import type { ProColumns } from "@ant-design/pro-components";
import { Permission } from "@/components/permission/Permission";
import type { ColumnConfig } from "@/components/table/ColumnCustomizer";

export interface EmployeeRecord {
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

/**
 * 默认列配置
 */
export const defaultColumnConfig: ColumnConfig[] = [
  { key: "name", title: "姓名", visible: true, fixed: true },
  { key: "phone", title: "手机号", visible: true },
  { key: "employee_no", title: "员工编号", visible: true },
  { key: "job_no", title: "工号", visible: true },
  { key: "email", title: "邮箱", visible: false },
  { key: "gender", title: "性别", visible: false },
  { key: "age", title: "年龄", visible: false },
  { key: "join_date", title: "入职日期", visible: false },
  { key: "status", title: "状态", visible: true },
  { key: "id_card", title: "证件", visible: true },
  { key: "actions", title: "操作", visible: true, fixed: true },
];

/**
 * 获取员工列表列配置
 */
export const getEmployeeColumns = (
  columnConfig: ColumnConfig[] | null,
  handlers: {
    onEdit: (record: EmployeeRecord) => void;
    onDelete: (id: string) => void;
    onIdCardManage: (record: EmployeeRecord) => void;
  },
): ProColumns<EmployeeRecord>[] => {
  const allColumns: ProColumns<EmployeeRecord>[] = [
    {
      key: "name",
      title: "姓名",
      dataIndex: "name",
      width: 120,
    },
    {
      key: "phone",
      title: "手机号",
      dataIndex: "phone",
      width: 130,
    },
    {
      key: "employee_no",
      title: "员工编号",
      dataIndex: "employee_no",
      width: 120,
    },
    {
      key: "job_no",
      title: "工号",
      dataIndex: "job_no",
      width: 100,
    },
    {
      key: "email",
      title: "邮箱",
      dataIndex: "email",
      width: 180,
    },
    {
      key: "gender",
      title: "性别",
      dataIndex: "gender",
      width: 80,
      render: (_: any, record: EmployeeRecord) => {
        if (record.gender === 1) return "男";
        if (record.gender === 2) return "女";
        return "-";
      },
    },
    {
      key: "age",
      title: "年龄",
      dataIndex: "age",
      width: 80,
    },
    {
      key: "join_date",
      title: "入职日期",
      dataIndex: "join_date",
      width: 120,
    },
    {
      key: "status",
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (_: any, record: EmployeeRecord) => (
        <Tag color={record.status === 1 ? "success" : "error"}>
          {record.status === 1 ? "在职" : "离职/禁用"}
        </Tag>
      ),
    },
    {
      key: "id_card",
      title: "证件",
      width: 100,
      render: (_, record) => (
        <Permission code="personnel:employee:id-card-view">
          <Button type="link" onClick={() => handlers.onIdCardManage(record)}>
            证件管理
          </Button>
        </Permission>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: 150,
      render: (_, record) => (
        <Space>
          <Permission code="personnel:employee:update">
            <Button type="link" onClick={() => handlers.onEdit(record)}>
              编辑
            </Button>
          </Permission>
          <Permission code="personnel:employee:delete">
            <Popconfirm
              title="确认删除该员工？"
              onConfirm={() => handlers.onDelete(record.id)}
            >
              <Button type="link" danger>
                删除
              </Button>
            </Popconfirm>
          </Permission>
        </Space>
      ),
    },
  ];

  // 如果有列配置，则过滤列
  if (columnConfig) {
    const visibleKeys = new Set(
      columnConfig.filter((c) => c.visible).map((c) => c.key),
    );
    return columnConfig
      .filter((c) => c.visible)
      .map((c) => allColumns.find((col) => col.key === c.key))
      .filter(Boolean) as ProColumns<EmployeeRecord>[];
  }

  return allColumns;
};
