import React from 'react';
import { Avatar, Dropdown, MenuProps, Divider, Switch, Tooltip } from 'antd';
import { LogoutOutlined, UserOutlined, MoonOutlined, SunOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from '@umijs/max';
import { useGlobalStore } from '@/models/global';
import { useTheme } from '@/hooks/useTheme';
import { HeaderMessageHub } from '../common/HeaderMessageHub';
import { logout } from '@/utils/auth';

// ── AvatarDropdown ─────────────────────────────────────────────────────────
const AvatarDropdown: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, setToken, setCurrentUser } = useGlobalStore();

  const onMenuClick: MenuProps['onClick'] = async ({ key }) => {
    if (key === 'logout') {
      // 使用auth工具类登出
      await logout();

      // 清除Store状态
      setToken(undefined);
      setCurrentUser(undefined);

      // 跳转到登录页
      navigate('/login');
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账号设置',
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  if (!currentUser) return null;

  const displayName = currentUser.name || currentUser.username || '管理员';
  const roleLabel = currentUser.roles?.[0]?.role_name || '管理员';

  return (
    <Dropdown
      menu={{ items: menuItems, onClick: onMenuClick }}
      placement="bottomRight"
      dropdownRender={(menu) => (
        <div style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          border: '1px solid rgba(226,232,240,0.8)',
          minWidth: 200,
        }}>
          {/* 用户信息头部 */}
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <Avatar
              size={40}
              src={currentUser.avatar}
              icon={!currentUser.avatar && <UserOutlined />}
              style={{ background: 'linear-gradient(135deg,#3b8fff,#2563eb)', flexShrink: 0 }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', lineHeight: 1.3 }}>
                {displayName}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {roleLabel}
              </div>
            </div>
          </div>
          {/* 菜单项 */}
          <div style={{ padding: '6px 0' }}>
            {React.cloneElement(menu as React.ReactElement, {
              style: { boxShadow: 'none', border: 'none', background: 'transparent' }
            })}
          </div>
        </div>
      )}
    >
      <div className="header-action-item" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 10px', borderRadius: 8, height: 48, cursor: 'pointer',
        color: '#fff',
      }}>
        <Avatar
          size={32}
          src={currentUser.avatar}
          icon={!currentUser.avatar && <UserOutlined />}
          style={{
            background: 'rgba(255,255,255,0.25)',
            border: '1.5px solid rgba(255,255,255,0.4)',
            flexShrink: 0,
          }}
        />
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
            {displayName}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
            {roleLabel}
          </div>
        </div>
      </div>
    </Dropdown>
  );
};

// ── RightContent ────────────────────────────────────────────────────────────
export const RightContent: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { token } = useGlobalStore();

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 4, paddingRight: 8 }}>
      {/* 消息中心 */}
      <HeaderMessageHub enabled={Boolean(token)} />

      {/* 主题切换 — Tooltip 包裹，悬停时显示说明 */}
      <Tooltip title={isDark ? '切换亮色模式' : '切换深色模式'} placement="bottom">
        <div
          className="header-action-item"
          onClick={toggleTheme}
          style={{
            width: 40, height: 40, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', fontSize: 18,
            transition: 'background 0.2s',
          }}
        >
          {isDark ? <SunOutlined /> : <MoonOutlined />}
        </div>
      </Tooltip>

      {/* 分隔线 */}
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

      {/* 用户头像下拉 */}
      <AvatarDropdown />
    </div>
  );
};
