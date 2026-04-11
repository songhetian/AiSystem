import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Upload, Tag, message, Space, Modal, Progress, Card, Checkbox } from 'antd';
import { UploadOutlined, DeleteOutlined, FileTextOutlined, GlobalOutlined, LockOutlined } from '@ant-design/icons';
import { knowledgeApi, KnowledgeDocument } from '@/api/knowledge';
import UploadProgressPanel, { UploadingFile } from '@/components/common/UploadProgressPanel';

const KnowledgeDocuments: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isPublic, setIsPublic] = useState(0);
  const [uploadList, setUploadList] = useState<UploadingFile[]>([]);
  const [logVisible, setLogVisible] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<KnowledgeDocument | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDocuments = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await knowledgeApi.listDocuments();
      setDocuments(data);
      const needsPolling = data.some(doc => ['pending', 'processing'].includes(doc.status));
      if (needsPolling && !timerRef.current) startPolling();
      else if (!needsPolling && timerRef.current) stopPolling();
    } catch (err) {
      message.error('获取文档列表失败');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const startPolling = () => {
    timerRef.current = setInterval(() => fetchDocuments(true), 3000);
  };

  const stopPolling = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => {
    fetchDocuments();
    return () => stopPolling();
  }, []);

  const handleUpload = async (options: any) => {
    const { file } = options;
    const uid = file.uid;
    setUploadList(prev => [...prev, { uid, name: file.name, percent: 0, status: 'uploading' }]);

    try {
      await knowledgeApi.uploadDocument(file as File, isPublic, (p) => {
        setUploadList(prev => prev.map(f => f.uid === uid ? { ...f, percent: p } : f));
      });
      setUploadList(prev => prev.map(f => f.uid === uid ? { ...f, status: 'success' } : f));
      setTimeout(() => setUploadList(prev => prev.filter(f => f.uid !== uid)), 2000);
      fetchDocuments();
    } catch (err) {
      setUploadList(prev => prev.map(f => f.uid === uid ? { ...f, status: 'error' } : f));
      message.error(`${file.name} 上传失败`);
    }
  };

  const togglePublic = async (id: string, current: number) => {
    const target = current === 1 ? 0 : 1;
    await knowledgeApi.togglePublicDocument(id, target);
    message.success('范围已更新');
    fetchDocuments();
  };

  const columns = [
    {
      title: '文件名称',
      dataIndex: 'file_name',
      render: (text: string, record: KnowledgeDocument) => (
        <Space>
          <FileTextOutlined className="text-slate-500" />
          <span className="font-bold text-slate-900">{text}</span>
          {record.is_public === 1 && <Tag color="blue" className="font-black text-[10px]">公共</Tag>}
        </Space>
      )
    },
    {
      title: '处理进度',
      dataIndex: 'progress',
      width: 200,
      render: (p: number, record: KnowledgeDocument) => (
        <div className="w-full">
          <Progress percent={record.status === 'completed' ? 100 : p} size="small" strokeColor={record.status === 'failed' ? '#ff4d4f' : '#0f172a'} />
          <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{record.status}</div>
        </div>
      )
    },
    {
      title: '范围',
      dataIndex: 'is_public',
      width: 100,
      render: (val: number, record: KnowledgeDocument) => (
        <Button type="text" size="small" icon={val === 1 ? <GlobalOutlined className="text-blue-500" /> : <LockOutlined className="text-slate-400" />} onClick={() => togglePublic(record.id, val)} className="font-black" />
      )
    },
    {
      title: '操作',
      width: 150,
      render: (_: any, record: KnowledgeDocument) => (
        <Space>
          <Button type="link" size="small" className="font-black" onClick={() => { setCurrentDoc(record); setLogVisible(true); }}>日志</Button>
          <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => {
            Modal.confirm({ title: '确认删除', onOk: () => knowledgeApi.deleteDocument(record.id).then(() => fetchDocuments()) });
          }} />
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-full">
      <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">知识库管理</h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Knowledge Base Management</p>
          </div>
          <Space direction="vertical" align="end" size="middle">
            <Checkbox checked={isPublic === 1} onChange={e => setIsPublic(e.target.checked ? 1 : 0)} className="font-black text-slate-700 text-xs">设为公共知识</Checkbox>
            <Upload multiple accept=".pdf,.docx,.xlsx,.pptx,.jpg,.png" customRequest={handleUpload} showUploadList={false}>
              <Button type="primary" size="large" icon={<UploadOutlined />} className="h-12 px-10 font-black bg-slate-900 border-none rounded-2xl shadow-xl hover:bg-slate-800 transition-all">
                批量上传
              </Button>
            </Upload>
          </Space>
        </div>

        <UploadProgressPanel files={uploadList} />
      </Card>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <Table columns={columns} dataSource={documents} rowKey="id" loading={loading} pagination={{ pageSize: 8 }} className="font-medium" />
      </div>

      <Modal title={<span className="font-black text-slate-900">处理详情 - {currentDoc?.file_name}</span>} open={logVisible} onCancel={() => setLogVisible(false)} footer={null} width={800} centered>
        <div className="bg-slate-900 text-blue-400 p-8 rounded-3xl font-mono text-xs max-h-[500px] overflow-auto leading-loose shadow-inner border border-slate-800">
          <div className="text-slate-500 mb-4 font-black uppercase tracking-tighter border-b border-slate-800 pb-2">Console Output:</div>
          {currentDoc?.process_log || 'Waiting for system response...'}
        </div>
      </Modal>
    </div>
  );
};

export default KnowledgeDocuments;
