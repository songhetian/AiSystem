import { Descriptions, Divider, Drawer, Space, Tag, Typography } from "antd";
import { HistoryOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

interface LogDetailDrawerProps {
  open: boolean;
  record: any;
  type: "operation" | "login";
  onClose: () => void;
}

export function LogDetailDrawer({
  open,
  record,
  type,
  onClose,
}: LogDetailDrawerProps) {
  if (!record) return null;

  const METHOD_COLORS: Record<string, string> = {
    POST: "blue",
    DELETE: "red",
    PUT: "orange",
    GET: "green",
    PATCH: "purple",
  };

  return (
    <Drawer
      title={
        <Space>
          <HistoryOutlined className="text-slate-900" />
          <Text className="font-black text-lg text-slate-900">
            {type === "operation" ? "操作日志详情" : "登录日志详情"}
          </Text>
        </Space>
      }
      width={750}
      open={open}
      onClose={onClose}
      styles={{
        header: { borderBottom: "1px solid #e2e8f0", background: "#f8fafc" },
      }}
    >
      {/* 基础信息 */}
      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-5">
        <Descriptions
          title={
            <Text className="font-black text-slate-900 border-l-4 border-slate-900 pl-3">
              基础信息
            </Text>
          }
          column={2}
          size="middle"
        >
          <Descriptions.Item
            label={<Text className="font-black text-slate-500">操作人</Text>}
          >
            <Text className="font-black text-slate-900">
              {record.operator_name}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item
            label={<Text className="font-black text-slate-500">操作时间</Text>}
          >
            <Text className="font-mono text-slate-700">
              {dayjs(record.create_time).format("YYYY-MM-DD HH:mm:ss")}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item
            label={<Text className="font-black text-slate-500">所属平台</Text>}
          >
            <Text className="font-bold text-slate-900">
              {record.platform_name || "-"}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item
            label={<Text className="font-black text-slate-500">所属部门</Text>}
          >
            <Text className="font-bold text-slate-900">
              {record.dept_name || "-"}
            </Text>
          </Descriptions.Item>
          {record.shop_name && (
            <Descriptions.Item
              label={
                <Text className="font-black text-slate-500">所属店铺</Text>
              }
            >
              <Text className="font-bold text-slate-900">
                {record.shop_name}
              </Text>
            </Descriptions.Item>
          )}

          {type === "operation" && (
            <>
              <Descriptions.Item
                label={
                  <Text className="font-black text-slate-500">操作模块</Text>
                }
              >
                <Text className="font-bold text-slate-900">
                  {record.operation_module || "未知模块"}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Text className="font-black text-slate-500">请求方式</Text>
                }
              >
                <Tag
                  color={METHOD_COLORS[record.request_method] || "default"}
                  className="font-black border-2"
                >
                  {record.request_method}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Text className="font-black text-slate-500">执行状态</Text>
                }
              >
                <Tag
                  color={record.operation_status === 1 ? "success" : "error"}
                  className="font-bold"
                >
                  {record.operation_status === 1 ? "成功" : "失败"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Text className="font-black text-slate-500">请求IP</Text>
                }
                span={2}
              >
                <Text className="font-mono text-slate-700">
                  {record.request_ip || "IP获取失败"}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Text className="font-black text-slate-500">API路径</Text>
                }
                span={2}
              >
                <Text className="font-mono text-xs bg-white px-3 py-1.5 rounded border border-slate-200 block">
                  {record.api_path}
                </Text>
              </Descriptions.Item>
            </>
          )}

          {type === "login" && (
            <>
              <Descriptions.Item
                label={
                  <Text className="font-black text-slate-500">登录账号</Text>
                }
              >
                <Text className="font-bold text-slate-900">
                  {record.username}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Text className="font-black text-slate-500">登录状态</Text>
                }
              >
                <Tag
                  color={record.login_status === 1 ? "success" : "error"}
                  className="font-bold"
                >
                  {record.login_status === 1 ? "成功" : "失败"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Text className="font-black text-slate-500">登录IP</Text>
                }
              >
                <Text className="font-mono text-slate-700">
                  {record.login_ip || "IP获取失败"}
                </Text>
              </Descriptions.Item>
              {record.login_message && (
                <Descriptions.Item
                  label={
                    <Text className="font-black text-slate-500">结果描述</Text>
                  }
                  span={2}
                >
                  <Text className="text-slate-700">{record.login_message}</Text>
                </Descriptions.Item>
              )}
            </>
          )}
        </Descriptions>
      </div>

      {/* 操作内容 */}
      {type === "operation" && (
        <div className="bg-white p-5 rounded-xl border-2 border-slate-900 shadow-sm mb-5">
          <Text className="text-slate-900 font-black block mb-2 text-sm">
            操作内容：
          </Text>
          <Text className="text-slate-900 font-bold block bg-slate-100 p-4 rounded-lg border border-slate-200">
            {record.operation_message || "未获取到操作详情"}
          </Text>
        </div>
      )}

      {/* 字段变更对比（diff_content）*/}
      {type === "operation" && record.diff_content && (
        <>
          <Divider orientation="left">
            <Text className="font-black text-slate-900 uppercase tracking-widest text-xs">
              字段变更对比
            </Text>
          </Divider>
          <div className="rounded-xl overflow-hidden border border-slate-200 mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left px-4 py-2 font-black text-slate-600 w-1/4">
                    字段
                  </th>
                  <th className="text-left px-4 py-2 font-black text-red-500 w-[37.5%]">
                    变更前
                  </th>
                  <th className="text-left px-4 py-2 font-black text-green-600 w-[37.5%]">
                    变更后
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(
                  record.diff_content as Record<
                    string,
                    { before: any; after: any }
                  >,
                ).map(([field, diff]) => (
                  <tr
                    key={field}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2 font-bold text-slate-700">
                      {field}
                    </td>
                    <td className="px-4 py-2 font-mono text-red-600 bg-red-50">
                      {diff.before === null || diff.before === undefined ? (
                        <span className="text-slate-400 italic">空</span>
                      ) : (
                        String(diff.before)
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-green-700 bg-green-50">
                      {diff.after === null || diff.after === undefined ? (
                        <span className="text-slate-400 italic">空</span>
                      ) : (
                        String(diff.after)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 请求参数 */}
      {type === "operation" && (
        <>
          <Divider orientation="left">
            <Text className="font-black text-slate-900 uppercase tracking-widest text-xs">
              Request Payload
            </Text>
          </Divider>
          <div className="bg-slate-900 p-5 rounded-xl shadow-xl overflow-auto max-h-[300px] mb-5">
            <pre className="text-emerald-400 text-xs m-0 font-mono leading-relaxed">
              {JSON.stringify(record.request_params || {}, null, 2)}
            </pre>
          </div>
        </>
      )}

      {/* 响应摘要 */}
      {type === "operation" && record.response_summary && (
        <>
          <Divider orientation="left">
            <Text className="font-black text-slate-900 uppercase tracking-widest text-xs">
              Response Summary
            </Text>
          </Divider>
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-5">
            <pre className="text-xs text-slate-600 font-bold m-0 overflow-auto">
              {JSON.stringify(record.response_summary, null, 2)}
            </pre>
          </div>
        </>
      )}

      {/* User Agent */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <Text className="font-black text-slate-500 text-xs uppercase block mb-1">
          Browser / Device Info
        </Text>
        <Text className="text-slate-700 text-xs font-bold font-mono italic break-all">
          {record.user_agent || "未知设备"}
        </Text>
      </div>
    </Drawer>
  );
}
