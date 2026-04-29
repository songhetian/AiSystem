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
} from "antd";
import {
  UserOutlined,
  LockOutlined,
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
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="w-full max-w-[420px] p-8">
          {/* Logo 部分 */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-10 h-10 bg-[#0F172A] rounded flex items-center justify-center mb-6">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <Title level={3} className="!mb-2 !text-[#0F172A] tracking-tight font-bold">登录系统</Title>
            <Text className="text-[#64748B]">请输入您的凭据以访问控制台</Text>
          </div>

          <div className="bg-white p-8 rounded-lg border border-[#E2E8F0] shadow-sm">
            <Form
              form={form}
              layout="vertical"
              onFinish={loginMutation.mutate}
              autoComplete="off"
              requiredMark={false}
            >
              <Form.Item
                label={<span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">账号</span>}
                name="username"
                rules={[{ required: true, message: "请输入账号" }]}
              >
                <Input
                  prefix={<UserOutlined className="text-[#94A3B8]" />}
                  placeholder="admin"
                  className="h-11"
                />
              </Form.Item>

              <Form.Item
                label={<span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">密码</span>}
                name="password"
                rules={[{ required: true, message: "请输入密码" }]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-[#94A3B8]" />}
                  placeholder="••••••••"
                  className="h-11"
                />
              </Form.Item>

              <div className="flex justify-between items-center mb-8">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox className="text-sm text-[#64748B]">保持登录</Checkbox>
                </Form.Item>
                <Link className="text-sm !text-[#64748B] hover:!text-[#0F172A] transition-colors">忘记密码？</Link>
              </div>

              <Form.Item className="mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loginMutation.isPending}
                  className="h-11 text-sm font-semibold bg-[#0F172A] border-[#0F172A]"
                >
                  进 入 系 统
                </Button>
              </Form.Item>
            </Form>
          </div>

          <div className="mt-8 text-center">
            <Text className="text-sm text-[#64748B]">还没有账号？ </Text>
            <Link 
              className="text-sm font-semibold !text-[#0F172A] hover:underline" 
              onClick={() => navigate("/register")}
            >
              立即注册
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        /* 极致简约登录页补丁 */
        body {
          background-color: #FAFAFA !important;
        }
        .ant-form-item-label > label {
          height: auto !important;
        }
        .ant-input-affix-wrapper:focus, .ant-input-affix-wrapper-focused {
          border-color: #0F172A !important;
          box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1) !important;
        }
        .ant-btn-primary:hover {
          background-color: #1E293B !important;
          border-color: #1E293B !important;
        }
      `}</style>
    </ConfigProvider>
  );
}
