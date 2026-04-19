import React, { useState } from 'react';
import {
  Timeline,
  Card,
  Space,
  Button,
  Typography,
  Tag,
  Modal,
  message,
  Spin,
  Empty,
  Tooltip,
} from 'antd';
import {
  ClockCircleOutlined,
  UserOutlined,
  RollbackOutlined,
  EyeOutlined,
  DiffOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { VersionRecord } from '@/api/quality-prompt';
import { formatDate } from '@/utils/date';

const { Text, Paragraph } = Typography;
const { confirm } = Modal;

/**
 * VersionHistory组件Props
 */
export interface VersionHistoryProps {
  /** Prompt ID */
  promptId: string;
  /** Prompt类型 */
  promptType: 'global' | 'department';
  /** 版本历史列表 */
  versions: VersionRecord[];
  /** 是否加载中 */
  loading?: boolean;
  /** 回滚回调 */
  onRollback?: (versionId: string) => Promise<void>;
  /** 查看详情回调 */
  onViewDetail?: (version: VersionRecord) => void;
  /** 对比版本回调 */
  onCompare?: (oldVersion: VersionRecord, newVersion: VersionRecord) => void;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * 版本历史组件
 *
 * 用于显示Prompt的版本历史记录，支持：
 * - 时间线展示版本列表（版本号、创建时间、创建人、变更说明）
 * - 查看版本详情
 * - 版本对比（选择两个版本进行对比）
 * - 版本回滚（恢复到指定版本）
 *
 * @example
 * ```tsx
 * <VersionHistory
 *   promptId="prompt-123"
 *   promptType="global"
 *   versions={versionList}
 *   onRollback={handleRollback}
 *   onCompare={handleCompare}
 * />
 * ```
 */
export const VersionHistory: React.FC<VersionHistoryProps> = ({
  promptId,
  promptType,
  versions,
  loading = false,
  onRollback,
  onViewDetail,
  onCompare,
  style,
}) => {
  const [selectedVersions, setSelectedVersions] = useState<VersionRecord[]>([]);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  /**
   * 处理版本选择（用于对比）
   */
  const handleVersionSelect = (version: VersionRecord) => {
    if (selectedVersions.find((v) => v.id === version.id)) {
      // 取消选择
      setSelectedVersions(selectedVersions.filter((v) => v.id !== version.id));
    } else {
      // 选择版本（最多选择2个）
      if (selectedVersions.length >= 2) {
        message.warning('最多只能选择2个版本进行对比');
        return;
      }
      setSelectedVersions([...selectedVersions, version]);
    }
  };

  /**
   * 处理版本对比
   */
  const handleCompare = () => {
    if (selectedVersions.length !== 2) {
      message.warning('请选择2个版本进行对比');
      return;
    }

    // 按版本号排序，旧版本在前
    const [oldVersion, newVersion] = selectedVersions.sort((a, b) => a.version - b.version);

    if (onCompare) {
      onCompare(oldVersion, newVersion);
    }

    // 清空选择
    setSelectedVersions([]);
  };

  /**
   * 处理版本回滚
   */
  const handleRollback = (version: VersionRecord) => {
    confirm({
      title: '确认回滚版本',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <Paragraph>
            您确定要回滚到版本 <Text strong>v{version.version}</Text> 吗？
          </Paragraph>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            回滚操作会创建一个新版本，内容与选定的历史版本相同。原有版本不会被删除。
          </Paragraph>
        </div>
      ),
      okText: '确认回滚',
      okType: 'primary',
      cancelText: '取消',
      onOk: async () => {
        if (!onRollback) return;

        setRollingBack(version.id);
        try {
          await onRollback(version.id);
          message.success(`已成功回滚到版本 v${version.version}`);
        } catch (error: any) {
          message.error(error.message || '回滚失败，请重试');
        } finally {
          setRollingBack(null);
        }
      },
    });
  };

  /**
   * 渲染版本标签
   */
  const renderVersionTag = (version: VersionRecord, isLatest: boolean) => {
    if (isLatest) {
      return <Tag color="green">当前版本</Tag>;
    }
    return <Tag color="default">v{version.version}</Tag>;
  };

  /**
   * 渲染版本操作按钮
   */
  const renderActions = (version: VersionRecord, isLatest: boolean) => {
    const isSelected = selectedVersions.find((v) => v.id === version.id);
    const isRollingBack = rollingBack === version.id;

    return (
      <Space size="small">
        {/* 选择对比按钮 */}
        <Button
          size="small"
          type={isSelected ? 'primary' : 'default'}
          icon={<DiffOutlined />}
          onClick={() => handleVersionSelect(version)}
          disabled={isRollingBack}
        >
          {isSelected ? '已选择' : '选择对比'}
        </Button>

        {/* 查看详情按钮 */}
        {onViewDetail && (
          <Tooltip title="查看版本详情">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onViewDetail(version)}
              disabled={isRollingBack}
            />
          </Tooltip>
        )}

        {/* 回滚按钮（当前版本不显示） */}
        {!isLatest && onRollback && (
          <Tooltip title="回滚到此版本">
            <Button
              size="small"
              icon={<RollbackOutlined />}
              onClick={() => handleRollback(version)}
              loading={isRollingBack}
              disabled={!!rollingBack && !isRollingBack}
            >
              回滚
            </Button>
          </Tooltip>
        )}
      </Space>
    );
  };

  /**
   * 渲染空状态
   */
  if (!loading && (!versions || versions.length === 0)) {
    return (
      <Card style={style}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无版本历史"
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined />
          <span>版本历史</span>
          {selectedVersions.length > 0 && (
            <Tag color="blue">已选择 {selectedVersions.length} 个版本</Tag>
          )}
        </Space>
      }
      extra={
        selectedVersions.length === 2 && (
          <Button type="primary" icon={<DiffOutlined />} onClick={handleCompare}>
            对比版本
          </Button>
        )
      }
      style={style}
    >
      <Spin spinning={loading}>
        <Timeline mode="left">
          {versions.map((version, index) => {
            const isLatest = index === 0;
            const isSelected = selectedVersions.find((v) => v.id === version.id);

            return (
              <Timeline.Item
                key={version.id}
                color={isLatest ? 'green' : isSelected ? 'blue' : 'gray'}
                dot={
                  isLatest ? (
                    <ClockCircleOutlined style={{ fontSize: 16 }} />
                  ) : undefined
                }
              >
                <Card
                  size="small"
                  style={{
                    marginBottom: 8,
                    border: isSelected ? '2px solid #1890ff' : undefined,
                  }}
                >
                  {/* 版本头部 */}
                  <Space
                    style={{
                      width: '100%',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <Space>
                      {renderVersionTag(version, isLatest)}
                      <Text strong>版本 {version.version}</Text>
                    </Space>
                    {renderActions(version, isLatest)}
                  </Space>

                  {/* 版本信息 */}
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {/* 修改人 */}
                    <Space size="small">
                      <UserOutlined style={{ color: '#8c8c8c' }} />
                      <Text type="secondary">
                        {version.modified_by_name || version.modified_by}
                      </Text>
                    </Space>

                    {/* 修改时间 */}
                    <Space size="small">
                      <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
                      <Text type="secondary">
                        {formatDate(version.modified_at, 'YYYY-MM-DD HH:mm:ss')}
                      </Text>
                    </Space>

                    {/* 变更说明 */}
                    {version.change_description && (
                      <Paragraph
                        style={{
                          marginTop: 8,
                          marginBottom: 0,
                          padding: '8px 12px',
                          background: '#fafafa',
                          borderLeft: '3px solid #d9d9d9',
                          borderRadius: 4,
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          变更说明:
                        </Text>
                        <br />
                        {version.change_description}
                      </Paragraph>
                    )}
                  </Space>
                </Card>
              </Timeline.Item>
            );
          })}
        </Timeline>
      </Spin>
    </Card>
  );
};

export default VersionHistory;
