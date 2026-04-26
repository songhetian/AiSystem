import React, { useState, useMemo } from 'react';
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
  const navigate = useNavigate();

  // 展平菜单以便搜索
  const flatMenus = useMemo(() => {
    const result: any[] = [];
    const traverse = (items: any[], parentName?: string) => {
      items.forEach(item => {
        const fullName = parentName ? `${parentName} > ${item.name}` : item.name;
        if (item.path) {
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
        prefix={<SearchOutlined style={{ fontSize: 20, color: '#94a3b8' }} />}
        placeholder="搜索功能（支持中英文、菜单路径...）"
        variant="borderless"
        style={{ padding: '20px', fontSize: '18px' }}
        onChange={e => setKeyword(e.target.value)}
        autoFocus
      />
      <div style={{ padding: '0 12px 12px' }}>
        {searchResults.length > 0 ? (
          <List
            dataSource={searchResults}
            renderItem={item => (
              <List.Item
                style={{ 
                  border: 'none', 
                  cursor: 'pointer',
                  padding: '12px 16px',
                  borderRadius: '8px',
                }}
                className="menu-search-item"
                onClick={() => {
                  navigate(item.path);
                  onCancel();
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: '15px' }}>{item.name}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{item.fullName}</Text>
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
