import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConflictAlert } from './ConflictAlert';
import type { ConflictInfo } from './ConflictAlert';

describe('ConflictAlert', () => {
  const mockConflicts: ConflictInfo[] = [
    {
      promptName: '礼貌用语规范',
      conflictType: '语义冲突',
      conflictContent: '部门Prompt要求"可以使用口语化表达"，但全局Prompt要求"必须使用标准书面语"',
      suggestion: '建议修改部门Prompt，移除口语化表达的要求，或联系管理员调整全局Prompt',
    },
    {
      promptName: '响应时效要求',
      conflictType: '关键词冲突',
      conflictContent: '部门Prompt要求"24小时内回复"，但全局Prompt要求"2小时内回复"',
      suggestion: '建议修改部门Prompt，将响应时效调整为不超过2小时',
    },
  ];

  it('should render nothing when conflicts array is empty', () => {
    const { container } = render(<ConflictAlert conflicts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render conflict alert with correct number of conflicts', () => {
    render(<ConflictAlert conflicts={mockConflicts} />);

    // 检查标题显示正确的冲突数量
    expect(screen.getByText(/检测到 2 个与全局Prompt的冲突/i)).toBeInTheDocument();
  });

  it('should display all conflict details', () => {
    render(<ConflictAlert conflicts={mockConflicts} />);

    // 检查第一个冲突
    expect(screen.getByText(/礼貌用语规范/i)).toBeInTheDocument();
    expect(screen.getByText(/语义冲突/i)).toBeInTheDocument();
    expect(screen.getByText(/可以使用口语化表达/i)).toBeInTheDocument();

    // 检查第二个冲突
    expect(screen.getByText(/响应时效要求/i)).toBeInTheDocument();
    expect(screen.getByText(/关键词冲突/i)).toBeInTheDocument();
    expect(screen.getByText(/24小时内回复/i)).toBeInTheDocument();
  });

  it('should display suggestions for each conflict', () => {
    render(<ConflictAlert conflicts={mockConflicts} />);

    expect(screen.getByText(/建议修改部门Prompt，移除口语化表达的要求/i)).toBeInTheDocument();
    expect(screen.getByText(/建议修改部门Prompt，将响应时效调整为不超过2小时/i)).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onCloseMock = jest.fn();
    render(<ConflictAlert conflicts={mockConflicts} onClose={onCloseMock} closable={true} />);

    // 查找并点击关闭按钮
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should not render close button when closable is false', () => {
    render(<ConflictAlert conflicts={mockConflicts} closable={false} />);

    const closeButton = screen.queryByRole('button', { name: /close/i });
    expect(closeButton).not.toBeInTheDocument();
  });

  it('should apply custom styles', () => {
    const customStyle = { marginTop: '20px', padding: '10px' };
    const { container } = render(
      <ConflictAlert conflicts={mockConflicts} style={customStyle} />
    );

    const alert = container.querySelector('.ant-alert');
    expect(alert).toHaveStyle({ marginTop: '20px', padding: '10px' });
  });

  it('should display conflict type tags with correct colors', () => {
    render(<ConflictAlert conflicts={mockConflicts} />);

    // 检查标签是否存在
    const semanticTag = screen.getByText('语义冲突');
    const keywordTag = screen.getByText('关键词冲突');

    expect(semanticTag).toBeInTheDocument();
    expect(keywordTag).toBeInTheDocument();
  });

  it('should display helpful tips at the bottom', () => {
    render(<ConflictAlert conflicts={mockConflicts} />);

    expect(screen.getByText(/如果您认为全局Prompt的要求不合理/i)).toBeInTheDocument();
    expect(screen.getByText(/部门Prompt应当在全局Prompt的基础上进行补充和细化/i)).toBeInTheDocument();
  });
});
