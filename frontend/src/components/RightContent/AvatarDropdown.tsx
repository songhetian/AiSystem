import React from 'react';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Dropdown, MenuProps } from 'antd';
import { useNavigate } from '@umijs/max';
import { useGlobalStore } from '@/models/global';
import { logout } from '@/utils/auth';

export const AvatarDropdown: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, setToken, setCurrentUser } = useGlobalStore();

  const onMenuClick: MenuProps['onClick'] = async (event) => {
    const { key } = event;
    if (key === 'logout') {
      // 使用auth工具类登出
      await logout();

      // 清除Store状态
      setToken(undefined);
      setCurrentUser(undefined);

      // 跳转到登录页
      navigate('/login');
      return;
    }
    if (key === 'profile') {
      // navigate('/profile');
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  if (!currentUser) {
    return null;
  }

  return (
    <Dropdown menu={{ items: menuItems, onClick: onMenuClick }} placement="bottomRight" arrow>
      <span className="header-action-item user-avatar-trigger" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', borderRadius: 6, height: 48, color: '#fff' }}>
        <Avatar size="small" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`} alt="avatar" />
        <span className="anticon" style={{ fontSize: 14 }}>{currentUser.name || '管理员'}</span>
      </span>
    </Dropdown>
  );
};
