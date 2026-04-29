import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input, List, Modal, Empty, Tag, Typography, Space } from 'antd';
import { SearchOutlined, EnterOutlined } from '@ant-design/icons';
import { useNavigate } from '@umijs/max';

const { Text } = Typography;

interface MenuSearchProps {
  menuData: any[];
  visible: boolean;
  onCancel: () => void;
}

export const MenuSearch: React.FC<MenuSearchProps> = ({ menuData, visible, onCancel }) => {
  const [keyword, setKeyword] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<any>(null);

  // 自动聚焦
  useEffect(() => {
    if (visible && inputRef.current) {
      // 延迟一点确保 Modal 完全打开
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  // 展平菜单以便搜索 - 过滤掉占位路径
  const flatMenus = useMemo(() => {
    const result: any[] = [];
    const traverse = (items: any[], parentName?: string) => {
      items.forEach(item => {
        const fullName = parentName ? `${parentName} > ${item.name}` : item.name;
        // 只添加真实的路由路径
        // 真实路径格式: /system/users, /org/employees 等
        // 占位路径格式: /员工信息管理, /基础设置 等（包含中文）
        const isRealPath = item.path &&
                          item.path.startsWith('/') &&
                          /^\/[a-z0-9\-\/]+$/.test(item.path); // 只包含小写字母、数字、连字符和斜杠

        if (isRealPath) {
          result.push({ ...item, fullName });
        }
        if (item.children) {
          traverse(item.children, fullName);
        }
      });
    };
    traverse(menuData);
    return result;
  }, [menuData]);

  const searchResults = useMemo(() => {
    if (!keyword) return [];
    const lowerKeyword = keyword.toLowerCase();
    return flatMenus.filter(item =>
      item.name.toLowerCase().includes(lowerKeyword) ||
      item.fullName.toLowerCase().includes(lowerKeyword)
    ).slice(0, 8);
  }, [keyword, flatMenus]);

  // 重置选中索引当搜索结果变化时
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      const selectedItem = searchResults[selectedIndex];
      console.log('跳转到:', selectedItem.path); // 调试日志
      navigate(selectedItem.path);
      onCancel();
      setKeyword(''); // 清空搜索
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      onCancel();
      setKeyword('');
    }
  };

  const handleItemClick = (item: any) => {
    console.log('点击跳转到:', item.path); // 调试日志
    navigate(item.path);
    onCancel();
    setKeyword('');
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      closable={false}
      styles={{ body: { padding: 0 } }}
      width={600}
      destroyOnClose
    >
      <Input
        ref={inputRef}
        prefix={<SearchOutlined style={{ fontSize: 20, color: '#94a3b8' }} />}
        placeholder="搜索功能（支持中英文、菜单路径...）"
        variant="borderless"
        style={{ padding: '20px', fontSize: '18px' }}
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div style={{ padding: '0 12px 12px' }}>
        {searchResults.length > 0 ? (
          <List
            dataSource={searchResults}
            renderItem={(item, index) => (
              <List.Item
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: index === selectedIndex ? 'rgba(0, 137, 255, 0.08)' : 'transparent',
                }}
                className="menu-search-item"
                onClick={() => handleItemClick(item)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: '15px' }}>{item.name}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{item.fullName}</Text>
                    <Text type="secondary" style={{ fontSize: '11px', color: '#94a3b8' }}>路径: {item.path}</Text>
                  </Space>
                  <Tag icon={<EnterOutlined />} color="blue">跳转</Tag>
                </div>
              </List.Item>
            )}
          />
        ) : keyword ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到匹配的功能" />
        ) : (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
            输入功能名称或关键字快速跳转
          </div>
        )}
      </div>
      <style>{`
        .menu-search-item:hover {
          background: rgba(0,0,0,0.04);
        }
      `}</style>
    </Modal>
  );
};
