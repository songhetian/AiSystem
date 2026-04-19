import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VersionHistory } from './VersionHistory';
import type { VersionRecord } from '@/api/quality-prompt';

// Mock message from antd
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    message: {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
    },
  };
});

describe('VersionHistory', () => {
  const mockVersions: VersionRecord[] = [
    {
      id: 'v1',
      prompt_id: 'prompt-1',
      prompt_type: 'global',
      version: 3,
      content: '最新版本内容',
      applicable_scenarios: '场景3',
      change_description: '修复了一些问题',
      modified_by: 'user1',
      modified_by_name: '张三',
      modified_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'v2',
      prompt_id: 'prompt-1',
      prompt_type: 'global',
      version: 2,
      content: '第二版本内容',
      applicable_scenarios: '场景2',
      change_description: '添加了新功能',
      modified_by: 'user2',
      modified_by_name: '李四',
      modified_at: '2024-01-10T10:00:00Z',
    },
    {
      id: 'v3',
      prompt_id: 'prompt-1',
      prompt_type: 'global',
      version: 1,
      content: '初始版本内容',
      applicable_scenarios: '场景1',
      modified_by: 'user1',
      modified_by_name: '张三',
      modified_at: '2024-01-01T10:00:00Z',
    },
  ];

  it('should render empty state when no versions', () => {
    render(
      <VersionHistory
        promptId="prompt-1"
        promptType="global"
        versions={[]}
        loading={false}
      />
    );

    expect(screen.getByText('暂无版本历史')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(
      <VersionHistory
        promptId="prompt-1"
        promptType="global"
        versions={mockVersions}
        loading={true}
      />
    );

    expect(screen.getByText('版本历史')).toBeInTheDocument();
  });

  it('should render all versions in timeline', () => {
    render(
      <VersionHistory
        promptId="prompt-1"
        promptType="global"
        versions={mockVersions}
      />
    );

    expect(screen.getByText('版本 3')).toBeInTheDocument();
    expect(screen.getByText('版本 2')).toBeInTheDocument();
    expect(screen.getByText('版本 1')).toBeInTheDocument();
  });

  it('should mark the latest version with "当前版本" tag', () => {
    render(
      <VersionHistory
        promptId="prompt-1"
        promptType="global"
        versions={mockVersions}
      />
    );

    expect(screen.getByText('当前版本')).toBeInTheDocument();
  });

  it('should display version details', () => {
    render(
      <VersionHistory
        promptId="prompt-1"
        promptType="global"
        versions={mockVersions}
      />
    );

    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
    expect(screen.getByText('修复了一些问题')).toBeInTheDocument();
    expect(screen.getByText('添加了新功能')).toBeInTheDocument();
  });

  it('should allow selecting versions for comparison', () => {
    render(
      <VersionHistory
        promptId="prompt-1"
        promptType="global"
        versions={mockVersions}
      />
    );

    const selectButtons = screen.getAllByText('选择对比');

    // 选择第一个版本
    fireEvent.click(selectButtons[0]);
    expect(screen.getByText('已选择 1 个版本')).toBeInTheDocument();

    // 选择第二个版本
    fireEvent.click(selectButtons[1]);
    expect(screen.getByText('已选择 2 个版本')).toBeInTheDocument();
  });

  it('should show compare button when 2 versions selected', () => {
    render(
      <VersionHistory
        promptId="prompt-1"
        promptType="global"
        versions={mockVersions}
      />
    );

    const selectButtons = screen.getAllByText('选择对比');

    // 选择两个版本
    fireEvent.click(selectButtons[0]);
    fireEvent.click(selectButtons[1]);

    expect(screen.getByText('对比版本')).toBeInTheDocument();
  });

  it('should call onCompare with correct versions', () => {
    const onCompareMock = jest.fn();
    render(
      <VersionHistory
        promptId="prompt-1"
        promptType="global"
        versions={mockVersions}
        onCompare={onCompareMock}
      />
    );

    const selectButtons = screen.getAllByText('选择对比');

    // 选择两个版本
    fireEvent.click(selectButtons[1]); // version 2
    fireEvent.click(selectButtons[2]); // version 1

    // 点击对比按钮
    const compareButton = screen.getByText('对比版本');
    fireEvent.click(compareButton);

    // 应该按版本号排序，旧版本在前
    expect(onCompareMock).toHaveBeenCalledWith(mockVersions[2], mockVersions[1]);
  });

  it('should call onViewDetail when view button clicked', () => {
    const onViewDetailMock = jest.fn();
    render(
      <VersionHistory
        promptId="prompt-1"
        promptType="global"
        versions={mockVersions}
        onViewDetail={onViewDetailMock}
      />
    );

    const viewButtons = screen.getAllByRole('button', { name: /查看版本详情/i });
    fireEvent.click(viewButtons[0]);

    expect(onViewDetailMock).toHaveBeenCalledWith(mockVersions[0]);
  });

  it('should show rollback confirmation modal', () => {
    const onRollbackMock = jest.fn();
    render(
      <VersionHistory
        promptId="prompt-1"
        promptType="global"
        versions={mockVersions}
        onRollback={onRollbackMock}
      />
    );

    // 点击第二个版本的回滚按钮（第一个是当前版本，没有回滚按钮）
    const rollbackButtons = screen.getAllByText('回滚');
    fireEvent.click(rollbackButtons[0]);

    // 应该显示确认对话框
    expect(screen.getByText('确认回滚版本')).toBeInTheDocument();
  });

  it('should not show rollback button for current version', () => {
    render(
      <VersionHistory
        promptId="prompt-1"
        promptType="global"
        versions={mockVersions}
        onRollback={jest.fn()}
      />
    );

    // 获取所有回滚按钮，应该比版本数少1（因为当前版本没有回滚按钮）
    const rollbackButtons = screen.getAllByText('回滚');
    expect(rollbackButtons.length).toBe(mockVersions.length - 1);
  });
});
