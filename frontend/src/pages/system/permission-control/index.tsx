import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Space,
  Button,
  Tag,
  Switch,
  message,
  Modal,
  Select,
  Input,
  Divider,
  AutoComplete,
  Badge,
  Descriptions,
  Alert,
} from "antd";
import {
  SettingOutlined,
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
  UndoOutlined,
  DeleteOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { permissionControlApi } from "@/api/permission-control";
import { permissionCleanupApi } from "@/api/permission-cleanup";
import { HotkeyGuide } from "@/components/common/HotkeyGuide";
import { TutorialGuide, TUTORIALS } from "@/components/common/TutorialGuide";
import { useHotkeys } from "@/hooks/useHotkeys";
import { usePreferences } from "@/hooks/usePreferences";
import "./index.less";

const { Search } = Input;

export default function PermissionControlPage() {
  const queryClient = useQueryClient();
  const {
    preferences,
    updatePreferences,
    addSearchHistory,
    saveFilters,
    getFilters,
  } = usePreferences();

  // 从偏好设置中恢复筛选条件
  const savedFilters = getFilters("permission-control") || {};
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>(
    savedFilters.resourceType,
  );
  const [needControlFilter, setNeedControlFilter] = useState<number>(
    savedFilters.needControl,
  );
  const [searchText, setSearchText] = useState("");
  const [cleanupModalVisible, setCleanupModalVisible] = useState(false);

  // 检测冗余配置
  const { data: detectionResult, refetch: refetchDetection } = useQuery({
    queryKey: ["permission-cleanup-detection"],
    queryFn: permissionCleanupApi.detect,
    enabled: false, // 手动触发
  });

  // 执行清理
  const cleanupMutation = useMutation({
    mutationFn: permissionCleanupApi.execute,
    onSuccess: (result) => {
      message.success(result.message);
      setCleanupModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ["permission-control-list"] });
      refetchDetection();
    },
    onError: () => {
      message.error("清理失败");
    },
  });

  // 获取全局权限控制开关
  const { data: globalConfig } = useQuery({
    queryKey: ["system-config", "global_permission_control"],
    queryFn: () =>
      permissionControlApi.getSystemConfig("global_permission_control"),
  });

  // 获取权限控制配置列表
  const { data: configList = [], isLoading } = useQuery({
    queryKey: [
      "permission-control-list",
      resourceTypeFilter,
      needControlFilter,
    ],
    queryFn: () =>
      permissionControlApi.getPermissionControlList({
        resourceType: resourceTypeFilter,
        needControl: needControlFilter,
      }),
  });

  // 更新全局开关
  const updateGlobalConfigMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      permissionControlApi.updateSystemConfig({
        configKey: "global_permission_control",
        configValue: enabled ? "1" : "0",
        configType: "boolean",
        description: "全局权限控制开关（1开启 0关闭）",
      }),
    onSuccess: () => {
      message.success("全局权限控制开关已更新");
      queryClient.invalidateQueries({ queryKey: ["system-config"] });
    },
  });

  // 批量更新权限控制
  const batchUpdateMutation = useMutation({
    mutationFn: (needControl: number) => {
      const configs = selectedRowKeys.map((id) => {
        const config = configList.find((c: any) => c.id === id);
        return {
          resourceType: config.resourceType,
          resourceId: config.resourceId,
          resourceName: config.resourceName,
          needControl,
          exceptionRoles: config.exceptionRoles || [],
        };
      });
      return permissionControlApi.batchUpdatePermissionControl(configs);
    },
    onSuccess: () => {
      message.success("批量更新成功");
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: ["permission-control-list"] });
    },
  });

  // 切换全局开关
  const handleGlobalSwitchChange = (checked: boolean) => {
    Modal.confirm({
      title: `确认${checked ? "开启" : "关闭"}全局权限控制？`,
      content: checked
        ? "开启后，所有功能默认需要权限控制"
        : "关闭后，所有用户将拥有全部功能权限，请谨慎操作！",
      onOk: () => updateGlobalConfigMutation.mutate(checked),
    });
  };

  // 批量设置
  const handleBatchUpdate = (needControl: number) => {
    if (selectedRowKeys.length === 0) {
      message.warning("请选择至少一项配置");
      return;
    }

    Modal.confirm({
      title: `确认批量${needControl === 1 ? "启用" : "禁用"}权限控制？`,
      content: `将为 ${selectedRowKeys.length} 项配置${needControl === 1 ? "启用" : "禁用"}权限控制`,
      onOk: () => batchUpdateMutation.mutate(needControl),
    });
  };

  // 保存筛选条件
  useEffect(() => {
    saveFilters("permission-control", {
      resourceType: resourceTypeFilter,
      needControl: needControlFilter,
    });
  }, [resourceTypeFilter, needControlFilter]);

  // 快捷键配置
  useHotkeys([
    {
      key: "a",
      ctrl: true,
      callback: () => {
        const allKeys = filteredData.map((item: any) => item.id);
        setSelectedRowKeys(allKeys);
        message.success(`已选择 ${allKeys.length} 项`);
      },
      description: "全选",
    },
    {
      key: "s",
      ctrl: true,
      callback: () => {
        if (selectedRowKeys.length > 0) {
          handleBatchUpdate(1);
        }
      },
      description: "批量启用",
    },
    {
      key: "f",
      ctrl: true,
      callback: () => {
        document
          .querySelector<HTMLInputElement>(".ant-input-search input")
          ?.focus();
      },
      description: "聚焦搜索框",
    },
  ]);

  // 过滤数据
  const filteredData = configList.filter((item: any) => {
    if (searchText) {
      return (
        item.resourceName?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.resourceId?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    return true;
  });

  const columns = [
    {
      title: "资源类型",
      dataIndex: "resourceType",
      key: "resourceType",
      width: 120,
      render: (type: string) => {
        const typeMap: Record<string, { label: string; color: string }> = {
          module: { label: "模块", color: "blue" },
          menu: { label: "菜单", color: "green" },
          button: { label: "按钮", color: "orange" },
        };
        const config = typeMap[type] || { label: type, color: "default" };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "资源名称",
      dataIndex: "resourceName",
      key: "resourceName",
    },
    {
      title: "资源ID",
      dataIndex: "resourceId",
      key: "resourceId",
      width: 200,
    },
    {
      title: "权限控制",
      dataIndex: "needControl",
      key: "needControl",
      width: 120,
      render: (needControl: number, record: any) => (
        <Switch
          checked={needControl === 1}
          onChange={(checked) => {
            permissionControlApi
              .updatePermissionControl({
                resourceType: record.resourceType,
                resourceId: record.resourceId,
                resourceName: record.resourceName,
                needControl: checked ? 1 : 0,
                exceptionRoles: record.exceptionRoles,
              })
              .then(() => {
                message.success("更新成功");
                queryClient.invalidateQueries({
                  queryKey: ["permission-control-list"],
                });
              });
          }}
        />
      ),
    },
    {
      title: "例外角色",
      dataIndex: "exceptionRoles",
      key: "exceptionRoles",
      width: 150,
      render: (roles: string[]) => {
        if (!roles || roles.length === 0) {
          return <span style={{ color: "#999" }}>无</span>;
        }
        return (
          <Space size={4} wrap>
            {roles.map((role) => (
              <Tag key={role} color="purple">
                {role}
              </Tag>
            ))}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="permission-control-page">
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>权限控制配置中心</span>
          </Space>
        }
        extra={
          <Space>
            <TutorialGuide
              tutorialKey={TUTORIALS.permissionControl.key}
              title={TUTORIALS.permissionControl.title}
              steps={TUTORIALS.permissionControl.steps}
            />
            <HotkeyGuide />
            <Badge count={detectionResult?.totalIssues || 0}>
              <Button
                icon={<DeleteOutlined />}
                onClick={() => {
                  refetchDetection();
                  setCleanupModalVisible(true);
                }}
              >
                清理冗余配置
              </Button>
            </Badge>
            <span>全局权限控制：</span>
            <Switch
              checked={globalConfig?.value === true}
              onChange={handleGlobalSwitchChange}
              loading={updateGlobalConfigMutation.isPending}
            />
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          {/* 筛选和搜索 */}
          <Card size="small">
            <Space wrap>
              <Select
                placeholder="资源类型"
                allowClear
                style={{ width: 120 }}
                value={resourceTypeFilter}
                onChange={setResourceTypeFilter}
                options={[
                  { label: "模块", value: "module" },
                  { label: "菜单", value: "menu" },
                  { label: "按钮", value: "button" },
                ]}
              />
              <Select
                placeholder="权限控制"
                allowClear
                style={{ width: 120 }}
                value={needControlFilter}
                onChange={setNeedControlFilter}
                options={[
                  { label: "需要控制", value: 1 },
                  { label: "不需要控制", value: 0 },
                ]}
              />
              <Search
                placeholder="搜索资源名称或ID"
                allowClear
                style={{ width: 250 }}
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  if (e.target.value) {
                    addSearchHistory(e.target.value);
                  }
                }}
              />
            </Space>
          </Card>

          {/* 批量操作 */}
          {selectedRowKeys.length > 0 && (
            <Card size="small" type="inner">
              <Space>
                <span>已选择 {selectedRowKeys.length} 项</span>
                <Divider type="vertical" />
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => handleBatchUpdate(1)}
                  loading={batchUpdateMutation.isPending}
                >
                  批量启用
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => handleBatchUpdate(0)}
                  loading={batchUpdateMutation.isPending}
                >
                  批量禁用
                </Button>
                <Button size="small" onClick={() => setSelectedRowKeys([])}>
                  取消选择
                </Button>
              </Space>
            </Card>
          )}

          {/* 配置列表 */}
          <Table
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            loading={isLoading}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />

          {/* 提示信息 */}
          <Card size="small" type="inner">
            <Space direction="vertical" size="small">
              <Tag color="blue">使用说明</Tag>
              <div style={{ fontSize: 12, color: "#666" }}>
                •
                全局权限控制开关：开启后，所有功能默认需要权限控制；关闭后，所有用户拥有全部权限
                <br />
                • 单项权限控制：可针对每个模块/菜单/按钮单独设置是否需要权限控制
                <br />
                • 例外角色：设置后，该角色无需分配权限即可访问该功能
                <br />• 批量操作：支持批量启用/禁用多个配置项的权限控制
              </div>
            </Space>
          </Card>
        </Space>
      </Card>

      {/* 清理冗余配置弹窗 */}
      <Modal
        open={cleanupModalVisible}
        title={
          <Space>
            <WarningOutlined style={{ color: "#faad14" }} />
            清理冗余配置
          </Space>
        }
        onCancel={() => setCleanupModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setCleanupModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="execute"
            type="primary"
            danger
            loading={cleanupMutation.isPending}
            disabled={!detectionResult?.hasIssues}
            onClick={() => {
              Modal.confirm({
                title: "确认清理？",
                content: `将清理 ${detectionResult?.totalIssues} 项冗余配置，此操作不可撤销`,
                onOk: () => cleanupMutation.mutate(),
              });
            }}
          >
            执行清理
          </Button>,
        ]}
        width={800}
      >
        {detectionResult?.hasIssues ? (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Alert
              message={`检测到 ${detectionResult.totalIssues} 项冗余配置`}
              type="warning"
              showIcon
            />

            <Descriptions title="检测结果" column={1} bordered size="small">
              {detectionResult.issues.redundantMenus.length > 0 && (
                <Descriptions.Item label="冗余菜单权限">
                  <Space direction="vertical" size="small">
                    {detectionResult.issues.redundantMenus.map((item) => (
                      <div key={item.resourceId}>
                        {item.resourceName} - {item.count} 条分配记录
                      </div>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}

              {detectionResult.issues.redundantButtons.length > 0 && (
                <Descriptions.Item label="冗余按钮权限">
                  <Space direction="vertical" size="small">
                    {detectionResult.issues.redundantButtons.map((item) => (
                      <div key={item.resourceId}>
                        {item.resourceName} - {item.count} 条分配记录
                      </div>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}

              {detectionResult.issues.invalidRoles.length > 0 && (
                <Descriptions.Item label="已删除角色的权限">
                  <Space direction="vertical" size="small">
                    {detectionResult.issues.invalidRoles.map((item) => (
                      <div key={item.roleId}>
                        {item.roleName} - {item.count} 条权限记录
                      </div>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}

              {detectionResult.issues.orphanedPermissions.length > 0 && (
                <Descriptions.Item label="孤立的权限分配">
                  <Space direction="vertical" size="small">
                    {detectionResult.issues.orphanedPermissions.map((item) => (
                      <div key={item.type}>
                        菜单: {item.menuCount} 条, 按钮: {item.buttonCount} 条
                      </div>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Alert
              message="清理说明"
              description={
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  <li>清理"不需要权限控制"功能的分配记录</li>
                  <li>清理已删除角色的权限分配</li>
                  <li>清理孤立的权限分配（菜单或按钮已被删除）</li>
                  <li>清理后将自动清除相关缓存</li>
                </ul>
              }
              type="info"
            />
          </Space>
        ) : (
          <Alert
            message="未检测到冗余配置"
            description="当前系统权限配置正常，无需清理"
            type="success"
            showIcon
          />
        )}
      </Modal>
    </div>
  );
}
