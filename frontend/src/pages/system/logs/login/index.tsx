/**
 * 登录日志列表页面（优化版）
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
 * 登录日志数据类型
 */
interface LoginLog {
  id: number;
  userId?: number;
  username: string;
  name?: string;
  loginType: string;
  loginStatus: number;
  ip: string;
  location?: string;
  userAgent: string;
  deviceType: string;
  browser?: string;
  os?: string;
  errorMessage?: string;
  loginTime: string;
  logoutTime?: string;
}

const LoginLogPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<LoginLog[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<any>({});
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<LoginLog | null>(null);

  // 表格列配置
  const columns = [
    {
      title: '用户信息',
      dataIndex: 'username',
      key: 'username',
      width: 150,
      render: (text: string, record: LoginLog) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          {record.name && (
            <div style={{ fontSize: 12, color: '#999' }}>{record.name}</div>
          )}
        </div>
      ),
    },
    {
      title: '登录类型',
      dataIndex: 'loginType',
      key: 'loginType',
      width: 120,
      render: (type: string) => {
        const typeMap: Record<string, { status: string; text: string }> = {
          password: { status: 'info', text: '密码登录' },
          sms: { status: 'success', text: '短信登录' },
          qrcode: { status: 'warning', text: '扫码登录' },
          oauth: { status: 'purple', text: '第三方登录' },
        };
        const config = typeMap[type] || { status: 'default', text: type };
        return <StatusTag status={config.status as any} text={config.text} showDot={false} />;
      },
    },
    {
      title: '登录状态',
      dataIndex: 'loginStatus',
      key: 'loginStatus',
      width: 120,
      render: (status: number) => (
        <StatusTag
          status={status === 1 ? 'success' : 'error'}
          text={status === 1 ? '成功' : '失败'}
        />
      ),
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 140,
    },
    {
      title: '登录地点',
      dataIndex: 'location',
      key: 'location',
      width: 150,
      render: (location: string) => location || '-',
    },
    {
      title: '设备类型',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 120,
      render: (type: string) => {
        const typeMap: Record<string, { status: string; text: string }> = {
          desktop: { status: 'info', text: '桌面端' },
          mobile: { status: 'success', text: '移动端' },
          tablet: { status: 'warning', text: '平板' },
          unknown: { status: 'default', text: '未知' },
        };
        const config = typeMap[type] || { status: 'default', text: type };
        return <StatusTag status={config.status as any} text={config.text} showDot={false} />;
      },
    },
    {
      title: '浏览器',
      dataIndex: 'browser',
      key: 'browser',
      width: 120,
      render: (browser: string) => browser || '-',
    },
    {
      title: '登录时间',
      dataIndex: 'loginTime',
      key: 'loginTime',
      width: 180,
      render: (date: string) => formatDate(date),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: LoginLog) => (
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
      const response = await request.get('/system/logs/login', {
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
      console.error('加载登录日志失败:', error);
      message.error(error.message || '加载登录日志失败');
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
  const handleViewDetail = (record: LoginLog) => {
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
      const response = await request.get('/system/logs/login/export', {
        params: filters,
        responseType: 'blob',
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `登录日志_${Date.now()}.xlsx`);
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
      title="登录日志"
      subTitle="查看系统所有登录日志，支持多条件筛选和导出"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: '系统管理' },
          { title: '登录日志' },
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
              name: 'loginType',
              label: '登录类型',
              type: 'select',
              options: [
                { label: '密码登录', value: 'password' },
                { label: '短信登录', value: 'sms' },
                { label: '扫码登录', value: 'qrcode' },
                { label: '第三方登录', value: 'oauth' },
              ],
            },
            {
              name: 'loginStatus',
              label: '登录状态',
              type: 'select',
              options: [
                { label: '成功', value: 1 },
                { label: '失败', value: 0 },
              ],
            },
            {
              name: 'deviceType',
              label: '设备类型',
              type: 'select',
              options: [
                { label: '桌面端', value: 'desktop' },
                { label: '移动端', value: 'mobile' },
                { label: '平板', value: 'tablet' },
              ],
            },
            {
              name: 'ip',
              label: 'IP地址',
              type: 'input',
              placeholder: '请输入IP地址',
            },
            {
              name: 'dateRange',
              label: '登录时间',
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
        title="登录日志详情"
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
                <div style={{ color: '#999' }}>用户名：</div>
                <div>{currentRecord.username}</div>

                {currentRecord.name && (
                  <>
                    <div style={{ color: '#999' }}>姓名：</div>
                    <div>{currentRecord.name}</div>
                  </>
                )}

                <div style={{ color: '#999' }}>登录类型：</div>
                <div>{currentRecord.loginType}</div>

                <div style={{ color: '#999' }}>登录状态：</div>
                <div>
                  <StatusTag
                    status={currentRecord.loginStatus === 1 ? 'success' : 'error'}
                    text={currentRecord.loginStatus === 1 ? '成功' : '失败'}
                  />
                </div>

                <div style={{ color: '#999' }}>IP地址：</div>
                <div>{currentRecord.ip}</div>

                {currentRecord.location && (
                  <>
                    <div style={{ color: '#999' }}>登录地点：</div>
                    <div>{currentRecord.location}</div>
                  </>
                )}

                <div style={{ color: '#999' }}>设备类型：</div>
                <div>{currentRecord.deviceType}</div>

                {currentRecord.browser && (
                  <>
                    <div style={{ color: '#999' }}>浏览器：</div>
                    <div>{currentRecord.browser}</div>
                  </>
                )}

                {currentRecord.os && (
                  <>
                    <div style={{ color: '#999' }}>操作系统：</div>
                    <div>{currentRecord.os}</div>
                  </>
                )}

                <div style={{ color: '#999' }}>登录时间：</div>
                <div>{formatDate(currentRecord.loginTime)}</div>

                {currentRecord.logoutTime && (
                  <>
                    <div style={{ color: '#999' }}>退出时间：</div>
                    <div>{formatDate(currentRecord.logoutTime)}</div>
                  </>
                )}
              </div>
            </div>

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

export default LoginLogPage;
