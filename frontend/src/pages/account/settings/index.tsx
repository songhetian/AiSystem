import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Menu,
  Typography,
  Form,
  Input,
  Button,
  Upload,
  Avatar,
  Space,
  Divider,
  message,
} from "antd";
import {
  UserOutlined,
  SafetyOutlined,
  UploadOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useGlobalStore } from "@/models/global";
import { systemApi } from "@/api/system";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const { Title, Text } = Typography;

type SettingsTab = "base" | "security";

export default function AccountSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("base");
  const { currentUser } = useGlobalStore();
  const [baseForm] = Form.useForm();
  const [pwdForm] = Form.useForm();
  const { clearDraft: clearBaseDraft } = useFormDraft(
    baseForm,
    "account-base-settings",
  );
  const { clearDraft: clearPwdDraft } = useFormDraft(
    pwdForm,
    "account-pwd-settings",
  );
  const queryClient = useQueryClient();

  useKeyboardShortcuts({
    "Ctrl+s": () => {
      if (activeTab === "base") {
        baseForm.submit();
      } else {
        pwdForm.submit();
      }
    },
    "Ctrl+1": () => setActiveTab("base"),
    "Ctrl+2": () => setActiveTab("security"),
  });

  const updatePwdMutation = useMutation({
    mutationFn: (data: any) => systemApi.updateProfilePassword(data),
    onSuccess: () => {
      message.success("密码修改成功，下次登录生效");
      pwdForm.resetFields();
      clearPwdDraft();
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || "原密码校验失败");
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => systemApi.updateProfile(data),
    onSuccess: () => {
      message.success("个人信息更新成功");
      clearBaseDraft();
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || "更新失败");
    },
  });

  return (
    <div className="p-4 bg-slate-50 min-h-screen">
      <Card
        bordered={false}
        className="shadow-sm rounded-xl overflow-hidden"
        styles={{ body: { padding: 0 } }}
      >
        <div className="flex flex-col md:flex-row min-h-[600px]">
          {/* 左侧菜单 - 物理隔离 */}
          <div className="w-full md:w-64 bg-white border-r border-slate-200 py-4">
            <div className="px-6 mb-6">
              <Title level={4} className="font-black text-slate-900 m-0">
                个人设置
              </Title>
              <Text className="text-slate-500 text-xs uppercase tracking-widest font-bold">
                Profile Settings
              </Text>
            </div>
            <Menu
              mode="inline"
              selectedKeys={[activeTab]}
              className="border-none"
              onClick={({ key }) => setActiveTab(key as SettingsTab)}
              items={[
                {
                  key: "base",
                  icon: <UserOutlined />,
                  label: <span className="font-bold">基本设置</span>,
                },
                {
                  key: "security",
                  icon: <SafetyOutlined />,
                  label: <span className="font-bold">安全设置</span>,
                },
              ]}
            />
          </div>

          {/* 右侧内容区 */}
          <div className="flex-grow bg-white p-10">
            {activeTab === "base" ? (
              <div className="max-w-2xl">
                <Title level={4} className="font-black text-slate-900 mb-8">
                  基本设置
                </Title>
                <div className="flex flex-col md:flex-row gap-12">
                  <div className="flex-grow">
                    <Form
                      form={baseForm}
                      layout="vertical"
                      initialValues={currentUser}
                      onFinish={updateProfileMutation.mutate}
                    >
                      <Form.Item
                        label={
                          <Text className="font-black text-slate-600">
                            登录用户名
                          </Text>
                        }
                        name="username"
                      >
                        <Input
                          disabled
                          className="h-[44px] bg-slate-50 text-slate-400 font-bold border-slate-200"
                        />
                      </Form.Item>
                      <Form.Item
                        label={
                          <Text className="font-black text-slate-900">
                            展示姓名
                          </Text>
                        }
                        name="name"
                        rules={[{ required: true }]}
                      >
                        <Input className="h-[44px] font-bold text-slate-900 border-slate-300 focus:border-slate-900" />
                      </Form.Item>
                      <Form.Item
                        label={
                          <Text className="font-black text-slate-900">
                            联系电话
                          </Text>
                        }
                        name="phone"
                      >
                        <Input className="h-[44px] font-bold text-slate-900 border-slate-300" />
                      </Form.Item>
                      <Form.Item
                        label={
                          <Text className="font-black text-slate-900">
                            电子邮箱
                          </Text>
                        }
                        name="email"
                      >
                        <Input className="h-[44px] font-bold text-slate-900 border-slate-300" />
                      </Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={updateProfileMutation.isPending}
                        className="h-[44px] px-10 font-black text-lg mt-4 bg-slate-900 border-none hover:!bg-slate-800"
                      >
                        保存基本信息
                      </Button>
                    </Form>
                  </div>
                  <div className="w-48 flex flex-col items-center">
                    <Avatar
                      size={120}
                      src={currentUser?.avatar}
                      icon={<UserOutlined />}
                      className="shadow-lg border-4 border-slate-100 mb-4"
                    />
                    <Upload showUploadList={false}>
                      <Button
                        icon={<UploadOutlined />}
                        className="font-black h-[40px] border-slate-900"
                      >
                        更换头像
                      </Button>
                    </Upload>
                    <Text className="text-slate-500 text-xs mt-4 text-center px-4">
                      建议使用 200x200 以上的 JPG/PNG 格式图片
                    </Text>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-md">
                <Title level={4} className="font-black text-slate-900 mb-8">
                  安全设置
                </Title>
                <Form
                  form={pwdForm}
                  layout="vertical"
                  onFinish={updatePwdMutation.mutate}
                >
                  <Form.Item
                    label={
                      <Text className="font-black text-slate-900">原密码</Text>
                    }
                    name="oldPassword"
                    rules={[{ required: true }]}
                  >
                    <Input.Password className="h-[44px] font-bold border-slate-300" />
                  </Form.Item>
                  <Divider className="my-6 border-slate-100" />
                  <Form.Item
                    label={
                      <Text className="font-black text-slate-900">新密码</Text>
                    }
                    name="newPassword"
                    rules={[
                      { required: true },
                      { min: 6, message: "密码至少6位" },
                    ]}
                  >
                    <Input.Password className="h-[44px] font-bold border-slate-300" />
                  </Form.Item>
                  <Form.Item
                    label={
                      <Text className="font-black text-slate-900">
                        确认新密码
                      </Text>
                    }
                    name="confirm"
                    dependencies={["newPassword"]}
                    rules={[
                      { required: true },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("newPassword") === value)
                            return Promise.resolve();
                          return Promise.reject(
                            new Error("两次输入的密码不一致"),
                          );
                        },
                      }),
                    ]}
                  >
                    <Input.Password className="h-[44px] font-bold border-slate-300" />
                  </Form.Item>
                  <Button
                    type="primary"
                    danger
                    htmlType="submit"
                    loading={updatePwdMutation.isPending}
                    className="h-[44px] px-10 font-black text-lg mt-4"
                  >
                    立即重置密码
                  </Button>
                </Form>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
