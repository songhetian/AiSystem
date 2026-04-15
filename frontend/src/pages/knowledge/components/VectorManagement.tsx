import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, message, Space, Modal, Typography } from 'antd';
import { DeleteOutlined, KeyOutlined, BlockOutlined } from '@ant-design/icons';
import { knowledgeApi, VectorData } from '@/api/knowledge';

const { Text } = Typography;

export const VectorManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [vectors, setVectors] = useState<VectorData[]>([]);

  const fetchVectors = async () => {
    setLoading(true);
    try {
      // Right now pagination is not fully implemented logically inside this simplified UI, just load initial
      const { points } = await knowledgeApi.listVectors({ limit: 100 });
      setVectors(points);
    } catch (e) {
      message.error('无法拉取 Qdrant 底层区块');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVectors();
  }, []);

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '擦除张量区块',
      content: '确认从内存库中物理删除此特征分块吗？这可能会影响 AI 的准确性。',
      okType: 'danger',
      onOk: async () => {
        try {
          await knowledgeApi.deleteVector(id);
          message.success('已移除脏向量');
          fetchVectors();
        } catch (err) {
          message.error('删除失败');
        }
      }
    });
  };

  const columns = [
    {
      title: '底层 Chunk ID (UUID)',
      dataIndex: 'id',
      width: 320,
      render: (id: string) => (
        <Space>
          <KeyOutlined className="text-slate-400" />
          <Text copyable className="text-xs font-mono text-slate-500">{id}</Text>
        </Space>
      )
    },
    {
      title: '解析归属 (源文件 / 词条)',
      dataIndex: 'file_name',
      render: (fileName: string) => (
        <span className="font-bold text-slate-800">{fileName}</span>
      )
    },
    {
      title: '特征规格 / Dimensions',
      dataIndex: 'vector_size',
      width: 180,
      render: (size: number) => (
        <Badge status="processing" text={<span className="font-mono text-xs text-blue-600 font-bold">{size} d</span>} />
      )
    },
    {
      title: '操作',
      width: 100,
      render: (_: any, record: VectorData) => (
        <Button 
          type="text" 
          danger 
          icon={<DeleteOutlined />} 
          size="small" 
          onClick={() => handleDelete(record.id)}
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BlockOutlined className="text-blue-500" /> 
            底层特征向量管理平台
          </h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Qdrant Vector Inspection</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <Table 
          columns={columns} 
          dataSource={vectors} 
          rowKey="id" 
          loading={loading} 
          pagination={{ pageSize: 12 }} 
          size="middle"
        />
      </div>
    </div>
  );
};
