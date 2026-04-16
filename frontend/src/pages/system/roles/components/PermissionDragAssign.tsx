import { useState, useEffect } from 'react';
import { Card, Row, Col, Empty, Tag, Space, Button, message } from 'antd';
import { SwapOutlined, SaveOutlined, ReloadOutlined, UndoOutlined } from '@ant-design/icons';
import { BaseDrag } from '@/components/common/BaseDrag';
import { permissionControlApi, Permission } from '@/api/permission-control';
import { useHotkeys } from '@/hooks/useHotkeys';
import { HotkeyGuide } from '@/components/common/HotkeyGuide';
import { StateMemoryManager } from '@/hooks/useLocalStorage';
import './PermissionDragAssign.less';

interface PermissionDragAssignProps {
  roleId: string;
  onSave: (permissionIds: string[]) => Promise<void>;
}

export function PermissionDragAssign({
  roleId,
  onSave,
}: PermissionDragAssignProps) {
  const [availablePermissions, setAvailablePermissions] = useState<
    Permission[]
  >([]);
  const [assignedPermissions, setAssignedPermissions] = useState<Permission[]>(
    [],
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Permission[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 从API加载权限数据
  useEffect(() => {
    loadPermissions();
  }, [roleId]);

  // 恢复上次的操作状态
  useEffect(() => {
    const savedState = StateMemoryManager.load<{
      assigned: Permission[];
      available: Permission[];
    }>(`permission_drag_${roleId}`, 5 * 60 * 1000); // 5分钟有效期

    if (savedState) {
      setAssignedPermissions(savedState.assigned);
      setAvailablePermissions(savedState.available);
    }
  }, [roleId]);

  // 保存操作状态
  useEffect(() => {
    if (hasChanges) {
      StateMemoryManager.save(`permission_drag_${roleId}`, {
        assigned: assignedPermissions,
        available: availablePermissions,
      });
    }
  }, [assignedPermissions, availablePermissions, hasChanges, roleId]);

  const loadPermissions = async () => {
    try {
      const [available, assigned] = await Promise.all([
        permissionControlApi.getAvailablePermissions(roleId),
        permissionControlApi.getAssignedPermissions(roleId),
      ]);
      setAvailablePermissions(available);
      setAssignedPermissions(assigned);
      setHasChanges(false);
      // 初始化历史记录
      setHistory([assigned]);
      setHistoryIndex(0);
    } catch (error) {
      message.error('加载权限数据失败');
    }
  };
    // const assigned = await permissionApi.getAssignedPermissions(roleId);
    // setAvailablePermissions(available);
    // setAssignedPermissions(assigned);
  };

  const handleDragToAssigned = (permission: Permission) => {
    const newAssigned = [...assignedPermissions, permission];
    const newAvailable = availablePermissions.filter((p) => p.id !== permission.id);

    setAvailablePermissions(newAvailable);
    setAssignedPermissions(newAssigned);
    setHasChanges(true);

    // 添加到历史记录
    addToHistory(newAssigned);
  };

  const handleDragToAvailable = (permission: Permission) => {
    const newAssigned = assignedPermissions.filter((p) => p.id !== permission.id);
    const newAvailable = [...availablePermissions, permission];

    setAssignedPermissions(newAssigned);
    setAvailablePermissions(newAvailable);
    setHasChanges(true);

    // 添加到历史记录
    addToHistory(newAssigned);
  };

  // 添加到历史记录
  const addToHistory = (newAssigned: Permission[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAssigned);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // 撤销
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousState = history[newIndex];
      setAssignedPermissions(previousState);
      setHistoryIndex(newIndex);
      setHasChanges(true);
      message.success('已撤销');
    }
  };

  // 重做
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = history[newIndex];
      setAssignedPermissions(nextState);
      setHistoryIndex(newIndex);
      setHasChanges(true);
      message.success('已重做');
    }
  };

  // 快捷键配置
  useHotkeys([
    {
      key: 's',
      ctrl: true,
      description: '保存',
      handler: () => {
        if (hasChanges && !loading) {
          handleSave();
        }
      },
    },
    {
      key: 'z',
      ctrl: true,
      description: '撤销',
      handler: handleUndo,
    },
    {
      key: 'y',
      ctrl: true,
      description: '重做',
      handler: handleRedo,
    },
    {
      key: 'r',
      ctrl: true,
      description: '重置',
      handler: () => {
        if (hasChanges) {
          handleReset();
        }
      },
    },
  ], true);

  const handleSave = async () => {
    setLoading(true);
    try {
      const permissionIds = assignedPermissions.map((p) => p.id);
      await onSave(permissionIds);
      message.success("权限分配成功");
      setHasChanges(false);
    } catch (error) {
      message.error("权限分配失败");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    loadPermissions();
    setHasChanges(false);
  };

  // 按模块分组
  const groupByModule = (permissions: Permission[]) => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach((p) => {
      if (!groups[p.module]) {
        groups[p.module] = [];
      }
      groups[p.module].push(p);
    });
    return groups;
  };

  const availableGroups = groupByModule(availablePermissions);
  const assignedGroups = groupByModule(assignedPermissions);

  return (
    <div className="permission-drag-assign">
      <div className="drag-header">
        <Space>
          <SwapOutlined style={{ fontSize: 20, color: "#1890ff" }} />
          <span style={{ fontSize: 16, fontWeight: 600 }}>拖拽分配权限</span>
          {hasChanges && <Tag color="warning">未保存</Tag>}
        </Space>
        <Space>
          <HotkeyGuide />
          <Button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            icon={<UndoOutlined />}
          >
            撤销 (Ctrl+Z)
          </Button>
          <Button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
          >
            重做 (Ctrl+Y)
          </Button>
          <Button onClick={handleReset} disabled={!hasChanges}>
            <ReloadOutlined /> 重置 (Ctrl+R)
          </Button>
          <Button
            type="primary"
            onClick={handleSave}
            loading={loading}
            disabled={!hasChanges}
          >
            <SaveOutlined /> 保存 (Ctrl+S)
          </Button>
        </Space>
      </div>

      <Row gutter={16} className="drag-container">
        <Col span={12}>
          <Card
            title="可分配权限"
            className="permission-list-card"
            extra={<Tag color="blue">{availablePermissions.length} 项</Tag>}
          >
            {Object.keys(availableGroups).length === 0 ? (
              <Empty description="暂无可分配权限" />
            ) : (
              Object.entries(availableGroups).map(([module, permissions]) => (
                <div key={module} className="permission-module">
                  <div className="module-title">{module}</div>
                  <BaseDrag
                    items={permissions}
                    getItemId={(p) => p.id}
                    onDragEnd={() => {}}
                    renderItem={(permission) => (
                      <div
                        className="permission-item"
                        onClick={() => handleDragToAssigned(permission)}
                      >
                        <span className="permission-name">
                          {permission.name}
                        </span>
                        <Tag
                          color={permission.type === "menu" ? "blue" : "green"}
                        >
                          {permission.type === "menu" ? "菜单" : "按钮"}
                        </Tag>
                      </div>
                    )}
                    direction="vertical"
                  />
                </div>
              ))
            )}
          </Card>
        </Col>

        <Col span={12}>
          <Card
            title="已分配权限"
            className="permission-list-card"
            extra={<Tag color="green">{assignedPermissions.length} 项</Tag>}
          >
            {Object.keys(assignedGroups).length === 0 ? (
              <Empty description="暂无已分配权限" />
            ) : (
              Object.entries(assignedGroups).map(([module, permissions]) => (
                <div key={module} className="permission-module">
                  <div className="module-title">{module}</div>
                  <BaseDrag
                    items={permissions}
                    getItemId={(p) => p.id}
                    onDragEnd={() => {}}
                    renderItem={(permission) => (
                      <div
                        className="permission-item assigned"
                        onClick={() => handleDragToAvailable(permission)}
                      >
                        <span className="permission-name">
                          {permission.name}
                        </span>
                        <Tag
                          color={permission.type === "menu" ? "blue" : "green"}
                        >
                          {permission.type === "menu" ? "菜单" : "按钮"}
                        </Tag>
                      </div>
                    )}
                    direction="vertical"
                  />
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>

      <div className="drag-tips">
        <Space direction="vertical" size="small">
          <div>💡 提示：</div>
          <div>• 点击权限项可在两栏之间移动</div>
          <div>• 支持拖拽调整已分配权限的顺序</div>
          <div>• 修改后记得点击"保存"按钮</div>
        </Space>
      </div>
    </div>
  );
}
