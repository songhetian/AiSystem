import { Button, DatePicker, Form, Input, Radio, Select, Space } from "antd";
import {
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { RadioChangeEvent } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

interface LogFilterBarProps {
  form: any;
  type: "operation" | "login";
  platforms: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  onSearch: () => void;
  onReset: () => void;
  onExport: () => void;
}

const OPERATION_MODULES = [
  "用户管理",
  "角色管理",
  "菜单管理",
  "权限管理",
  "部门管理",
  "平台管理",
  "店铺管理",
  "考勤管理",
  "排班管理",
  "人员管理",
  "知识库",
  "考试管理",
  "财务管理",
  "审批管理",
  "客服管理",
  "系统设置",
  "数据映射",
  "消息管理",
];

export function LogFilterBar({
  form,
  type,
  platforms,
  departments,
  onSearch,
  onReset,
  onExport,
}: LogFilterBarProps) {
  const handleQuickDate = (value: string) => {
    const now = dayjs();
    const rangeMap: Record<string, [dayjs.Dayjs, dayjs.Dayjs]> = {
      today: [now.startOf("day"), now.endOf("day")],
      yesterday: [
        now.subtract(1, "day").startOf("day"),
        now.subtract(1, "day").endOf("day"),
      ],
      "7days": [now.subtract(6, "days").startOf("day"), now.endOf("day")],
      "30days": [now.subtract(29, "days").startOf("day"), now.endOf("day")],
    };
    if (rangeMap[value]) {
      form.setFieldValue("date", rangeMap[value]);
    }
  };

  return (
    <Form
      form={form}
      layout="inline"
      className="flex flex-wrap items-center w-full gap-y-3"
    >
      {/* 关键词搜索 */}
      <Form.Item name="keyword" className="flex-grow min-w-[200px] mb-0">
        <Input
          prefix={<SearchOutlined className="text-slate-400" />}
          placeholder={
            type === "operation" ? "搜索操作人/IP/描述" : "搜索登录人/账号/IP"
          }
          className="h-[44px] font-bold"
          onPressEnter={onSearch}
        />
      </Form.Item>

      {/* 平台筛选 */}
      <Form.Item name="platform_id" className="w-[160px] mb-0">
        <Select
          placeholder="所属平台"
          className="h-[44px]"
          allowClear
          options={platforms.map((p) => ({ label: p.name, value: p.id }))}
        />
      </Form.Item>

      {/* 操作日志专属：部门、模块筛选 */}
      {type === "operation" && (
        <>
          <Form.Item name="dept_id" className="w-[160px] mb-0">
            <Select
              placeholder="所属部门"
              className="h-[44px]"
              allowClear
              options={departments.map((d) => ({ label: d.name, value: d.id }))}
            />
          </Form.Item>
          <Form.Item name="module" className="w-[160px] mb-0">
            <Select
              placeholder="操作模块"
              className="h-[44px]"
              allowClear
              showSearch
              optionFilterProp="label"
              options={OPERATION_MODULES.map((m) => ({ label: m, value: m }))}
            />
          </Form.Item>
        </>
      )}

      {/* 登录日志专属：设备信息筛选 */}
      {type === "login" && (
        <Form.Item name="user_agent" className="w-[180px] mb-0">
          <Input placeholder="设备信息（模糊匹配）" className="h-[44px]" />
        </Form.Item>
      )}

      {/* 状态筛选 */}
      <Form.Item name="status" className="w-[130px] mb-0" initialValue="all">
        <Select
          className="h-[44px]"
          options={[
            { label: "全部状态", value: "all" },
            { label: "成功", value: 1 },
            { label: "失败", value: 0 },
          ]}
        />
      </Form.Item>

      {/* 快捷日期 + 自定义日期 */}
      <div className="flex items-center mb-0">
        <Form.Item name="quickDate" className="mb-0">
          <Radio.Group
            onChange={(e: RadioChangeEvent) => handleQuickDate(e.target.value)}
          >
            {["today", "7days", "30days"].map((v, i) => (
              <Radio.Button
                key={v}
                value={v}
                className="h-[44px] leading-[42px] border-slate-400 font-bold px-3"
              >
                {["今天", "近7天", "近30天"][i]}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>
        <Form.Item name="date" className="mb-0">
          <RangePicker
            showTime
            className="h-[44px] rounded-l-none border-l-0"
            format="YYYY-MM-DD HH:mm"
          />
        </Form.Item>
      </div>

      {/* 操作按钮 */}
      <Space size={8} className="ml-auto mb-0">
        <Button
          icon={<ReloadOutlined />}
          className="h-[44px] px-5 border-slate-400 font-bold text-slate-700"
          onClick={onReset}
        >
          重置
        </Button>
        <Button
          icon={<DownloadOutlined />}
          className="h-[44px] px-5 border-slate-900 font-bold text-slate-900 border-2"
          onClick={onExport}
        >
          导出报表
        </Button>
        <Button
          type="primary"
          className="h-[44px] px-8 font-bold bg-slate-900 border-none hover:!bg-slate-800"
          onClick={onSearch}
        >
          立即筛选
        </Button>
      </Space>
    </Form>
  );
}
