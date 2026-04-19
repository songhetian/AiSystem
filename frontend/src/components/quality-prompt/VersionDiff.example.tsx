import React from 'react';
import { Card, Space } from 'antd';
import { VersionDiff } from './index';
import type { VersionRecord } from '@/api/quality-prompt';

/**
 * VersionDiff组件示例
 *
 * 展示如何使用VersionDiff组件来对比两个版本的差异
 */
export const VersionDiffExample: React.FC = () => {
  // 示例1: 内容修改
  const oldVersion1: VersionRecord = {
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
  };

  const newVersion1: VersionRecord = {
    id: 'v2',
    prompt_id: 'prompt-123',
    prompt_type: 'global',
    version: 2,
    content: '1. 必须使用礼貌用语\n2. 响应时间不超过2小时\n3. 提供专业的解决方案\n4. 记录客户反馈',
    applicable_scenarios: '所有客服对话场景，包括售前、售后、投诉处理',
    change_description: '优化了响应时间要求，添加了客户反馈记录',
    modified_by: 'user1',
    modified_by_name: '张三',
    modified_at: '2024-01-10T10:00:00Z',
  };

  // 示例2: 大幅修改
  const oldVersion2: VersionRecord = {
    id: 'v3',
    prompt_id: 'prompt-456',
    prompt_type: 'department',
    version: 3,
    content: '部门专用质检标准:\n- 使用标准话术\n- 控制通话时长',
    applicable_scenarios: '电话客服场景',
    change_description: '简化版本',
    modified_by: 'user2',
    modified_by_name: '李四',
    modified_at: '2024-01-05T14:00:00Z',
  };

  const newVersion2: VersionRecord = {
    id: 'v4',
    prompt_id: 'prompt-456',
    prompt_type: 'department',
    version: 4,
    content: '部门专用质检标准:\n- 使用标准话术，避免口语化表达\n- 控制通话时长在5分钟以内\n- 主动询问客户满意度\n- 记录客户关键需求\n- 及时跟进未解决问题',
    applicable_scenarios: '电话客服场景、在线客服场景、邮件客服场景',
    change_description: '大幅扩充了质检标准，增加了多个场景支持',
    modified_by: 'user2',
    modified_by_name: '李四',
    modified_at: '2024-01-15T16:30:00Z',
  };

  // 示例3: 无变化
  const oldVersion3: VersionRecord = {
    id: 'v5',
    prompt_id: 'prompt-789',
    prompt_type: 'global',
    version: 5,
    content: '保持礼貌、专业、高效',
    applicable_scenarios: '通用场景',
    change_description: '版本5',
    modified_by: 'admin',
    modified_by_name: '系统管理员',
    modified_at: '2024-01-12T11:00:00Z',
  };

  const newVersion3: VersionRecord = {
    id: 'v6',
    prompt_id: 'prompt-789',
    prompt_type: 'global',
    version: 6,
    content: '保持礼貌、专业、高效',
    applicable_scenarios: '通用场景',
    change_description: '版本6（无实质变更）',
    modified_by: 'admin',
    modified_by_name: '系统管理员',
    modified_at: '2024-01-13T09:00:00Z',
  };

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="VersionDiff 组件示例">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <h3>示例1: 内容修改</h3>
              <p>展示两个版本之间的内容差异，包括新增和修改的部分。</p>
            </div>

            <VersionDiff oldVersion={oldVersion1} newVersion={newVersion1} />
          </Space>
        </Card>

        <Card title="示例2: 大幅修改">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <p>展示大幅度修改的版本对比，内容和场景都有显著变化。</p>
            </div>

            <VersionDiff oldVersion={oldVersion2} newVersion={newVersion2} />
          </Space>
        </Card>

        <Card title="示例3: 无变化">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <p>展示两个版本内容完全相同的情况。</p>
            </div>

            <VersionDiff oldVersion={oldVersion3} newVersion={newVersion3} />
          </Space>
        </Card>

        <Card title="使用说明">
          <Space direction="vertical">
            <div>
              <h4>功能特性:</h4>
              <ul>
                <li>并排显示两个版本的内容</li>
                <li>字段级别的对比（内容、适用场景）</li>
                <li>使用颜色标记变更类型：
                  <ul>
                    <li>绿色 - 新增内容</li>
                    <li>红色 - 删除内容</li>
                    <li>黄色 - 修改内容</li>
                    <li>灰色 - 未变更</li>
                  </ul>
                </li>
                <li>显示变更统计（新增、删除、修改数量）</li>
                <li>显示版本元信息（版本号、修改人、修改时间、变更说明）</li>
                <li>自动检测内容是否完全相同</li>
              </ul>
            </div>
            <div>
              <h4>Props:</h4>
              <ul>
                <li><code>oldVersion</code>: 旧版本数据（VersionRecord类型）</li>
                <li><code>newVersion</code>: 新版本数据（VersionRecord类型）</li>
                <li><code>style</code>: 自定义样式（可选）</li>
              </ul>
            </div>
            <div>
              <h4>使用场景:</h4>
              <ul>
                <li>版本历史对比</li>
                <li>回滚前预览差异</li>
                <li>审计和追溯变更</li>
                <li>团队协作时了解他人的修改</li>
              </ul>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default VersionDiffExample;
