import { Modal, List, Card, Tag, Space, Button } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  menuIds: string[];
  buttonIds: string[];
  color: string;
}

// 预设权限模板
export const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  {
    id: "super_admin",
    name: "超级管理员",
    description: "拥有系统所有权限，包括用户管理、角色管理、系统配置等",
    menuIds: [], // 将在运行时填充所有菜单ID
    buttonIds: [], // 将在运行时填充所有按钮ID
    color: "red",
  },
  {
    id: "dept_manager",
    name: "部门主管",
    description: "管理本部门员工、考勤、审批等日常事务",
    menuIds: [
      "seed-menu-personnel-employee",
      "seed-menu-attendance-schedule",
      "seed-menu-attendance-request",
      "seed-menu-approval-request",
      "seed-menu-system-message",
    ],
    buttonIds: [
      "seed-button-employee-list",
      "seed-button-employee-update",
      "seed-button-schedule-list",
      "seed-button-schedule-assign",
      "seed-button-attendance-request-list",
      "seed-button-approval-request-list",
      "seed-button-approval-request-approve",
      "seed-button-approval-request-reject",
      "seed-button-system-message-list",
    ],
    color: "blue",
  },
  {
    id: "employee",
    name: "普通员工",
    description: "查看个人考勤、提交申请、接收消息等基础功能",
    menuIds: [
      "seed-menu-attendance-request",
      "seed-menu-approval-request",
      "seed-menu-system-message",
    ],
    buttonIds: [
      "seed-button-attendance-request-list",
      "seed-button-approval-request-list",
      "seed-button-system-message-list",
      "seed-button-system-message-read",
    ],
    color: "green",
  },
  {
    id: "finance_staff",
    name: "财务专员",
    description: "管理报销、采购、收支记录等财务相关功能",
    menuIds: [
      "seed-menu-finance-expense-type",
      "seed-menu-finance-reimbursement",
      "seed-menu-finance-purchase",
      "seed-menu-finance-cash-record",
      "seed-menu-approval-request",
    ],
    buttonIds: [
      "seed-button-finance-reim-list",
      "seed-button-finance-reim-pay",
      "seed-button-finance-reim-export",
      "seed-button-finance-purchase-list",
      "seed-button-finance-cash-list",
      "seed-button-finance-cash-export",
      "seed-button-approval-request-list",
      "seed-button-approval-request-approve",
    ],
    color: "orange",
  },
  {
    id: "service_staff",
    name: "客服专员",
    description: "处理客服会话、查看质检结果、管理知识库",
    menuIds: [
      "seed-menu-service-session",
      "seed-menu-service-dashboard",
      "seed-menu-knowledge-article",
      "seed-menu-knowledge-category",
      "seed-menu-system-message",
    ],
    buttonIds: [
      "seed-button-service-session-list",
      "seed-button-service-dashboard-view",
      "seed-button-knowledge-article-list",
      "seed-button-knowledge-article-create",
      "seed-button-knowledge-category-list",
      "seed-button-system-message-list",
    ],
    color: "purple",
  },
  {
    id: "hr_staff",
    name: "人事专员",
    description: "管理员工档案、岗位、部门等人事相关功能",
    menuIds: [
      "seed-menu-personnel-department",
      "seed-menu-personnel-position",
      "seed-menu-personnel-employee",
      "seed-menu-system-message",
    ],
    buttonIds: [
      "seed-button-employee-list",
      "seed-button-employee-create",
      "seed-button-employee-update",
      "seed-button-employee-delete",
      "seed-button-employee-batch-status",
      "seed-button-employee-id-card-upload",
      "seed-button-employee-id-card-view",
      "seed-button-position-list",
      "seed-button-position-create",
      "seed-button-position-update",
      "seed-button-system-message-list",
    ],
    color: "cyan",
  },
];

interface PermissionTemplateModalProps {
  open: boolean;
  onCancel: () => void;
  onSelect: (template: PermissionTemplate) => void;
}

export const PermissionTemplateModal = ({
  open,
  onCancel,
  onSelect,
}: PermissionTemplateModalProps) => {
  return (
    <Modal
      open={open}
      title="选择权限模板"
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      <List
        grid={{ gutter: 16, column: 2 }}
        dataSource={PERMISSION_TEMPLATES}
        renderItem={(template) => (
          <List.Item>
            <Card
              hoverable
              onClick={() => {
                onSelect(template);
                onCancel();
              }}
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                <Space>
                  <Tag color={template.color}>{template.name}</Tag>
                  <CheckCircleOutlined style={{ color: "#52c41a" }} />
                </Space>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {template.description}
                </div>
                <Space size="small">
                  <Tag>{template.menuIds.length} 个菜单</Tag>
                  <Tag>{template.buttonIds.length} 个按钮</Tag>
                </Space>
              </Space>
            </Card>
          </List.Item>
        )}
      />
    </Modal>
  );
};
