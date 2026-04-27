import { useState, useRef } from "react";
import { useNavigate } from "@umijs/max";
import { useMutation } from "@tanstack/react-query";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Checkbox,
  Space,
  ConfigProvider,
  theme,
  message,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { authApi } from "@/api/auth";
import { useGlobalStore } from "@/models/global";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { handleLoginSuccess } from "@/utils/auth";

const { Title, Text } = Typography;

export default function LoginPage() {
  const [form] = Form.useForm();
  const { setToken, setCurrentUser } = useGlobalStore();
  const navigate = useNavigate();

  useKeyboardShortcuts({
    "Ctrl+Enter": () => form.submit(),
    "Ctrl+r": () => navigate("/register"),
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      // 1. 使用auth工具类保存Token和用户信息
      handleLoginSuccess(data);

      // 2. 同步状态到 Store
      setToken(data.access_token || data.accessToken);
      setCurrentUser(data.user);

      message.success("登录成功，欢迎回来");

      // 3. 给状态同步留出一点微小的反应时间，防止拦截器竞态
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 100);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || "登录失败，请检查账号密码";
      message.error(errorMessage);
    },
  });

  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 12,
          colorPrimary: '#2563eb',
        },
      }}
    >
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "#f0f2f5",
          backgroundImage: `radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.1) 0px, transparent 50%),
                          radial-gradient(at 100% 100%, rgba(99, 102, 241, 0.1) 0px, transparent 50%)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="relative z-10 w-full max-w-[420px] px-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-6 shadow-xl shadow-blue-200">
              <LockOutlined style={{ fontSize: 32, color: '#fff' }} />
            </div>
            <Title level={3} style={{ fontWeight: 600, margin: 0, letterSpacing: '-0.02em' }}>
              雷犀AI客服管理系统
            </Title>
            <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
              企业级 AI 驱动的客服效能平台
            </Text>
          </div>

          <Card
            bordered={false}
            style={{
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
              borderRadius: '24px'
            }}
            styles={{ body: { padding: "40px" } }}
          >
            <Form
              form={form}
              layout="vertical"
              size="large"
              onFinish={loginMutation.mutate}
              autoComplete="off"
            >
              <Form.Item
                name="username"
                rules={[{ required: true, message: "请输入登录账号" }]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="用户名 / 账号"
                  style={{ height: '48px', background: '#f8fafc' }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: "请输入登录密码" }]}
                style={{ marginBottom: 12 }}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="密码"
                  style={{ height: '48px', background: '#f8fafc' }}
                />
              </Form.Item>

              <div className="flex justify-between items-center mb-8">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox style={{ fontSize: '13px' }}>自动登录</Checkbox>
                </Form.Item>
                <Text style={{ fontSize: '13px', color: '#2563eb', cursor: 'pointer' }}>
                  忘记密码?
                </Text>
              </div>

              <Form.Item className="mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loginMutation.isPending}
                  style={{
                    height: '48px',
                    fontSize: '16px',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                  }}
                >
                  进入系统
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <div className="mt-8 text-center">
            <Space size="middle">
              <Text type="secondary" style={{ fontSize: '13px' }}>
                还没有账号？
              </Text>
              <Button type="link" style={{ padding: 0, fontSize: '13px' }} onClick={() => navigate("/register")}>
                立即注册
              </Button>
            </Space>
          </div>
        </div>

        {/* 底部装饰 */}
        <div className="absolute bottom-8 text-center w-full">
          <Text type="secondary" style={{ fontSize: '12px', opacity: 0.5, letterSpacing: '0.1em' }}>
            Powered by LeiXi Intelligence © 2026
          </Text>
        </div>
      </div>
    </ConfigProvider>
  );
}
