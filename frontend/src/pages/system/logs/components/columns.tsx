import { Tag, Typography } from "antd";
import type { ProColumns } from "@ant-design/pro-components";
import { EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

const METHOD_COLORS: Record<string, string> = {
  POST: "blue",
  DELETE: "red",
  PUT: "orange",
  GET: "green",
  PATCH: "purple",
};

export const getOperationColumns = (
  onDetail: (record: any) => void,
): ProColumns<any>[] => [
  {
    title: "操作模块",
    dataIndex: "operation_module",
    width: 120,
    render: (t) => (
      <Text className="font-black text-slate-900">{t || "未知模块"}</Text>
    ),
  },
  {
    title: "操作内容",
    dataIndex: "operation_message",
    ellipsis: true,
    render: (t) => (
      <Text className="font-bold text-slate-800">
        {t || "未获取到操作详情"}
      </Text>
    ),
  },
  {
    title: "接口",
    dataIndex: "api_name",
    width: 140,
    ellipsis: true,
    render: (t) => (
      <Text className="font-bold text-slate-500 text-xs">{t || "-"}</Text>
    ),
  },
  {
    title: "方式",
    dataIndex: "request_method",
    width: 80,
    render: (m) => (
      <Tag
        color={METHOD_COLORS[m] || "default"}
        className="font-black border-2"
      >
        {m}
      </Tag>
    ),
  },
  {
    title: "操作人",
    dataIndex: "operator_name",
    width: 100,
    render: (t) => <Text className="font-bold text-slate-900">{t}</Text>,
  },
  {
    title: "所属平台",
    dataIndex: "platform_name",
    width: 110,
    render: (t) => <Text className="font-bold text-slate-600">{t || "-"}</Text>,
  },
  {
    title: "所属部门",
    dataIndex: "dept_name",
    width: 110,
    render: (t) => <Text className="text-slate-500">{t || "-"}</Text>,
  },
  {
    title: "请求IP",
    dataIndex: "request_ip",
    width: 130,
    render: (t) => (
      <Text className="font-mono text-xs text-slate-600">{t || "-"}</Text>
    ),
  },
  {
    title: "状态",
    dataIndex: "operation_status",
    width: 80,
    render: (s) => (
      <Tag color={s === 1 ? "success" : "error"} className="font-bold">
        {s === 1 ? "成功" : "失败"}
      </Tag>
    ),
  },
  {
    title: "操作时间",
    dataIndex: "create_time",
    width: 160,
    render: (t) => (
      <Text className="text-slate-500 font-mono text-xs">
        {dayjs(t).format("YYYY-MM-DD HH:mm:ss")}
      </Text>
    ),
  },
  {
    title: "操作",
    valueType: "option",
    width: 70,
    render: (_, record) => (
      <a
        onClick={() => onDetail(record)}
        className="font-black text-blue-600 flex items-center gap-1 hover:text-blue-800"
      >
        <EyeOutlined />
        详情
      </a>
    ),
  },
];

export const getLoginColumns = (
  onDetail: (record: any) => void,
): ProColumns<any>[] => [
  {
    title: "登录人",
    dataIndex: "operator_name",
    width: 100,
    render: (t) => <Text className="font-black text-slate-900">{t}</Text>,
  },
  {
    title: "登录账号",
    dataIndex: "username",
    width: 130,
    render: (t) => <Text className="font-bold text-slate-700">{t}</Text>,
  },
  {
    title: "登录IP",
    dataIndex: "login_ip",
    width: 130,
    render: (t) => (
      <Text className="font-mono text-xs text-slate-600">
        {t || "IP获取失败"}
      </Text>
    ),
  },
  {
    title: "状态",
    dataIndex: "login_status",
    width: 80,
    render: (s) => (
      <Tag color={s === 1 ? "success" : "error"} className="font-bold">
        {s === 1 ? "成功" : "失败"}
      </Tag>
    ),
  },
  {
    title: "结果描述",
    dataIndex: "login_message",
    ellipsis: true,
    render: (t) => <Text className="text-slate-700 text-xs">{t || "-"}</Text>,
  },
  {
    title: "所属平台",
    dataIndex: "platform_name",
    width: 110,
    render: (t) => <Text className="font-bold text-slate-600">{t || "-"}</Text>,
  },
  {
    title: "设备信息",
    dataIndex: "user_agent",
    ellipsis: true,
    render: (t) => (
      <Text className="text-slate-500 text-xs">{t || "未知设备"}</Text>
    ),
  },
  {
    title: "登录时间",
    dataIndex: "create_time",
    width: 160,
    render: (t) => (
      <Text className="text-slate-500 font-mono text-xs">
        {dayjs(t).format("YYYY-MM-DD HH:mm:ss")}
      </Text>
    ),
  },
  {
    title: "操作",
    valueType: "option",
    width: 70,
    render: (_, record) => (
      <a
        onClick={() => onDetail(record)}
        className="font-black text-blue-600 flex items-center gap-1 hover:text-blue-800"
      >
        <EyeOutlined />
        详情
      </a>
    ),
  },
];
