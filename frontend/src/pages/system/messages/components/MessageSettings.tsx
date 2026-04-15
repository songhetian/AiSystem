import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Card,
  Checkbox,
  Form,
  Space,
  Switch,
  TimePicker,
  Typography,
  message,
} from "antd";
import { BellOutlined, MoonOutlined, SettingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { systemApi } from "@/api/system";

const { Title, Text } = Typography;

export function MessageSettings() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["message-settings"],
    queryFn: systemApi.getMessageSettings,
  });

  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        channels: settings.channels || ["system"],
        dnd_enabled: settings.dnd_enabled || false,
        dnd_time:
          settings.dnd_start && settings.dnd_end
            ? [
                dayjs(settings.dnd_start, "HH:mm"),
                dayjs(settings.dnd_end, "HH:mm"),
              ]
            : [dayjs("22:00", "HH:mm"), dayjs("08:00", "HH:mm")],
        dnd_allow_urgent: settings.dnd_allow_urgent !== false,
      });
    }
  }, [settings, form]);

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      systemApi.saveMessageSettings({
        channels: values.channels,
        dnd_enabled: values.dnd_enabled,
        dnd_start: values.dnd_time?.[0]?.format("HH:mm"),
        dnd_end: values.dnd_time?.[1]?.format("HH:mm"),
        dnd_allow_urgent: values.dnd_allow_urgent,
      }),
    onSuccess: () => {
      message.success("消息设置已保存");
      queryClient.invalidateQueries({ queryKey: ["message-settings"] });
    },
    onError: () => message.error("保存失败，请重试"),
  });

  const handleChange = () => {
    form.validateFields().then((values) => saveMutation.mutate(values));
  };

  return (
    <div className="p-6 max-w-2xl">
      <Space direction="vertical" style={{ width: "100%" }} size={20}>
        {/* 接收渠道 */}
        <Card
          title={
            <Space>
              <BellOutlined className="text-blue-600" />
              <Title level={5} style={{ margin: 0 }}>
                接收渠道设置
              </Title>
            </Space>
          }
          size="small"
          className="rounded-xl border-slate-200 shadow-sm"
        >
          <Form form={form} layout="vertical" onValuesChange={handleChange}>
            <Form.Item name="channels" label="选择接收方式">
              <Checkbox.Group>
                <Space direction="vertical" size={12}>
                  <Checkbox value="system">
                    <Space direction="vertical" size={0}>
                      <Text className="font-bold">系统内消息</Text>
                      <Text type="secondary" className="text-xs">
                        在通知中心接收消息提醒
                      </Text>
                    </Space>
                  </Checkbox>
                  <Checkbox value="sms">
                    <Space direction="vertical" size={0}>
                      <Text className="font-bold">短信通知</Text>
                      <Text type="secondary" className="text-xs">
                        重要消息通过短信推送
                      </Text>
                    </Space>
                  </Checkbox>
                  <Checkbox value="email">
                    <Space direction="vertical" size={0}>
                      <Text className="font-bold">邮件通知</Text>
                      <Text type="secondary" className="text-xs">
                        通过邮件接收消息摘要
                      </Text>
                    </Space>
                  </Checkbox>
                </Space>
              </Checkbox.Group>
            </Form.Item>
          </Form>
        </Card>

        {/* 免打扰设置 */}
        <Card
          title={
            <Space>
              <MoonOutlined className="text-indigo-600" />
              <Title level={5} style={{ margin: 0 }}>
                免打扰设置
              </Title>
            </Space>
          }
          size="small"
          className="rounded-xl border-slate-200 shadow-sm"
        >
          <Form form={form} layout="vertical" onValuesChange={handleChange}>
            <Form.Item
              name="dnd_enabled"
              label="开启免打扰"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prev, curr) =>
                prev.dnd_enabled !== curr.dnd_enabled
              }
            >
              {({ getFieldValue }) =>
                getFieldValue("dnd_enabled") ? (
                  <>
                    <Form.Item name="dnd_time" label="免打扰时间段">
                      <TimePicker.RangePicker
                        format="HH:mm"
                        placeholder={["开始时间", "结束时间"]}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                    <Form.Item name="dnd_allow_urgent" valuePropName="checked">
                      <Checkbox>
                        <Space direction="vertical" size={0}>
                          <Text className="font-bold">
                            免打扰期间仍接收紧急消息
                          </Text>
                          <Text type="secondary" className="text-xs">
                            如系统告警、安全通知等
                          </Text>
                        </Space>
                      </Checkbox>
                    </Form.Item>
                    <Alert
                      type="info"
                      message="免打扰期间，短信和邮件通知将暂停推送，系统内消息仍正常接收但不弹窗提示。"
                      showIcon
                      className="rounded-lg"
                    />
                  </>
                ) : null
              }
            </Form.Item>
          </Form>
        </Card>

        <Text type="secondary" className="text-xs">
          <SettingOutlined className="mr-1" />
          设置修改后立即生效，无需重新登录。
        </Text>
      </Space>
    </div>
  );
}
