import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Alert,
  Progress,
  List,
  Card,
  Tag,
  Divider,
  Spin,
  Empty,
  message,
} from 'antd';
import {
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BulbOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import qualityPromptApi, { type PreviewPromptDto, type PreviewResult } from '@/api/quality-prompt';

interface PromptPreviewProps {
  /**
   * 是否显示对话框
   */
  open: boolean;
  /**
   * 关闭对话框回调
   */
  onClose: () => void;
  /**
   * 当前Prompt内容
   */
  promptContent: string;
  /**
   * 对话框标题
   */
  title?: string;
}

/**
 * Prompt预览组件
 * 允许用户输入测试对话内容，预览质检效果
 *
 * 功能:
 * - 输入测试对话内容
 * - 执行质检预览（不持久化）
 * - 显示质检结果：分数、违规列表、建议
 * - 支持重新运行预览
 *
 * 需求: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */
export const PromptPreview: React.FC<PromptPreviewProps> = ({
  open,
  onClose,
  promptContent,
  title = 'Prompt预览',
}) => {
  const [form] = Form.useForm();
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);

  // 预览mutation
  const previewMutation = useMutation({
    mutationFn: (data: PreviewPromptDto) => qualityPromptApi.previewPrompt(data),
    onSuccess: (result) => {
      setPreviewResult(result);
      message.success('预览执行成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '预览执行失败');
    },
  });

  // 处理预览
  const handlePreview = async () => {
    try {
      const values = await form.validateFields();
      const dto: PreviewPromptDto = {
        content: promptContent,
        test_conversation: values.test_conversation,
      };
      previewMutation.mutate(dto);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 重置预览
  const handleReset = () => {
    form.resetFields();
    setPreviewResult(null);
  };

  // 关闭对话框
  const handleClose = () => {
    handleReset();
    onClose();
  };

  // 获取分数颜色
  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#52c41a'; // 绿色
    if (score >= 70) return '#faad14'; // 橙色
    return '#ff4d4f'; // 红色
  };

  // 获取分数状态
  const getScoreStatus = (score: number): 'success' | 'exception' | 'normal' => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'normal';
    return 'exception';
  };

  return (
    <Modal
      title={
        <Space>
          <EyeOutlined />
          <span>{title}</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="reset" onClick={handleReset}>
          重置
        </Button>,
        <Button key="close" onClick={handleClose}>
          关闭
        </Button>,
        <Button
          key="preview"
          type="primary"
          icon={<EyeOutlined />}
          onClick={handlePreview}
          loading={previewMutation.isPending}
        >
          执行预览
        </Button>,
      ]}
      width={900}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          message="预览说明"
          description="预览功能允许您在保存Prompt前测试质检效果。输入测试对话内容，系统将使用当前Prompt内容执行质检，但不会将结果保存到数据库。"
          type="info"
          showIcon
          closable
        />
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          label="测试对话内容"
          name="test_conversation"
          rules={[
            { required: true, message: '请输入测试对话内容' },
            { min: 10, message: '测试对话内容至少10个字符' },
            { max: 5000, message: '测试对话内容不能超过5000个字符' },
          ]}
          tooltip="输入一段客服对话内容，用于测试Prompt的质检效果"
        >
          <Input.TextArea
            rows={6}
            placeholder="请输入测试对话内容，例如：&#10;客户：你好，我想咨询一下产品价格&#10;客服：您好，请问您需要咨询哪款产品？&#10;客户：就是你们的旗舰款&#10;客服：好的，我帮您查询一下..."
            showCount
            maxLength={5000}
          />
        </Form.Item>
      </Form>

      <Divider>预览结果</Divider>

      {previewMutation.isPending && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" tip="正在执行质检预览，请稍候..." />
        </div>
      )}

      {!previewMutation.isPending && !previewResult && (
        <Empty
          description='暂无预览结果，请输入测试对话内容并点击"执行预览"按钮'
          style={{ padding: '40px 0' }}
        />
      )}

      {!previewMutation.isPending && previewResult && (
        <div>
          {/* 质检分数 */}
          <Card
            size="small"
            title={
              <Space>
                {previewResult.summary.passed ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
                <span>质检分数</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={previewResult.score}
                strokeColor={getScoreColor(previewResult.score)}
                status={getScoreStatus(previewResult.score)}
                format={(percent) => (
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 'bold' }}>{percent}</div>
                    <div style={{ fontSize: 14, color: '#999' }}>分</div>
                  </div>
                )}
              />
              <div style={{ marginTop: 16 }}>
                <Space size={24}>
                  <div>
                    <div style={{ fontSize: 12, color: '#999' }}>总违规数</div>
                    <div style={{ fontSize: 20, fontWeight: 'bold', color: '#ff4d4f' }}>
                      {previewResult.summary.totalViolations}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#999' }}>总扣分</div>
                    <div style={{ fontSize: 20, fontWeight: 'bold', color: '#ff4d4f' }}>
                      {previewResult.summary.totalDeduction}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#999' }}>质检结果</div>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                      {previewResult.summary.passed ? (
                        <Tag color="success">通过</Tag>
                      ) : (
                        <Tag color="error">不通过</Tag>
                      )}
                    </div>
                  </div>
                </Space>
              </div>
            </div>
          </Card>

          {/* 违规列表 */}
          {previewResult.violations.length > 0 && (
            <Card
              size="small"
              title={
                <Space>
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  <span>违规详情</span>
                  <Tag color="error">{previewResult.violations.length} 项</Tag>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <List
                dataSource={previewResult.violations}
                renderItem={(violation, index) => (
                  <List.Item key={index}>
                    <List.Item.Meta
                      avatar={
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: '#ff4d4f',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                          }}
                        >
                          {index + 1}
                        </div>
                      }
                      title={
                        <Space>
                          <span>{violation.rule}</span>
                          <Tag color={violation.source === 'global' ? 'blue' : 'orange'}>
                            {violation.source === 'global' ? '全局规则' : '部门规则'}
                          </Tag>
                        </Space>
                      }
                      description={
                        <div>
                          <div style={{ marginBottom: 4 }}>
                            <span style={{ color: '#999' }}>扣分: </span>
                            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                              -{violation.deduction} 分
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#999' }}>来源Prompt: </span>
                            <span>{violation.promptName}</span>
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}

          {/* 改进建议 */}
          {previewResult.suggestions.length > 0 && (
            <Card
              size="small"
              title={
                <Space>
                  <BulbOutlined style={{ color: '#faad14' }} />
                  <span>改进建议</span>
                  <Tag color="warning">{previewResult.suggestions.length} 条</Tag>
                </Space>
              }
            >
              <List
                dataSource={previewResult.suggestions}
                renderItem={(suggestion, index) => (
                  <List.Item key={index}>
                    <Space>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: '#faad14',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 'bold',
                        }}
                      >
                        {index + 1}
                      </div>
                      <span>{suggestion}</span>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          )}

          {/* 重新运行按钮 */}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={handlePreview}
              loading={previewMutation.isPending}
            >
              重新运行预览
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
