import { useMutation } from '@tanstack/react-query';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import type { CSSProperties } from 'react';
import { useNavigate } from 'umi';
import { authApi } from '@/api/auth';
import { useGlobalStore } from '@/models/global';

const shellStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: '32px',
  background:
    'radial-gradient(circle at top left, rgba(255, 198, 124, 0.38), transparent 28%), radial-gradient(circle at bottom right, rgba(56, 189, 248, 0.24), transparent 34%), linear-gradient(135deg, #0f172a 0%, #132238 48%, #1f3b56 100%)'
};

const frameStyle: CSSProperties = {
  width: 'min(1080px, 100%)',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '24px',
  alignItems: 'stretch'
};

const heroStyle: CSSProperties = {
  borderRadius: 28,
  padding: '40px 36px',
  color: '#e2e8f0',
  background:
    'linear-gradient(160deg, rgba(15, 23, 42, 0.82), rgba(15, 118, 110, 0.28)), linear-gradient(125deg, rgba(249, 115, 22, 0.16), rgba(59, 130, 246, 0.12))',
  border: '1px solid rgba(148, 163, 184, 0.22)',
  boxShadow: '0 30px 80px rgba(2, 6, 23, 0.42)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  minHeight: 560
};

const loginCardStyle: CSSProperties = {
  borderRadius: 28,
  background: 'rgba(255, 255, 255, 0.96)',
  border: '1px solid rgba(226, 232, 240, 0.9)',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)'
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { setToken, setCurrentUser } = useGlobalStore();
  const [form] = Form.useForm();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      setToken(result.accessToken);
      setCurrentUser(result.user);
      navigate('/');
    },
    onError: () => {
      message.error('登录失败，请检查账号和密码');
    }
  });

  return (
    <div style={shellStyle}>
      <div style={frameStyle}>
        <section style={heroStyle}>
          <div>
            <Typography.Text style={{ color: '#f8fafc', letterSpacing: 3, textTransform: 'uppercase' }}>
              Leixi AI Service Console
            </Typography.Text>
            <Typography.Title style={{ color: '#fff', fontSize: 42, lineHeight: 1.15, marginTop: 18, marginBottom: 18 }}>
              雷析 AI 客服系统
            </Typography.Title>
            <Typography.Paragraph style={{ color: '#cbd5e1', fontSize: 16, maxWidth: 480, marginBottom: 28 }}>
              面向客服、知识库、排班与组织协同的一体化运营后台。统一账号、权限、班次与服务过程数据，减少切换成本。
            </Typography.Paragraph>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 12
            }}
          >
            {[
              ['智能排班', '班次库、周排班、导入导出'],
              ['客服协同', '统一登录、统一权限、统一台账'],
              ['数据闭环', '流程、组织、服务数据串联']
            ].map(([title, desc]) => (
              <div
                key={title}
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: 'rgba(15, 23, 42, 0.28)',
                  border: '1px solid rgba(148, 163, 184, 0.2)'
                }}
              >
                <Typography.Text style={{ color: '#fff', display: 'block', fontWeight: 700, marginBottom: 8 }}>{title}</Typography.Text>
                <Typography.Text style={{ color: '#cbd5e1', fontSize: 13 }}>{desc}</Typography.Text>
              </div>
            ))}
          </div>
        </section>

        <Card bordered={false} style={loginCardStyle} styles={{ body: { padding: 32 } }}>
          <Typography.Text style={{ color: '#f97316', fontWeight: 700, letterSpacing: 1 }}>SIGN IN</Typography.Text>
          <Typography.Title level={3} style={{ marginTop: 12, marginBottom: 8 }}>
            欢迎进入雷析 AI 客服系统
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 28 }}>
            默认管理员账号 `admin`，默认密码 `Admin123456`。如已修改，请使用你的实际凭据登录。
          </Typography.Paragraph>

          <Form form={form} layout="vertical" onFinish={(values) => loginMutation.mutate(values)} size="large">
            <Form.Item label="账号" name="username" rules={[{ required: true, message: '请输入账号' }]}>
              <Input placeholder="请输入账号" />
            </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loginMutation.isPending} style={{ height: 46 }}>
              登录系统
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
}
