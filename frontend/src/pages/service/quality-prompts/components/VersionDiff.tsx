import React from 'react';
import { Modal, Spin, Alert, Descriptions, Tag, Empty } from 'antd';
import { DiffOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import qualityPromptApi, { type VersionDiff as VersionDiffType } from '@/api/quality-prompt';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

interface VersionDiffProps {
  /**
   * Prompt ID
   */
  promptId: string;
  /**
   * Prompt类型: global 或 department
   */
  promptType: 'global' | 'department';
  /**
   * 版本记录ID
   */
  versionId: string;
  /**
   * 对比起始版本号
   */
  fromVersion: number;
  /**
   * 对比目标版本号
   */
  toVersion: number;
  /**
   * 是否显示对话框
   */
  open: boolean;
  /**
   * 关闭对话框回调
   */
  onClose: () => void;
}

/**
 * 版本对比组件
 * 显示两个版本之间的差异，使用diff视图高亮显示变更内容
 *
 * 功能:
 * - 并排显示两个版本的内容
 * - 高亮显示新增、删除、修改的内容
 * - 显示字段级别的变更详情
 *
 * 需求: 6.4, 6.5
 */
export const VersionDiff: React.FC<VersionDiffProps> = ({
  promptId,
  promptType,
  versionId,
  fromVersion,
  toVersion,
  open,
  onClose,
}) => {
  // 获取版本差异
  const { data: diffData, isLoading, error } = useQuery({
    queryKey: ['quality-prompt-version-diff', promptId, versionId, fromVersion, toVersion, promptType],
    queryFn: () =>
      qualityPromptApi.compareVersions(promptId, versionId, fromVersion, toVersion, promptType),
    enabled: open && !!promptId && !!versionId,
  });

  // 渲染字段变更详情
  const renderFieldChanges = () => {
    if (!diffData || !diffData.changes || diffData.changes.length === 0) {
      return (
        <Empty
          description="两个版本之间没有差异"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <div style={{ marginTop: 24 }}>
        <h4 style={{ marginBottom: 16 }}>字段变更详情</h4>
        {diffData.changes.map((change, index) => (
          <div key={index} style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 8 }}>
              <Tag color="blue">{getFieldLabel(change.field)}</Tag>
            </div>
            <ReactDiffViewer
              oldValue={change.oldValue || ''}
              newValue={change.newValue || ''}
              splitView={true}
              compareMethod={DiffMethod.WORDS}
              leftTitle={`版本 ${fromVersion}`}
              rightTitle={`版本 ${toVersion}`}
              styles={{
                variables: {
                  light: {
                    diffViewerBackground: '#fff',
                    addedBackground: '#e6ffed',
                    addedColor: '#24292e',
                    removedBackground: '#ffeef0',
                    removedColor: '#24292e',
                    wordAddedBackground: '#acf2bd',
                    wordRemovedBackground: '#fdb8c0',
                    addedGutterBackground: '#cdffd8',
                    removedGutterBackground: '#ffdce0',
                    gutterBackground: '#f6f8fa',
                    gutterBackgroundDark: '#f3f4f6',
                    highlightBackground: '#fffbdd',
                    highlightGutterBackground: '#fff5b1',
                  },
                },
                line: {
                  padding: '8px 10px',
                  fontSize: '14px',
                  lineHeight: '20px',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                },
              }}
              useDarkTheme={false}
              hideLineNumbers={false}
            />
          </div>
        ))}
      </div>
    );
  };

  // 获取字段标签
  const getFieldLabel = (field: string): string => {
    const fieldLabels: Record<string, string> = {
      name: 'Prompt名称',
      content: 'Prompt内容',
      applicable_scenarios: '适用场景',
      enabled: '启用状态',
      sort: '排序',
      platform_id: '平台ID',
      dept_id: '部门ID',
      parent_global_prompt_id: '关联全局Prompt',
    };
    return fieldLabels[field] || field;
  };

  return (
    <Modal
      title={
        <div>
          <DiffOutlined style={{ marginRight: 8 }} />
          版本对比: v{fromVersion} vs v{toVersion}
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={1200}
      destroyOnClose
      bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
    >
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" tip="正在加载版本差异..." />
        </div>
      )}

      {error && (
        <Alert
          message="加载失败"
          description={(error as any)?.message || '无法加载版本差异，请稍后重试'}
          type="error"
          showIcon
        />
      )}

      {!isLoading && !error && diffData && (
        <>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="对比版本">
              <Tag color="default">v{diffData.fromVersion}</Tag>
              <span style={{ margin: '0 8px' }}>→</span>
              <Tag color="blue">v{diffData.toVersion}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="变更字段数">
              {diffData.changes?.length || 0} 个字段
            </Descriptions.Item>
          </Descriptions>

          {renderFieldChanges()}

          <div style={{ marginTop: 24, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
              <strong>说明:</strong>
            </p>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 12, color: '#666' }}>
              <li>绿色背景表示新增或修改的内容</li>
              <li>红色背景表示删除的内容</li>
              <li>左侧显示旧版本内容，右侧显示新版本内容</li>
            </ul>
          </div>
        </>
      )}
    </Modal>
  );
};
