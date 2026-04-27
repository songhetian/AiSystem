/**
 * 操作日志列表页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和用户体验
 */

import React, { useState, useEffect } from 'react';
import { message, Space } from 'antd';
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import { PageContainer, SectionCard } from '@/components/layout';
import { FilterBar, ActionBar, StatusTag } from '@/components/business';
import { Table, Button, Drawer } from '@/components/ui';
import { request } from '@/utils/request';
import { formatDate } from '@/utils/format';

/**
 * 操作日志数据类型
 */
interface OperationLog {
  id: number;
  userId: number;
  username: string;
  name: string;
  module: string;
  action: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  status: number;
  duration: number;
  errorMessage?: string;
  requestBody?: any;
  responseBody?: any;
  changes?: any;
  createdAt: string;
}

const OperationLogPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<OperationLog[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<any>({});
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<OperationLog | null>(null);

  // 表格列配置
  const columns = [
    {
      title: '操作人',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (text: string, record: OperationLog) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.username}</div>
        </div>
      ),
    },
    {
      title: '操作模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 100,
    },
    {
      title: '请求方法',
      dataIndex: 'method',
      key: 'method',
      width: 100,
      render: (method: string) => {
        const colorMap: Record<string, string> = {
          GET: 'info',
          POST: 'success',
          PUT: 'warning',
          DELETE: 'danger',
          PATCH: 'warning',
        };
        return <StatusTag status={colorMap[method] as any} text={method} showDot={false} />;
      },
    },
    {
      title: '请求路径',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 140,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number) => (
        <StatusTag
          status={status >= 200 && status < 300 ? 'success' : 'error'}
          text={status.toString()}
        />
      ),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => `${duration}ms`,
    },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => formatDate(date),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: OperationLog) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  // 加载数据
  const loadData = async (page = 1, pageSize = 10, filterValues = filters) => {
    try {
      setLoading(true);
      const response = await request.get('/system/logs/operation', {
        params: {
          page,
          pageSize,
          ...filterValues,
        },
      });

      if (response.data) {
        setDataSource(response.data.items || []);
        setPagination({
          current: page,
          pageSize,
          total: response.data.total || 0,
        });

        // 处理日期自动纠正提示
        if (response.data.meta?.isDateCorrected) {
          message.info('日期范围已自动纠正（开始日期 > 结束日期）');
        }

        // 处理关键词截取提示
        if (response.data.meta?.isKeywordTruncated) {
          message.warning('搜索关键词过长，已自动截取前50个字符');
        }
      }
    } catch (error: any) {
      console.error('加载操作日志失败:', error);
      message.error(error.message || '加载操作日志失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadData();
  }, []);

  // 筛选处理
  const handleSearch = (values: any) => {
    setFilters(values);
    loadData(1, pagination.pageSize, values);
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({});
    loadData(1, pagination.pageSize, {});
  };

  // 分页处理
  const handlePageChange = (page: number, pageSize: number) => {
    loadData(page, pageSize, filters);
  };

  // 查看详情
  const handleViewDetail = (record: OperationLog) => {
    setCurrentRecord(record);
    setDetailVisible(true);
  };

  // 关闭详情
  const handleCloseDetail = () => {
    setDetailVisible(false);
    setCurrentRecord(null);
  };

  // 导出日志
  const handleExport = async () => {
    try {
      message.loading('正在导出...', 0);
      const response = await request.get('/system/logs/operation/export', {
        params: filters,
        responseType: 'blob',
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `操作日志_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.destroy();
      message.success('导出成功');
    } catch (error: any) {
      message.destroy();
      message.error(error.message || '导出失败');
    }
  };

  return (
    <PageContainer
      title="操作日志"
      subTitle="查看系统所有操作日志，支持多条件筛选和导出"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: '系统管理' },
          { title: '操作日志' },
        ],
      }}
    >
      {/* 筛选区域 */}
      <SectionCard title="筛选条件" collapsible defaultCollapsed={false}>
        <FilterBar
          items={[
            {
              name: 'username',
              label: '用户名',
              type: 'input',
              placeholder: '请输入用户名',
            },
            {
              name: 'module',
              label: '操作模块',
              type: 'input',
              placeholder: '请输入模块名称',
            },
            {
              name: 'action',
              label: '操作类型',
              type: 'input',
              placeholder: '请输入操作类型',
            },
            {
              name: 'method',
              label: '请求方法',
              type: 'select',
              options: [
                { label: 'GET', value: 'GET' },
                { label: 'POST', value: 'POST' },
                { label: 'PUT', value: 'PUT' },
                { label: 'DELETE', value: 'DELETE' },
                { label: 'PATCH', value: 'PATCH' },
              ],
            },
            {
              name: 'status',
              label: '状态码',
              type: 'select',
              options: [
                { label: '成功 (2xx)', value: '2' },
                { label: '客户端错误 (4xx)', value: '4' },
                { label: '服务器错误 (5xx)', value: '5' },
              ],
            },
            {
              name: 'dateRange',
              label: '操作时间',
              type: 'dateRange',
            },
          ]}
          collapsible
          defaultRows={2}
          glass
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </SectionCard>

      {/* 数据区域 */}
      <SectionCard>
        <ActionBar
          actions={[
            {
              key: 'export',
              label: '导出日志',
              icon: <DownloadOutlined />,
              type: 'primary',
              disabled: loading || dataSource.length === 0,
              onClick: handleExport,
            },
          ]}
          extra={
            <Space>
              <span style={{ color: '#999', fontSize: 14 }}>
                共 {pagination.total} 条记录
              </span>
            </Space>
          }
          align="space-between"
          glass
        />

        <Table
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          glass
          density="compact"
          striped
          hoverable
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handlePageChange,
          }}
          rowKey="id"
        />
      </SectionCard>

      {/* 详情抽屉 */}
      <Drawer
        visible={detailVisible}
        title="操作日志详情"
        width={720}
        glass
        onClose={handleCloseDetail}
      >
        {currentRecord && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 基本信息 */}
            <div>
              <h3 style={{ marginBottom: 16 }}>基本信息</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
                <div style={{ color: '#999' }}>操作人：</div>
                <div>{currentRecord.name} ({currentRecord.username})</div>

                <div style={{ color: '#999' }}>操作模块：</div>
                <div>{currentRecord.module}</div>

                <div style={{ color: '#999' }}>操作类型：</div>
                <div>{currentRecord.action}</div>

                <div style={{ color: '#999' }}>请求方法：</div>
                <div>{currentRecord.method}</div>

                <div style={{ color: '#999' }}>请求路径：</div>
                <div>{currentRecord.path}</div>

                <div style={{ color: '#999' }}>IP地址：</div>
                <div>{currentRecord.ip}</div>

                <div style={{ color: '#999' }}>状态码：</div>
                <div>
                  <StatusTag
                    status={currentRecord.status >= 200 && currentRecord.status < 300 ? 'success' : 'error'}
                    text={currentRecord.status.toString()}
                  />
                </div>

                <div style={{ color: '#999' }}>耗时：</div>
                <div>{currentRecord.duration}ms</div>

                <div style={{ color: '#999' }}>操作时间：</div>
                <div>{formatDate(currentRecord.createdAt)}</div>
              </div>
            </div>

            {/* 请求数据 */}
            {currentRecord.requestBody && (
              <div>
                <h3 style={{ marginBottom: 16 }}>请求数据</h3>
                <pre style={{
                  background: '#f5f5f5',
                  padding: 16,
                  borderRadius: 8,
                  overflow: 'auto',
                  maxHeight: 300,
                }}>
                  {JSON.stringify(currentRecord.requestBody, null, 2)}
                </pre>
              </div>
            )}

            {/* 响应数据 */}
            {currentRecord.responseBody && (
              <div>
                <h3 style={{ marginBottom: 16 }}>响应数据</h3>
                <pre style={{
                  background: '#f5f5f5',
                  padding: 16,
                  borderRadius: 8,
                  overflow: 'auto',
                  maxHeight: 300,
                }}>
                  {JSON.stringify(currentRecord.responseBody, null, 2)}
                </pre>
              </div>
            )}

            {/* 变更记录 */}
            {currentRecord.changes && (
              <div>
                <h3 style={{ marginBottom: 16 }}>变更记录</h3>
                <pre style={{
                  background: '#f5f5f5',
                  padding: 16,
                  borderRadius: 8,
                  overflow: 'auto',
                  maxHeight: 300,
                }}>
                  {JSON.stringify(currentRecord.changes, null, 2)}
                </pre>
              </div>
            )}

            {/* 错误信息 */}
            {currentRecord.errorMessage && (
              <div>
                <h3 style={{ marginBottom: 16, color: '#dc2626' }}>错误信息</h3>
                <div style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: 16,
                  borderRadius: 8,
                }}>
                  {currentRecord.errorMessage}
                </div>
              </div>
            )}

            {/* User Agent */}
            <div>
              <h3 style={{ marginBottom: 16 }}>User Agent</h3>
              <div style={{
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 8,
                wordBreak: 'break-all',
              }}>
                {currentRecord.userAgent}
              </div>
            </div>
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default OperationLogPage;
