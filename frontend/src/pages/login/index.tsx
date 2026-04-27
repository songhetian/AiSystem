import { useState } from "react";
import { useNavigate } from "@umijs/max";
import { useMutation } from "@tanstack/react-query";
import {
  Form,
  Input,
  Button,
  Typography,
  Checkbox,
  Space,
  ConfigProvider,
  message,
  Tooltip,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { authApi } from "@/api/auth";
import { useGlobalStore } from "@/models/global";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { handleLoginSuccess } from "@/utils/auth";
import { enterpriseThemeConfig } from "@/components/common/EnterpriseThemeConfig";

const { Title, Text, Link } = Typography;

export default function LoginPage() {
  const [form] = Form.useForm();
  const { setToken, setCurrentUser } = useGlobalStore();
  const navigate = useNavigate();

  useKeyboardShortcuts({
    "Ctrl+Enter": () => form.submit(),
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      handleLoginSuccess(data);
      setToken(data.access_token || data.accessToken);
      setCurrentUser(data.user);
      message.success("登录成功");
      setTimeout(() => navigate("/", { replace: true }), 100);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || "登录失败");
    },
  });

  return (
    <ConfigProvider theme={enterpriseThemeConfig}>
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        {/* 背景装饰：极简企业线框 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg className="absolute w-full h-full opacity-[0.03]" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 L100 0 M0 50 L50 0 M50 100 L100 50" stroke="#0089FF" strokeWidth="0.1" fill="none" />
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-[400px] bg-white p-10 rounded shadow-[0_8px_24px_rgba(31,35,41,0.1)] border border-[#DEE0E3] animate-data-flow">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-[#0089FF] rounded flex items-center justify-center mb-4 shadow-[0_4px_12px_rgba(0,137,255,0.2)]">
              <span className="text-white font-black text-xl">AI</span>
            </div>
            <Title level={4} className="!m-0 tracking-tight">雷犀 AI 智能质检平台</Title>
            <Text className="text-[#8F959E] text-xs mt-2">企业级 AI 驱动的客服效能管理系统</Text>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={loginMutation.mutate}
            autoComplete="off"
            requiredMark={false}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: "请输入账号" }]}
            >
              <Input
                prefix={<UserOutlined className="text-[#8F959E]" />}
                placeholder="账号"
                className="h-10"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "请输入密码" }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-[#8F959E]" />}
                placeholder="密码"
                className="h-10"
              />
            </Form.Item>

            <div className="flex justify-between items-center mb-6">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox className="text-xs text-[#646A73]">自动登录</Checkbox>
              </Form.Item>
              <Link className="text-xs text-[#0089FF]">忘记密码</Link>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loginMutation.isPending}
                className="h-10 text-sm font-bold"
              >
                登 录
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-6 pt-6 border-t border-[#F0F2F5] text-center">
            <Space size={4}>
              <Text className="text-xs text-[#8F959E]">还没有账号？</Text>
              <Link className="text-xs font-bold" onClick={() => navigate("/register")}>立即注册</Link>
            </Space>
          </div>

          <div className="mt-8 flex justify-center items-center gap-4 text-[#8F959E]">
            <Tooltip title="企业安全认证">
              <SafetyCertificateOutlined className="text-lg opacity-40" />
            </Tooltip>
            <div className="h-3 w-[1px] bg-[#DEE0E3]" />
            <Text className="text-[10px] uppercase tracking-widest opacity-40">LeiXi Intelligence</Text>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}
