import React, { useRef, useState } from 'react';
import { Space, Typography, Modal, Popconfirm, Tabs, message, Button, Input, Form } from 'antd';
import { BaseTable } from '@/components/BaseTable';
import { Permission } from '@/components/Permission';
import { serviceApi } from '@/api/service';

const { Text } = Typography;

export default function QualityTagsPage() {
  const [activeKey, setActiveKey] = useState<string>('pending');
  const tableRef = useRef<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [dedupModalVisible, setDedupModalVisible] = useState(false);
  const [dedupForm] = Form.useForm();
  
  const handleAudit = async (action: 'confirm' | 'reject', rejectReason?: string) => {
    if (selectedRowKeys.length === 0) {
      return message.warning('请至少选择一条标签数据');
    }
    
    try {
      if (action === 'confirm') {
        await serviceApi.confirmQualityTags({ ids: selectedRowKeys as string[] });
        message.success(`已成功确认并入库 ${selectedRowKeys.length} 条智能标签`);
      } else {
        await serviceApi.rejectQualityTags({ ids: selectedRowKeys as string[], reject_reason: rejectReason });
        message.success(`已驳回 ${selectedRowKeys.length} 条质检标签`);
      }
      setSelectedRowKeys([]);
      tableRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || '操作异常');
    }
  };

  const handleDedup = async () => {
     try {
       const values = await dedupForm.validateFields();
       const sourceTagsInput = values.source_tags.split(',').map((s: string) => s.trim()).filter(Boolean);
       if (sourceTagsInput.length === 0) return message.warning('请输入需要被合并的原标签');
       
       await serviceApi.dedupQualityTags({
         target_tag_name: values.target_tag,
         source_tag_names: sourceTagsInput
       });
       message.success('智能去重合并工作已提交完成');
       setDedupModalVisible(false);
       tableRef.current?.reload();
     } catch (e: any) {
       if (e.errorFields) return;
       message.error(e.message || '去重失败');
     }
  };

  const columns = [
    {
      title: '智能抽取标签字面',
      dataIndex: 'tag_name',
      width: 250,
      render: (val: string) => <Text className="text-slate-900 font-black px-3 py-1 bg-slate-100 rounded border border-slate-300">{val}</Text>,
    },
    {
      title: '标签切面源',
      dataIndex: 'tag_type',
      width: 150,
      render: (val: string) => <Text className="text-slate-700 font-bold">{val === 'quality' ? '对话质检推断' : val}</Text>,
    },
    {
      title: '源会话关联',
      dataIndex: 'session_no',
      width: 200,
      render: (val: string) => <Text className="text-indigo-600 font-bold hover:underline cursor-pointer">{val}</Text>,
    },
    ...(activeKey === 'rejected' ? [{
      title: '驳回理由/纠偏',
      dataIndex: 'reject_reason',
      render: (val: string) => <Text className="text-rose-600 font-medium">{val || '未填'}</Text>,
    }] : []),
    {
      title: '抽取产生时间',
      dataIndex: 'create_time',
      width: 180,
      render: (val: string) => <Text className="text-slate-500 font-bold">{new Date(val).toLocaleString()}</Text>,
    },
  ];

  return (
    <div className="p-6 h-full flex flex-col pt-2">
      <Tabs
        activeKey={activeKey}
        onChange={(k) => {
          setActiveKey(k);
          setSelectedRowKeys([]);
          setTimeout(() => tableRef.current?.reload(), 0);
        }}
        items={[
          { key: 'pending', label: <span className="font-bold text-base px-2">待复审确认池</span> },
          { key: 'confirmed', label: <span className="font-bold text-base px-2 text-emerald-600">已生效/库内标签</span> },
          { key: 'rejected', label: <span className="font-bold text-base px-2 text-slate-400">已驳回阻截</span> },
        ]}
        tabBarExtraContent={
          activeKey === 'confirmed' && (
            <Permission button_code="service:tag:dedup">
              <Button type="primary" className="bg-slate-900 font-black" onClick={() => setDedupModalVisible(true)}>
                执行智库一键去重合并
              </Button>
            </Permission>
          )
        }
      />

      <div className="flex-1 bg-white border border-slate-200">
        <BaseTable
          ref={tableRef}
          request={(params) => serviceApi.queryQualityTags({ ...params, status: activeKey })}
          columns={columns}
          rowKey="id"
          hideSearch
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          rowClassName={() => 'hover:bg-slate-50 cursor-pointer'}
          headerTitle={
            activeKey === 'pending' && selectedRowKeys.length > 0 && (
              <Space className="py-2 bg-slate-50 px-4 rounded border border-slate-200 w-full animate-fade-in shadow-sm">
                <Text className="text-slate-600 font-bold">已揽收选中 <span className="text-slate-900 font-black text-lg">{selectedRowKeys.length}</span> 项准备流转操作:</Text>
                <Permission button_code="service:tag:audit">
                  <Button type="primary" onClick={() => handleAudit('confirm')} className="bg-slate-900 font-black text-white hover:bg-slate-800 ml-4 border-black">
                    批量通过并释放入库
                  </Button>
                  <Button danger onClick={() => handleAudit('reject')} className="font-bold bg-white ml-2">
                    直接物理驳回
                  </Button>
                </Permission>
              </Space>
            )
          }
        />
      </div>

      <Modal
        title={<span className="text-slate-900 font-black text-lg">标签语义去重合并</span>}
        open={dedupModalVisible}
        onOk={handleDedup}
        onCancel={() => setDedupModalVisible(false)}
        destroyOnClose
        okText="确认立即合并替换"
        okButtonProps={{ className: 'bg-rose-600 text-white font-black border-transparent hover:bg-rose-700' }}
        cancelButtonProps={{ className: 'font-bold' }}
      >
        <div className="bg-amber-50 text-amber-800 p-4 rounded mb-6 border border-amber-200 font-bold">
           警告提示: 该操作不可逆，将把底层的杂乱源标签统一修正挂载到目标标准分类标签下，以降低图谱复杂度负荷并提升召回精度。
        </div>
        <Form form={dedupForm} layout="vertical">
          <Form.Item label={<Text className="text-slate-900 font-bold">标准目标标签字面</Text>} name="target_tag" rules={[{ required: true }]}>
             <Input placeholder="输入清洗后准备保留的准确标签名" size="large" className="font-black" />
          </Form.Item>
          <Form.Item label={<Text className="text-slate-900 font-bold">将被合并吞噬的源标签组 (使用英文逗号拼接)</Text>} name="source_tags" rules={[{ required: true }]}>
             <Input.TextArea placeholder="例如: 物流太慢,快递超级无语,这物流..." rows={3} className="font-bold text-slate-700" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
