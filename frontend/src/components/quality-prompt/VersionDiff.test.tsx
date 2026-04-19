import React from 'react';
import { render, screen } from '@testing-library/react';
import { VersionDiff } from './VersionDiff';
import type { VersionRecord } from '@/api/quality-prompt';

describe('VersionDiff', () => {
  const oldVersion: VersionRecord = {
    id: 'v1',
    prompt_id: 'prompt-1',
    prompt_type: 'global',
    version: 1,
    content: '这是旧版本的内容',
    applicable_scenarios: '旧场景描述',
    change_description: '初始版本',
    modified_by: 'user1',
    modified_by_name: '张三',
    modified_at: '2024-01-01T10:00:00Z',
  };

  const newVersion: VersionRecord = {
    id: 'v2',
    prompt_id: 'prompt-1',
    prompt_type: 'global',
    version: 2,
    content: '这是新版本的内容，已经修改',
    applicable_scenarios: '新场景描述，更加详细',
    change_description: '更新了内容和场景',
    modified_by: 'user2',
    modified_by_name: '李四',
    modified_at: '2024-01-10T10:00:00Z',
  };

  it('should render version comparison title', () => {
    render(<VersionDiff oldVersion={oldVersion} newVersion={newVersion} />);

    expect(screen.getByText('版本对比')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
  });

  it('should display both version headers', () => {
    render(<VersionDiff oldVersion={oldVersion} newVersion={newVersion} />);

    expect(screen.getByText('旧版本')).toBeInTheDocument();
    expect(screen.getByText('新版本')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
  });

  it('should display change descriptions', () => {
    render(<VersionDiff oldVersion={oldVersion} newVersion={newVersion} />);

    expect(screen.getByText('初始版本')).toBeInTheDocument();
    expect(screen.getByText('更新了内容和场景')).toBeInTheDocument();
  });

  it('should display field labels', () => {
    render(<VersionDiff oldVersion={oldVersion} newVersion={newVersion} />);

    expect(screen.getByText('Prompt内容')).toBeInTheDocument();
    expect(screen.getByText('适用场景')).toBeInTheDocument();
  });

  it('should display old and new content', () => {
    render(<VersionDiff oldVersion={oldVersion} newVersion={newVersion} />);

    expect(screen.getByText('这是旧版本的内容')).toBeInTheDocument();
    expect(screen.getByText('这是新版本的内容，已经修改')).toBeInTheDocument();
    expect(screen.getByText('旧场景描述')).toBeInTheDocument();
    expect(screen.getByText('新场景描述，更加详细')).toBeInTheDocument();
  });

  it('should show modified tag for changed fields', () => {
    render(<VersionDiff oldVersion={oldVersion} newVersion={newVersion} />);

    const modifiedTags = screen.getAllByText('修改');
    expect(modifiedTags.length).toBeGreaterThan(0);
  });

  it('should show change statistics', () => {
    render(<VersionDiff oldVersion={oldVersion} newVersion={newVersion} />);

    // 应该显示修改统计
    expect(screen.getByText(/修改/)).toBeInTheDocument();
  });

  it('should handle empty content gracefully', () => {
    const emptyOldVersion: VersionRecord = {
      ...oldVersion,
      content: '',
      applicable_scenarios: '',
    };

    render(<VersionDiff oldVersion={emptyOldVersion} newVersion={newVersion} />);

    // 应该显示空状态
    const emptyStates = screen.getAllByText('无内容');
    expect(emptyStates.length).toBeGreaterThan(0);
  });

  it('should show unchanged message when versions are identical', () => {
    const identicalVersion: VersionRecord = {
      ...oldVersion,
      id: 'v2',
      version: 2,
      modified_at: '2024-01-10T10:00:00Z',
    };

    render(<VersionDiff oldVersion={oldVersion} newVersion={identicalVersion} />);

    expect(screen.getByText('两个版本的内容完全相同')).toBeInTheDocument();
  });

  it('should apply custom styles', () => {
    const customStyle = { marginTop: '20px' };
    const { container } = render(
      <VersionDiff
        oldVersion={oldVersion}
        newVersion={newVersion}
        style={customStyle}
      />
    );

    const card = container.querySelector('.ant-card');
    expect(card).toHaveStyle({ marginTop: '20px' });
  });

  it('should display version numbers in comparison', () => {
    render(<VersionDiff oldVersion={oldVersion} newVersion={newVersion} />);

    // 应该在多个地方显示版本号
    const versionLabels = screen.getAllByText(/v1|v2/);
    expect(versionLabels.length).toBeGreaterThan(2);
  });
});
