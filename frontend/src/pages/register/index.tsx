import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Checkbox,
  Select,
  Space,
  Watermark,
  message,
  Progress,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  PhoneOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  LeftOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { authApi } from "@/api/auth";
import { systemApi } from "@/api/system";

const { Title, Text } = Typography;

export default function RegisterPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [captchaKey, setCaptchaKey] = useState("");
  const [captchaImage, setCaptchaImage] = useState("");

  // 获取部门列表
  const { data: departmentsData } = useQuery({
    queryKey: ["public-departments"],
    queryFn: () => systemApi.getPublicDepartments(),
  });

  // 获取图形验证码
  const { refetch: refetchCaptcha, isLoading: captchaLoading } = useQuery({
    queryKey: ["register-captcha"],
    queryFn: async () => {
      const data = await authApi.getCaptcha();
      setCaptchaKey(data.captchaKey);
      setCaptchaImage(data.captchaImage);
      return data;
    },
  });

  // 初始加载验证码
  useEffect(() => {
    refetchCaptcha();
  }, []);

  // 检查手机号
  const checkPhoneMutation = useMutation({
    mutationFn: authApi.checkPhone,
    onSuccess: (data: any) => {
      if (!data.available) {
        message.error(data.message);
        setPhoneChecked(false);
      } else {
        setPhoneChecked(true);
      }
    },
  });

  // 注册
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      message.success({
        content: "注册申请提交成功！请等待管理员审核，审核通过后即可登录",
        duration: 5,
      });
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || "注册失败，请重试");
      // 注册失败后刷新验证码
      refetchCaptcha();
    },
  });

  // 密码强度检测
  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10;
    setPasswordStrength(Math.min(strength, 100));
  };

  // 刷新验证码
  const handleRefreshCaptcha = () => {
    refetchCaptcha();
    form.setFieldValue("code", "");
  };

  // 手机号失焦检查
  const handlePhoneBlur = () => {
    const phone = form.getFieldValue("phone");
    if (phone && /^1[3-9]\d{9}$/.test(phone)) {
      checkPhoneMutation.mutate({ phone });
    }
  };

  // 提交注册
  const handleSubmit = (values: any) => {
    if (!agreedToTerms) {
      message.warning("请先阅读并同意用户注册协议和隐私政策");
      return;
    }
    if (!captchaKey) {
      message.warning("请先获取验证码");
      return;
    }
    registerMutation.mutate({
      name: values.name,
      phone: values.phone,
      deptId: values.deptId,
      password: values.password,
      code: values.code,
      codeKey: captchaKey,
    });
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return "#ff4d4f";
    if (passwordStrength < 70) return "#faad14";
    return "#52c41a";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return "弱";
    if (passwordStrength < 70) return "中";
    return "强";
  };

  return (
    <Watermark
      content="雷犀 AI 客服系统"
      font={{ color: "rgba(0,0,0,0.05)", fontSize: 16 }}
    >
      <div
        className="min-h-screen flex items-center justify-center py-12"
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
          className="w-full max-w-[520px] shadow-2xl rounded-2xl"
          styles={{ body: { padding: "40px 48px" } }}
        >
          {/* 返回登录 */}
          <div className="mb-6">
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={() => navigate("/login")}
              className="text-slate-600 hover:text-blue-600 font-bold"
            >
              返回登录
            </Button>
          </div>

          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <ThunderboltOutlined className="text-white text-2xl" />
              </div>
            </div>
            <Title
              level={2}
              className="m-0 font-black text-slate-900 tracking-tight"
            >
              用户注册
            </Title>
            <Text className="text-slate-500 mt-2 block font-medium">
              填写信息提交注册申请
            </Text>
          </div>

          <Form
            form={form}
            layout="vertical"
            size="large"
            onFinish={handleSubmit}
            autoComplete="off"
          >
            {/* 姓名 */}
            <Form.Item
              name="name"
              label={<span className="font-bold text-slate-700">真实姓名</span>}
              rules={[
                { required: true, message: "请输入真实姓名" },
                {
                  pattern: /^[\u4e00-\u9fa5]{2,10}$/,
                  message: "请输入2-10个有效汉字姓名",
                },
              ]}
            >
              <Input
                prefix={<UserOutlined className="text-slate-400" />}
                placeholder="请输入真实姓名"
                className="h-[44px] rounded-lg border-slate-200"
              />
            </Form.Item>

            {/* 手机号 */}
            <Form.Item
              name="phone"
              label={<span className="font-bold text-slate-700">手机号</span>}
              rules={[
                { required: true, message: "请输入手机号" },
                {
                  pattern: /^1[3-9]\d{9}$/,
                  message: "请输入有效的11位手机号",
                },
              ]}
              validateStatus={
                phoneChecked
                  ? "success"
                  : checkPhoneMutation.isError
                    ? "error"
                    : ""
              }
              hasFeedback
            >
              <Input
                prefix={<PhoneOutlined className="text-slate-400" />}
                placeholder="请输入手机号"
                className="h-[44px] rounded-lg border-slate-200"
                onBlur={handlePhoneBlur}
                suffix={
                  phoneChecked ? (
                    <CheckCircleOutlined className="text-green-500" />
                  ) : null
                }
              />
            </Form.Item>

            {/* 部门选择 */}
            <Form.Item
              name="deptId"
              label={<span className="font-bold text-slate-700">所属部门</span>}
              rules={[{ required: true, message: "请选择所属部门" }]}
            >
              <Select
                placeholder="请选择所属部门"
                className="h-[44px]"
                suffixIcon={<TeamOutlined className="text-slate-400" />}
                loading={!departmentsData}
                options={departmentsData?.data?.map((dept: any) => ({
                  label: dept.name,
                  value: dept.id,
                }))}
              />
            </Form.Item>

            {/* 密码 */}
            <Form.Item
              name="password"
              label={<span className="font-bold text-slate-700">登录密码</span>}
              rules={[
                { required: true, message: "请设置登录密码" },
                {
                  pattern: /^(?![a-zA-Z]+$)(?!\d+$)(?![^\da-zA-Z\s]+$).{8,16}$/,
                  message: "密码需8-16位，包含字母、数字、特殊字符中的至少两种",
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-slate-400" />}
                placeholder="请设置登录密码"
                className="h-[44px] rounded-lg border-slate-200"
                onChange={(e) => checkPasswordStrength(e.target.value)}
              />
            </Form.Item>

            {/* 密码强度 */}
            {passwordStrength > 0 && (
              <div className="mb-6 -mt-2">
                <div className="flex items-center gap-2">
                  <Progress
                    percent={passwordStrength}
                    strokeColor={getPasswordStrengthColor()}
                    showInfo={false}
                    size="small"
                    className="flex-1"
                  />
                  <Text
                    className="text-xs font-bold"
                    style={{ color: getPasswordStrengthColor() }}
                  >
                    {getPasswordStrengthText()}
                  </Text>
                </div>
              </div>
            )}

            {/* 确认密码 */}
            <Form.Item
              name="confirmPassword"
              label={<span className="font-bold text-slate-700">确认密码</span>}
              dependencies={["password"]}
              rules={[
                { required: true, message: "请确认密码" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("两次密码输入不一致，请重新输入"),
                    );
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-slate-400" />}
                placeholder="请确认密码"
                className="h-[44px] rounded-lg border-slate-200"
              />
            </Form.Item>

            {/* 验证码 */}
            <Form.Item
              name="code"
              label={<span className="font-bold text-slate-700">验证码</span>}
              rules={[
                { required: true, message: "请输入验证码" },
                { len: 4, message: "验证码必须是4位" },
              ]}
            >
              <div className="flex gap-2">
                <Input
                  placeholder="请输入验证码"
                  className="h-[44px] rounded-lg border-slate-200 flex-1"
                  maxLength={4}
                />
                {captchaImage && (
                  <div
                    className="h-[44px] w-[120px] border border-slate-200 rounded-lg cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center bg-white"
                    onClick={handleRefreshCaptcha}
                    title="点击刷新验证码"
                  >
                    <img
                      src={captchaImage}
                      alt="验证码"
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
                <Button
                  className="h-[44px] rounded-lg font-bold"
                  onClick={handleRefreshCaptcha}
                  loading={captchaLoading}
                  icon={<ReloadOutlined />}
                >
                  刷新
                </Button>
              </div>
            </Form.Item>

            {/* 协议勾选 */}
            <Form.Item className="mb-6">
              <Checkbox
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="font-bold text-slate-600"
              >
                我已阅读并同意
                <Text className="text-blue-600 cursor-pointer hover:text-blue-500 mx-1">
                  《用户注册协议》
                </Text>
                和
                <Text className="text-blue-600 cursor-pointer hover:text-blue-500 ml-1">
                  《隐私政策》
                </Text>
              </Checkbox>
            </Form.Item>

            {/* 提交按钮 */}
            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={registerMutation.isPending}
                disabled={!agreedToTerms}
                className="h-[44px] rounded-lg font-black text-lg shadow-lg shadow-blue-100"
              >
                提交注册
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-8 text-center">
            <Space className="text-slate-400 text-xs">
              <SafetyCertificateOutlined />
              <Text className="text-slate-400 text-xs">
                您的信息将被严格保密
              </Text>
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
