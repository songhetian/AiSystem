import React, { useState } from 'react';
import { Card, Space, Button, Modal, message } from 'antd';
import { VersionHistory, VersionDiff } from './index';
import type { VersionRecord } from '@/api/quality-prompt';

/**
 * VersionHistory组件示例
 *
 * 展示如何使用VersionHistory组件来显示和管理Prompt版本历史
 */
export const VersionHistoryExample: React.FC = () => {
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<{
    old: VersionRecord | null;
    new: VersionRecord | null;
  }>({ old: null, new: null });

  // 模拟版本数据
  const mockVersions: VersionRecord[] = [
    {
      id: 'v3',
      prompt_id: 'prompt-123',
      prompt_type: 'global',
      version: 3,
      content: '1. 必须使用礼貌用语\n2. 响应时间不超过2小时\n3. 提供专业的解决方案\n4. 记录客户反馈',
      applicable_scenarios: '所有客服对话场景',
      change_description: '添加了客户反馈记录要求',
      modified_by: 'admin',
      modified_by_name: '系统管理员',
      modified_at: '2024-01-15T14:30:00Z',
    },
    {
      id: 'v2',
      prompt_id: 'prompt-123',
      prompt_type: 'global',
      version: 2,
      content: '1. 必须使用礼貌用语\n2. 响应时间不超过2小时\n3. 提供专业的解决方案',
      applicable_scenarios: '所有客服对话场景',
      change_description: '优化了响应时间要求',
      modified_by: 'user1',
      modified_by_name: '张三',
      modified_at: '2024-01-10T10:00:00Z',
    },
    {
      id: 'v1',
      prompt_id: 'prompt-123',
      prompt_type: 'global',
      version: 1,
      content: '1. 必须使用礼貌用语\n2. 及时响应客户咨询\n3. 提供专业的解决方案',
      applicable_scenarios: '所有客服对话场景',
      change_description: '初始版本',
      modified_by: 'admin',
      modified_by_name: '系统管理员',
      modified_at: '2024-01-01T09:00:00Z',
    },
  ];

  /**
   * 处理版本回滚
   */
  const handleRollback = async (versionId: string) => {
    // 模拟API调用
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log('回滚到版本:', versionId);
        message.success('版本回滚成功');
        resolve();
      }, 1000);
    });
  };

  /**
   * 处理查看版本详情
   */
  const handleViewDetail = (version: VersionRecord) => {
    Modal.info({
      title: `版本 ${version.version} 详情`,
      width: 600,
      content: (
        <div>
          <p><strong>版本号:</strong> v{version.version}</p>
          <p><strong>修改人:</strong> {version.modified_by_name}</p>
          <p><strong>修改时间:</strong> {version.modified_at}</p>
          <p><strong>变更说明:</strong> {version.change_description}</p>
          <p><strong>内容:</strong></p>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
            {version.content}
          </pre>
          <p><strong>适用场景:</strong></p>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
            {version.applicable_scenarios}
          </pre>
        </div>
      ),
    });
  };

  /**
   * 处理版本对比
   */
  const handleCompare = (oldVersion: VersionRecord, newVersion: VersionRecord) => {
    setSelectedVersions({ old: oldVersion, new: newVersion });
    setCompareModalVisible(true);
  };

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="VersionHistory 组件示例">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <h3>基本用法</h3>
              <p>显示Prompt的版本历史，支持查看详情、版本对比和回滚操作。</p>
            </div>

            <VersionHistory
              promptId="prompt-123"
              promptType="global"
              versions={mockVersions}
              onRollback={handleRollback}
              onViewDetail={handleViewDetail}
              onCompare={handleCompare}
            />
          </Space>
        </Card>

        <Card title="空状态示例">
          <VersionHistory
            promptId="prompt-456"
            promptType="department"
            versions={[]}
          />
        </Card>

        <Card title="加载状态示例">
          <VersionHistory
            promptId="prompt-789"
            promptType="global"
            versions={mockVersions}
            loading={true}
          />
        </Card>

        <Card title="使用说明">
          <Space direction="vertical">
            <div>
              <h4>功能特性:</h4>
              <ul>
                <li>时间线展示版本历史</li>
                <li>显示版本号、修改人、修改时间、变更说明</li>
                <li>支持选择两个版本进行对比</li>
                <li>支持查看版本详情</li>
                <li>支持回滚到历史版本（需要确认）</li>
                <li>当前版本标记为绿色</li>
                <li>选中的版本标记为蓝色</li>
              </ul>
            </div>
            <div>
              <h4>Props:</h4>
              <ul>
                <li><code>promptId</code>: Prompt ID</li>
                <li><code>promptType</code>: Prompt类型 ('global' | 'department')</li>
                <li><code>versions</code>: 版本历史列表</li>
                <li><code>loading</code>: 是否加载中</li>
                <li><code>onRollback</code>: 回滚回调函数</li>
                <li><code>onViewDetail</code>: 查看详情回调函数</li>
                <li><code>onCompare</code>: 对比版本回调函数</li>
              </ul>
            </div>
          </Space>
        </Card>
      </Space>

      {/* 版本对比模态框 */}
      <Modal
        title="版本对比"
        open={compareModalVisible}
        onCancel={() => setCompareModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setCompareModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={1200}
      >
        {selectedVersions.old && selectedVersions.new && (
          <VersionDiff
            oldVersion={selectedVersions.old}
            newVersion={selectedVersions.new}
          />
        )}
      </Modal>
    </div>
  );
};

export default VersionHistoryExample;
