import { useState } from "react";
import { Modal, Table, Button, Space, Tag } from "antd";
import { QuestionCircleOutlined, KeyOutlined } from "@ant-design/icons";

interface HotkeyItem {
  key: string;
  action: string;
  description: string;
}

const defaultHotkeys: HotkeyItem[] = [
  { key: "Ctrl + A", action: "全选", description: "选择当前页面所有项" },
  { key: "Ctrl + S", action: "保存", description: "保存当前修改" },
  { key: "Ctrl + Z", action: "撤销", description: "撤销上一步操作" },
  { key: "Del", action: "删除", description: "删除选中项" },
  { key: "Ctrl + F", action: "搜索", description: "打开搜索框" },
  { key: "Esc", action: "取消", description: "关闭弹窗或取消操作" },
  { key: "Ctrl + Enter", action: "确认", description: "确认当前操作" },
  { key: "Ctrl + Shift + A", action: "批量分配", description: "批量分配权限" },
  { key: "Ctrl + Shift + R", action: "批量取消", description: "批量取消权限" },
  { key: "?", action: "帮助", description: "显示快捷键指南" },
];

export const HotkeyGuide = () => {
  const [visible, setVisible] = useState(false);

  const columns = [
    {
      title: "快捷键",
      dataIndex: "key",
      key: "key",
      render: (text: string) => (
        <Tag color="blue" icon={<KeyOutlined />}>
          {text}
        </Tag>
      ),
    },
    {
      title: "操作",
      dataIndex: "action",
      key: "action",
    },
    {
      title: "说明",
      dataIndex: "description",
      key: "description",
    },
  ];

  return (
    <>
      <Button
        type="text"
        icon={<QuestionCircleOutlined />}
        onClick={() => setVisible(true)}
      >
        快捷键
      </Button>

      <Modal
        open={visible}
        title={
          <Space>
            <KeyOutlined />
            快捷键指南
          </Space>
        }
        onCancel={() => setVisible(false)}
        footer={null}
        width={700}
      >
        <Table
          columns={columns}
          dataSource={defaultHotkeys}
          rowKey="key"
          pagination={false}
          size="small"
        />
        <div style={{ marginTop: 16, color: "#999", fontSize: 12 }}>
          提示：按 <Tag>?</Tag> 键可随时打开此指南
        </div>
      </Modal>
    </>
  );
};
