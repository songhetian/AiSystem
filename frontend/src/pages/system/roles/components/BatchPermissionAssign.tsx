import { useState } from "react";
import { Modal, Table, Space, Button, message, Tag } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";

interface Role {
  id: string;
  role_name: string;
  role_code: string;
}

interface Permission {
  id: string;
  name: string;
  code: string;
  module: string;
}

interface BatchPermissionAssignProps {
  open: boolean;
  onClose: () => void;
  roles: Role[];
  permissions: Permission[];
  onSubmit: (
    roleIds: string[],
    permissionIds: string[],
    action: "assign" | "revoke",
  ) => Promise<void>;
}

export function BatchPermissionAssign({
  open,
  onClose,
  roles,
  permissions,
  onSubmit,
}: BatchPermissionAssignProps) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>(
    [],
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (action: "assign" | "revoke") => {
    if (selectedRoleIds.length === 0) {
      message.warning("请选择至少一个角色");
      return;
    }
    if (selectedPermissionIds.length === 0) {
      message.warning("请选择至少一个权限");
      return;
    }

    Modal.confirm({
      title: `确认${action === "assign" ? "分配" : "取消"}权限`,
      content: `将为 ${selectedRoleIds.length} 个角色${action === "assign" ? "分配" : "取消"} ${selectedPermissionIds.length} 项权限`,
      onOk: async () => {
        setLoading(true);
        try {
          await onSubmit(selectedRoleIds, selectedPermissionIds, action);
          message.success(`${action === "assign" ? "分配" : "取消"}成功`);
          onClose();
        } catch (error) {
          message.error(`${action === "assign" ? "分配" : "取消"}失败`);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const roleColumns = [
    {
      title: "角色名称",
      dataIndex: "role_name",
      key: "role_name",
    },
    {
      title: "角色编码",
      dataIndex: "role_code",
      key: "role_code",
      render: (code: string) => <Tag>{code}</Tag>,
    },
  ];

  const permissionColumns = [
    {
      title: "权限名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "权限编码",
      dataIndex: "code",
      key: "code",
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: "所属模块",
      dataIndex: "module",
      key: "module",
    },
  ];

  return (
    <Modal
      title="批量权限分配"
      open={open}
      onCancel={onClose}
      width={1000}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            danger
            icon={<CloseOutlined />}
            onClick={() => handleSubmit("revoke")}
            loading={loading}
          >
            批量取消
          </Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => handleSubmit("assign")}
            loading={loading}
          >
            批量分配
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <div>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>
            选择角色（已选 {selectedRoleIds.length} 个）
          </div>
          <Table
            rowSelection={{
              selectedRowKeys: selectedRoleIds,
              onChange: (keys) => setSelectedRoleIds(keys as string[]),
            }}
            columns={roleColumns}
            dataSource={roles}
            rowKey="id"
            pagination={{ pageSize: 5 }}
            size="small"
          />
        </div>

        <div>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>
            选择权限（已选 {selectedPermissionIds.length} 项）
          </div>
          <Table
            rowSelection={{
              selectedRowKeys: selectedPermissionIds,
              onChange: (keys) => setSelectedPermissionIds(keys as string[]),
            }}
            columns={permissionColumns}
            dataSource={permissions}
            rowKey="id"
            pagination={{ pageSize: 5 }}
            size="small"
          />
        </div>
      </Space>
    </Modal>
  );
}
