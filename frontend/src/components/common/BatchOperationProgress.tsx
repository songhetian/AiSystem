import { Modal, Progress, List, Tag, Space, Button } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";

export interface BatchOperationResult {
  id: string;
  name: string;
  status: "success" | "failed" | "pending";
  message?: string;
}

interface BatchOperationProgressProps {
  visible: boolean;
  title?: string;
  total: number;
  current: number;
  results: BatchOperationResult[];
  onClose: () => void;
}

export function BatchOperationProgress({
  visible,
  title = "批量操作进度",
  total,
  current,
  results,
  onClose,
}: BatchOperationProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const successCount = results.filter((r) => r.status === "success").length;
  const failedCount = results.filter((r) => r.status === "failed").length;
  const pendingCount = results.filter((r) => r.status === "pending").length;
  const isCompleted = current === total;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
      case "failed":
        return <CloseCircleOutlined style={{ color: "#ff4d4f" }} />;
      case "pending":
        return <LoadingOutlined style={{ color: "#1890ff" }} />;
      default:
        return null;
    }
  };

  const getStatusTag = (status: string, message?: string) => {
    switch (status) {
      case "success":
        return <Tag color="success">成功</Tag>;
      case "failed":
        return (
          <Tag color="error" title={message}>
            失败
          </Tag>
        );
      case "pending":
        return <Tag color="processing">处理中...</Tag>;
      default:
        return null;
    }
  };

  return (
    <Modal
      open={visible}
      title={title}
      onCancel={isCompleted ? onClose : undefined}
      closable={isCompleted}
      maskClosable={false}
      footer={
        isCompleted
          ? [
              <Button key="close" type="primary" onClick={onClose}>
                关闭
              </Button>,
            ]
          : null
      }
      width={650}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {/* 进度条 */}
        <div>
          <Progress
            percent={percent}
            status={
              isCompleted
                ? failedCount > 0
                  ? "exception"
                  : "success"
                : "active"
            }
            strokeColor={
              isCompleted && failedCount > 0
                ? "#ff4d4f"
                : {
                    "0%": "#108ee9",
                    "100%": "#87d068",
                  }
            }
          />
          <div style={{ marginTop: 8, color: "#666", fontSize: 14 }}>
            进度：{current} / {total}
            {isCompleted && (
              <span style={{ marginLeft: 16, fontWeight: 500 }}>
                {failedCount === 0 ? "✓ 全部成功" : `⚠ 部分失败`}
              </span>
            )}
          </div>
        </div>

        {/* 统计信息 */}
        <div>
          <Space size="large">
            <div>
              <Tag
                color="success"
                style={{ fontSize: 14, padding: "4px 12px" }}
              >
                成功：{successCount}
              </Tag>
            </div>
            <div>
              <Tag color="error" style={{ fontSize: 14, padding: "4px 12px" }}>
                失败：{failedCount}
              </Tag>
            </div>
            <div>
              <Tag
                color="processing"
                style={{ fontSize: 14, padding: "4px 12px" }}
              >
                待处理：{pendingCount}
              </Tag>
            </div>
          </Space>
        </div>

        {/* 详细列表 */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500, color: "#333" }}>
            操作详情：
          </div>
          <List
            size="small"
            bordered
            dataSource={results}
            renderItem={(item) => (
              <List.Item>
                <Space
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <Space>
                    {getStatusIcon(item.status)}
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                  </Space>
                  <Space>
                    {getStatusTag(item.status, item.message)}
                    {item.status === "failed" && item.message && (
                      <span style={{ fontSize: 12, color: "#999" }}>
                        {item.message}
                      </span>
                    )}
                  </Space>
                </Space>
              </List.Item>
            )}
            style={{
              maxHeight: 350,
              overflow: "auto",
              backgroundColor: "#fafafa",
            }}
          />
        </div>

        {/* 提示信息 */}
        {isCompleted && failedCount > 0 && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#fff7e6",
              border: "1px solid #ffd591",
              borderRadius: 4,
              fontSize: 13,
              color: "#d46b08",
            }}
          >
            ⚠️ 部分操作失败，请检查失败原因并重试
          </div>
        )}
      </Space>
    </Modal>
  );
}
