import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Checkbox,
  Space,
  Watermark,
  message,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { authApi } from "@/api/auth";
import { useGlobalStore } from "@/models/global";

const { Title, Text } = Typography;

export default function LoginPage() {
  const [form] = Form.useForm();
  const { setToken } = useGlobalStore();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setToken(data.access_token);
      localStorage.setItem("token", data.access_token);
      message.success("登录成功，欢迎回来");
      navigate("/");
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message || "登录失败，请检查账号密码",
      );
    },
  });

  return (
    <Watermark
      content="雷犀 AI 客服系统"
      font={{ color: "rgba(0,0,0,0.05)", fontSize: 16 }}
    >
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 背景光影装饰 */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200 opacity-20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200 opacity-20 blur-[120px] rounded-full" />

        <Card
          bordered={false}
          className="w-full max-w-[440px] shadow-2xl rounded-2xl"
          styles={{ body: { padding: "40px 48px" } }}
        >
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <ThunderboltOutlined className="text-white text-2xl" />
              </div>
            </div>
            <Title
              level={2}
              className="m-0 font-black text-slate-900 tracking-tight"
            >
              雷犀 AI 客服系统
            </Title>
            <Text className="text-slate-500 mt-2 block font-medium">
              LEIXI AI CUSTOMER SERVICE SYSTEM
            </Text>
          </div>

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
                prefix={<UserOutlined className="text-slate-400" />}
                placeholder="用户名 / 账号"
                className="h-[44px] rounded-lg border-slate-200 font-bold text-slate-900"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "请输入登录密码" }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-slate-400" />}
                placeholder="密码"
                className="h-[44px] rounded-lg border-slate-200"
              />
            </Form.Item>

            <div className="flex justify-between items-center mb-6">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox className="font-bold text-slate-600">
                  自动登录
                </Checkbox>
              </Form.Item>
              <Text className="text-blue-600 cursor-pointer font-bold hover:text-blue-500">
                忘记密码?
              </Text>
            </div>

            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loginMutation.isPending}
                className="h-[44px] rounded-lg font-black text-lg shadow-lg shadow-blue-100"
              >
                立即登录
              </Button>
            </Form.Item>

            {/* 注册入口 */}
            <div className="mt-4 text-center">
              <Text className="text-slate-500">
                还没有账号？
                <Text
                  className="text-blue-600 cursor-pointer font-bold hover:text-blue-500 ml-1"
                  onClick={() => navigate("/register")}
                >
                  立即注册
                </Text>
              </Text>
            </div>
          </Form>

          <div className="mt-8 text-center">
            <Space className="text-slate-400 text-xs">
              <SafetyCertificateOutlined />
              <Text className="text-slate-400 text-xs">企业级安全加密保护</Text>
            </Space>
          </div>
        </Card>

        {/* 页脚版权 */}
        <div className="absolute bottom-8 w-full text-center">
          <Text className="text-slate-500 font-bold text-xs uppercase tracking-widest opacity-60">
            © 2026 LEIXI INTELLIGENT TECHNOLOGY ALL RIGHTS RESERVED
          </Text>
        </div>
      </div>
    </Watermark>
  );
}
