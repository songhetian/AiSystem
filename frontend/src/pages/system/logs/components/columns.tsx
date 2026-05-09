import { Space, Typography } from "antd";
import type { ProColumns } from "@ant-design/pro-components";
import { EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { StatusTag } from '@/components/business';
import { Button } from '@/components/ui';

const { Text } = Typography;

const METHOD_COLORS: Record<string, string> = {
  POST: "#2563eb",
  DELETE: "#e11d48",
  PUT: "#d97706",
  GET: "#059669",
  PATCH: "#7c3aed",
};

export const getOperationColumns = (
  onDetail: (record: any) => void,
): ProColumns<any>[] => [
  {
    title: "操作模块",
    dataIndex: "operation_module",
    width: 120,
    render: (t) => (
      <Text style={{ fontWeight: 600, color: '#0f172a' }}>{t || "未知模块"}</Text>
    ),
  },
  {
    title: "操作内容",
    dataIndex: "operation_message",
    ellipsis: true,
    render: (t) => (
      <Text style={{ color: '#334155' }}>
        {t || "未获取到操作详情"}
      </Text>
    ),
  },
  {
    title: "方式",
    dataIndex: "request_method",
    width: 80,
    render: (m) => (
      <span style={{
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#fff',
        backgroundColor: METHOD_COLORS[m as string] || '#64748b'
      }}>
        {m}
      </span>
    ),
  },
  {
    title: "操作人",
    dataIndex: "operator_name",
    width: 120,
    render: (t) => <Text style={{ fontWeight: 500, color: '#0f172a' }}>{t}</Text>,
  },
  {
    title: "请求IP",
    dataIndex: "request_ip",
    width: 140,
    render: (t) => (
      <Text style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>{t || "-"}</Text>
    ),
  },
  {
    title: "状态",
    dataIndex: "operation_status",
    width: 100,
    render: (s) => (
      <StatusTag
        status={s === 1 ? "success" : "error"}
        text={s === 1 ? "成功" : "失败"}
      />
    ),
  },
  {
    title: "操作时间",
    dataIndex: "create_time",
    width: 170,
    render: (t) => (
      <Text style={{ color: '#64748b', fontSize: '12px' }}>
        {dayjs(t).format("YYYY-MM-DD HH:mm:ss")}
      </Text>
    ),
  },
  {
    title: "操作",
    valueType: "option",
    width: 80,
    fixed: 'right',
    render: (_, record) => (
      <Button
        type="link"
        size="small"
        icon={<EyeOutlined />}
        onClick={() => onDetail(record)}
      >
        详情
      </Button>
    ),
  },
];

export const getLoginColumns = (
  onDetail: (record: any) => void,
): ProColumns<any>[] => [
  {
    title: "登录人",
    dataIndex: "operator_name",
    width: 120,
    render: (t) => <Text style={{ fontWeight: 600, color: '#0f172a' }}>{t}</Text>,
  },
  {
    title: "登录账号",
    dataIndex: "username",
    width: 140,
    render: (t) => <Text style={{ color: '#334155' }}>{t}</Text>,
  },
  {
    title: "登录IP",
    dataIndex: "login_ip",
    width: 140,
    render: (t) => (
      <Text style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
        {t || "IP获取失败"}
      </Text>
    ),
  },
  {
    title: "状态",
    dataIndex: "login_status",
    width: 100,
    render: (s) => (
      <StatusTag
        status={s === 1 ? "success" : "error"}
        text={s === 1 ? "成功" : "失败"}
      />
    ),
  },
  {
    title: "设备信息",
    dataIndex: "user_agent",
    ellipsis: true,
    render: (t) => (
      <Text style={{ color: '#64748b', fontSize: '12px' }}>{t || "未知设备"}</Text>
    ),
  },
  {
    title: "登录时间",
    dataIndex: "create_time",
    width: 170,
    render: (t) => (
      <Text style={{ color: '#64748b', fontSize: '12px' }}>
        {dayjs(t).format("YYYY-MM-DD HH:mm:ss")}
      </Text>
    ),
  },
  {
    title: "操作",
    valueType: "option",
    width: 80,
    fixed: 'right',
    render: (_, record) => (
      <Button
        type="link"
        size="small"
        icon={<EyeOutlined />}
        onClick={() => onDetail(record)}
      >
        详情
      </Button>
    ),
  },
];

