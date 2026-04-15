import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { knowledgeApi } from "@/api/knowledge";

const { Text } = Typography;

export function VectorManager() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");

  const { data: vectors = [], isLoading } = useQuery({
    queryKey: ["knowledge-vectors", keyword],
    queryFn: () => knowledgeApi.listVectors({ keyword: keyword || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => knowledgeApi.deleteVector(id),
    onSuccess: () => {
      message.success("向量已删除（原始文件不受影响）");
      queryClient.invalidateQueries({ queryKey: ["knowledge-vectors"] });
    },
    onError: () => message.error("删除失败"),
  });

  const regenerateMutation = useMutation({
    mutationFn: (docId: string) => knowledgeApi.regenerateVector(docId),
    onSuccess: () => {
      message.success("向量重新生成任务已提交");
      queryClient.invalidateQueries({ queryKey: ["knowledge-vectors"] });
    },
    onError: () => message.error("重新生成失败"),
  });

  const columns = [
    {
      title: "向量 ID",
      dataIndex: "id",
      width: 200,
      render: (id: string) => (
        <Text className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
          {id.slice(0, 20)}...
        </Text>
      ),
    },
    {
      title: "关联文件",
      dataIndex: "file_name",
      render: (name: string) => (
        <Text className="font-bold text-slate-900">{name}</Text>
      ),
    },
    {
      title: "向量维度",
      dataIndex: "dimension",
      width: 100,
      render: (dim: number) => (
        <Tag color="blue" className="font-bold">
          {dim}维
        </Tag>
      ),
    },
    {
      title: "导入时间",
      dataIndex: "create_time",
      width: 160,
      render: (t: string) => (
        <Text className="text-slate-500 text-xs">
          {new Date(t).toLocaleString()}
        </Text>
      ),
    },
    {
      title: "操作",
      width: 140,
      render: (_: any, record: any) => (
        <Space size={8}>
          <Tooltip title="重新生成向量">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              loading={regenerateMutation.isPending}
              onClick={() => regenerateMutation.mutate(record.doc_id)}
              className="text-blue-600"
            />
          </Tooltip>
          <Tooltip title="删除向量（不删除原始文件）">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: "确认删除向量",
                  content:
                    "删除后仅移除 Qdrant 中的向量数据，原始文件不受影响。",
                  okButtonProps: { danger: true },
                  onOk: () => deleteMutation.mutate(record.id),
                });
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined className="text-purple-600" />
          <span className="font-bold">向量数据管理</span>
        </Space>
      }
      size="small"
      className="rounded-xl border-slate-200 shadow-sm"
      extra={
        <Text type="secondary" className="text-xs">
          共 {vectors.length} 条向量数据
        </Text>
      }
    >
      <div className="mb-4">
        <Input
          prefix={<SearchOutlined className="text-slate-400" />}
          placeholder="搜索向量 ID 或关联文件名"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 320 }}
          allowClear
        />
      </div>

      <Table
        columns={columns}
        dataSource={vectors}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        size="small"
      />
    </Card>
  );
}
