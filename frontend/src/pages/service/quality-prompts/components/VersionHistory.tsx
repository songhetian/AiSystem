import React, { useState } from 'react';
import { Modal, Table, Button, Space, Tag, Tooltip, message } from 'antd';
import { HistoryOutlined, RollbackOutlined, DiffOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import qualityPromptApi, { type VersionRecord } from '@/api/quality-prompt';
import { VersionDiff } from './VersionDiff';
import dayjs from 'dayjs';

interface VersionHistoryProps {
  /**
   * Prompt ID
   */
  promptId: string;
  /**
   * Prompt类型: global 或 department
   */
  promptType: 'global' | 'department';
  /**
   * 当前版本号
   */
  currentVersion: number;
  /**
   * 是否显示对话框
   */
  open: boolean;
  /**
   * 关闭对话框回调
   */
  onClose: () => void;
  /**
   * 回滚成功回调
   */
  onRollbackSuccess?: () => void;
}

/**
 * 版本历史组件
 * 显示Prompt的所有历史版本，支持版本对比和回滚
 *
 * 功能:
 * - 显示版本列表（版本号、修改人、修改时间、变更描述）
 * - 版本对比（查看两个版本之间的差异）
 * - 版本回滚（恢复到指定历史版本）
 *
 * 需求: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
export const VersionHistory: React.FC<VersionHistoryProps> = ({
  promptId,
  promptType,
  currentVersion,
  open,
  onClose,
  onRollbackSuccess,
}) => {
  const queryClient = useQueryClient();
  const [selectedVersion, setSelectedVersion] = useState<VersionRecord | null>(null);
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [compareFromVersion, setCompareFromVersion] = useState<number | null>(null);
  const [compareToVersion, setCompareToVersion] = useState<number | null>(null);

  // 获取版本历史
  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['quality-prompt-versions', promptId, promptType],
    queryFn: () => {
      if (promptType === 'global') {
        return qualityPromptApi.getGlobalPromptVersions(promptId);
      } else {
        return qualityPromptApi.getDepartmentPromptVersions(promptId);
      }
    },
    enabled: open && !!promptId,
  });

  // 版本回滚mutation
  const rollbackMutation = useMutation({
    mutationFn: (version: number) => {
      if (promptType === 'global') {
        return qualityPromptApi.rollbackGlobalPrompt(promptId, version);
      } else {
        return qualityPromptApi.rollbackDepartmentPrompt(promptId, version);
      }
    },
    onSuccess: () => {
      message.success('版本回滚成功');
      // 刷新版本历史和Prompt列表
      queryClient.invalidateQueries({ queryKey: ['quality-prompt-versions', promptId, promptType] });
      queryClient.invalidateQueries({ queryKey: ['quality-prompts', promptType] });
      onRollbackSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      message.error(error?.message || '版本回滚失败');
    },
  });

  // 处理版本回滚
  const handleRollback = (record: VersionRecord) => {
    Modal.confirm({
      title: '确认回滚',
      content: (
        <div>
          <p>确定要回滚到版本 {record.version} 吗？</p>
          <p style={{ color: '#999', fontSize: 12 }}>
            回滚操作会创建一个新版本，内容与版本 {record.version} 相同。
          </p>
          <p style={{ color: '#ff4d4f', fontSize: 12 }}>
            注意：此操作不会删除当前版本，可以随时回滚到任何历史版本。
          </p>
        </div>
      ),
      okText: '确认回滚',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        rollbackMutation.mutate(record.version);
      },
    });
  };

  // 处理版本对比
  const handleCompare = (record: VersionRecord) => {
    setSelectedVersion(record);
    setCompareFromVersion(record.version);
    setCompareToVersion(currentVersion);
    setDiffModalOpen(true);
  };

  // 表格列定义
  const columns: ColumnsType<VersionRecord> = [
    {
      title: '版本号',
      dataIndex: 'version',
      width: 100,
      render: (version: number) => (
        <Space>
          <Tag color={version === currentVersion ? 'blue' : 'default'}>
            v{version}
          </Tag>
          {version === currentVersion && (
            <Tag color="success">当前版本</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '修改人',
      dataIndex: 'modified_by_name',
      width: 120,
      render: (name: string, record: VersionRecord) => name || record.modified_by,
    },
    {
      title: '修改时间',
      dataIndex: 'modified_at',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '变更描述',
      dataIndex: 'change_description',
      ellipsis: true,
      render: (desc: string) => (
        <Tooltip title={desc}>
          <span>{desc || '无描述'}</span>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<DiffOutlined />}
            onClick={() => handleCompare(record)}
            disabled={record.version === currentVersion}
          >
            对比
          </Button>
          <Button
            type="link"
            size="small"
            icon={<RollbackOutlined />}
            onClick={() => handleRollback(record)}
            disabled={record.version === currentVersion}
            danger
          >
            回滚
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            <span>版本历史</span>
          </Space>
        }
        open={open}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
        ]}
        width={1000}
        destroyOnClose
      >
        <div style={{ marginBottom: 16, color: '#666', fontSize: 14 }}>
          <p>当前版本: v{currentVersion}</p>
          <p style={{ fontSize: 12, color: '#999' }}>
            提示: 所有历史版本都会被永久保留，您可以随时回滚到任何历史版本。
          </p>
        </div>

        <Table<VersionRecord>
          rowKey="id"
          columns={columns}
          dataSource={versions}
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 个版本`,
          }}
          scroll={{ x: 900 }}
        />
      </Modal>

      {/* 版本对比对话框 */}
      {selectedVersion && (
        <VersionDiff
          open={diffModalOpen}
          onClose={() => {
            setDiffModalOpen(false);
            setSelectedVersion(null);
            setCompareFromVersion(null);
            setCompareToVersion(null);
          }}
          promptId={promptId}
          promptType={promptType}
          versionId={selectedVersion.id}
          fromVersion={compareFromVersion!}
          toVersion={compareToVersion!}
        />
      )}
    </>
  );
};
