/**
 * 登录日志列表页面
 * Task 14.1: 实现登录日志列表页面
 * Task 15.1: 实现日志页面权限控制
 * Task 15.2: 实现日志操作权限控制
 * Task 16: 前端性能优化
 *   - Task 16.1: 实现列表虚拟滚动
 *   - Task 16.2: 实现搜索防抖和节流
 *   - Task 16.3: 实现数据缓存
 * Requirements: 13.1, 13.2, 13.3, 15.1, 15.2, 15.3, 15.5, 20.1, 20.2, 20.3, 20.4, 12.1, 12.2, 16.3, 23.1, 23.2, 23.3, 23.4
 *
 * 功能:
 * - 登录日志列表展示 (表格组件)
 * - 多条件搜索表单 (登录用户、时间范围、结果、设备、平台)
 * - 分页控件 (10/20/50/100 条/页)
 * - 列表字段显示 (登录时间、用户名、IP、设备、状态、平台)
 * - 单条日志详情查看
 * - 权限控制: 基于角色的页面访问和操作权限
 * - 性能优化: 虚拟滚动、搜索防抖、数据缓存
 */

import React, { useState, useEffect, useMemo } from 'react';
import { message, Space, Result } from 'antd';
import { DownloadOutlined, EyeOutlined, LockOutlined } from '@ant-design/icons';
import { PageContainer, SectionCard } from '@/components/layout';
import { FilterBar, ActionBar, StatusTag } from '@/components/business';
import { Table, Button, Drawer } from '@/components/ui';
import { Permission } from '@/components/permission/Permission';
import { LogTableSkeleton, LogDetailSkeleton } from '@/components/common/LogTableSkeleton';
import { EmptyState, LogListEmptyState } from '@/components/common/EmptyState';
import { ExportProgress } from '@/components/common/ExportProgress';
import { request } from '@/utils/request';
import { formatDate } from '@/utils/format';
import { handleLogQueryError, handleLogExportError } from '@/utils/logErrorHandler';
import {
  showDateCorrectionNotification,
  showKeywordTruncationNotification,
  showLogExportSuccess,
} from '@/utils/logNotifications';
import { useGlobalStore } from '@/models/global';
import {
  useDebounce,
  useThrottle,
  useLoginLogQuery,
  useLogExport,
  getVirtualScrollConfig
} from '@/hooks';

/**
 * 登录日志数据类型
 * 对应后端 sys_login_log 表结构
 */
interface LoginLog {
  id: string;
  user_id: string;
  username: string;
  operator_name: string; // ID转换后的真实姓名
  login_ip: string;
  login_device: string; // 设备信息 (User-Agent解析后)
  login_status: number; // 1: 成功, 0: 失败
  platform_id?: string;
  platform_name?: string; // ID转换后的平台名称
  user_agent: string;
  error_message?: string; // 登录失败原因
  create_time: string; // 登录时间
}

const LoginLogPage: React.FC = () => {
  // Task 16.2: 实现搜索防抖 (300ms)
  // Requirement 23.1: 主业务响应时间不超过1秒
  const [searchInput, setSearchInput] = useState<any>({});
  const debouncedSearchInput = useDebounce(searchInput, 300);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20, // 默认20条/页 (Requirement 15.2)
    total: 0,
  });
  const [filters, setFilters] = useState<any>({});
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<LoginLog | null>(null);

  // Task 17.2: 导出进度状态
  const [exportProgress, setExportProgress] = useState({
    visible: false,
    status: 'preparing' as 'preparing' | 'exporting' | 'success' | 'error',
    progress: 0,
    message: '',
  });

  // Task 16.3: 使用 React Query 缓存查询结果
  // Requirements 23.2, 23.3: 搜索结果在3秒内返回，支持百万级日志记录
  const queryParams = useMemo(() => ({
    page: pagination.current,
    pageSize: pagination.pageSize,
    ...filters,
  }), [pagination.current, pagination.pageSize, filters]);

  const {
    data: queryResult,
    isLoading,
    error,
    refetch
  } = useLoginLogQuery<LoginLog>(queryParams);

  const dataSource = queryResult?.items || [];
  const total = queryResult?.total || 0;

  // Task 16.2: 实现导出按钮节流 (防止重复点击)
  // Requirement 23.4: 导出10万条记录在10秒内完成
  const { exportLogs, isExporting } = useLogExport();

  const handleExportThrottled = useThrottle(async (exportType: 'current' | 'all') => {
    // Task 17.2: 显示导出进度
    setExportProgress({
      visible: true,
      status: 'preparing',
      progress: 0,
      message: '正在准备导出数据...',
    });

    try {
      setExportProgress(prev => ({
        ...prev,
        status: 'exporting',
        progress: 50,
        message: '正在导出，请稍候...',
      }));

      await exportLogs({
        type: 'login',
        exportType,
        filters,
        page: pagination.current,
        pageSize: pagination.pageSize,
      });

      // Task 17.3: 导出成功提示
      setExportProgress({
        visible: true,
        status: 'success',
        progress: 100,
        message: '导出成功！',
      });

      showLogExportSuccess();

      // 3秒后自动关闭
      setTimeout(() => {
        setExportProgress(prev => ({ ...prev, visible: false }));
      }, 3000);
    } catch (error) {
      // Task 17.1: 导出错误处理
      handleLogExportError(error);

      setExportProgress({
        visible: true,
        status: 'error',
        progress: 0,
        message: '导出失败，请重试',
      });
    }
  }, 2000); // 2秒内只能点击一次

  // Task 15.1: 获取当前用户信息用于权限判断
  // Requirements 20.1, 20.2, 20.3, 20.4: 不同角色有不同的日志查看权限
  const currentUser = useGlobalStore((state) => state.currentUser);

  // 检查用户是否有查看日志的权限
  // Super_Admin/Auditor: 可查看所有日志
  // Regular_Admin: 可查看本部门/平台日志（后端会自动过滤）
  // Regular_User: 无权限（通过Permission组件控制）
  const hasViewPermission = currentUser?.buttonCodesSet?.has('system:logs:login:view') ?? false;
  const hasExportPermission = currentUser?.buttonCodesSet?.has('system:logs:login:export') ?? false;

  // 更新分页信息
  useEffect(() => {
    if (queryResult) {
      setPagination(prev => ({
        ...prev,
        total,
      }));

      // Task 17.3: Requirement 14.2: 处理日期自动纠正提示
      if (queryResult.meta?.isDateCorrected) {
        showDateCorrectionNotification();
      }

      // Task 17.3: Requirement 14.4: 处理关键词截取提示
      if (queryResult.meta?.isKeywordTruncated) {
        showKeywordTruncationNotification(queryResult.meta.originalLength || 50);
      }
    }
  }, [queryResult, total]);

  // Task 17.1: 处理错误 - 使用增强的错误处理
  useEffect(() => {
    if (error) {
      handleLogQueryError(error, 'load');
    }
  }, [error]);

  // Task 15.1: 如果用户无权限，显示权限拒绝页面
  // Requirement 20.3: Regular_User 拒绝访问
  if (!hasViewPermission) {
    return (
      <PageContainer
        title="登录日志"
        breadcrumb={{
          items: [
            { title: '首页', path: '/' },
            { title: '系统管理' },
            { title: '登录日志' },
          ],
        }}
      >
        <SectionCard>
          <Result
            status="403"
            icon={<LockOutlined style={{ color: '#faad14' }} />}
            title="无权限访问"
            subTitle="您没有权限查看登录日志，请联系管理员申请权限。"
            extra={
              <Button type="primary" onClick={() => window.history.back()}>
                返回上一页
              </Button>
            }
          />
        </SectionCard>
      </PageContainer>
    );
  }

  // 表格列配置 (Requirement 13.1: 列表字段显示)
  const columns = [
    {
      title: '登录时间',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 180,
      render: (date: string) => formatDate(date),
    },
    {
      title: '用户名',
      dataIndex: 'operator_name',
      key: 'operator_name',
      width: 120,
      render: (text: string, record: LoginLog) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text || record.username}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.username}</div>
        </div>
      ),
    },
    {
      title: 'IP地址',
      dataIndex: 'login_ip',
      key: 'login_ip',
      width: 140,
      render: (ip: string) => ip || '-',
    },
    {
      title: '登录设备',
      dataIndex: 'login_device',
      key: 'login_device',
      width: 200,
      ellipsis: true,
      render: (device: string) => device || '未知设备',
    },
    {
      title: '登录状态',
      dataIndex: 'login_status',
      key: 'login_status',
      width: 120,
      render: (status: number) => (
        <StatusTag
          status={status === 1 ? 'success' : 'error'}
          text={status === 1 ? '成功' : '失败'}
        />
      ),
    },
    {
      title: '所属平台',
      dataIndex: 'platform_name',
      key: 'platform_name',
      width: 120,
      render: (text: string) => text || '-',
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

  // Task 16.2: 筛选处理 - 使用防抖优化搜索性能
  // Requirement 23.1: 日志记录异步,主业务响应时间不超过1秒
  const handleSearch = (values: any) => {
    setSearchInput(values);
  };

  // 当防抖后的搜索输入变化时，更新过滤条件并重置到第一页
  useEffect(() => {
    setFilters(debouncedSearchInput);
    setPagination(prev => ({ ...prev, current: 1 }));
  }, [debouncedSearchInput]);

  // 重置筛选 (Requirement 13.2: 实现搜索条件重置功能)
  const handleReset = () => {
    setSearchInput({});
    setFilters({});
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 分页处理 (Requirement 15.1, 15.3: 实现分页控件)
  const handlePageChange = (page: number, pageSize: number) => {
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  // 查看详情 (Requirement 13.1: 实现单条日志详情查看)
  const handleViewDetail = (record: LoginLog) => {
    setCurrentRecord(record);
    setDetailVisible(true);
  };

  // 关闭详情
  const handleCloseDetail = () => {
    setDetailVisible(false);
    setCurrentRecord(null);
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
      {/* 筛选区域 - Requirement 13.2: 实现多条件搜索表单 */}
      <SectionCard title="筛选条件" collapsible defaultCollapsed={false}>
        <FilterBar
          items={[
            {
              name: 'username',
              label: '登录用户',
              type: 'input',
              placeholder: '请输入用户名（模糊搜索）',
            },
            {
              name: 'dateRange',
              label: '登录时间',
              type: 'dateRange',
            },
            {
              name: 'status',
              label: '登录结果',
              type: 'select',
              options: [
                { label: '成功', value: 1 },
                { label: '失败', value: 0 },
              ],
            },
            {
              name: 'user_agent',
              label: '登录设备',
              type: 'input',
              placeholder: '请输入设备信息（模糊搜索）',
            },
            {
              name: 'platform_id',
              label: '所属平台',
              type: 'select',
              options: [], // TODO: 从后端获取平台列表
              placeholder: '请选择平台',
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
            // Task 15.2: 实现导出权限控制
            // Requirement 20.1: 基于角色的操作权限控制
            // Task 16.2: 实现导出按钮节流 (防止重复点击)
            ...(hasExportPermission ? [
              {
                key: 'export-current',
                label: '导出当前页',
                icon: <DownloadOutlined />,
                type: 'default' as const,
                disabled: isLoading || isExporting || dataSource.length === 0,
                onClick: () => handleExportThrottled('current'),
              },
              {
                key: 'export-all',
                label: '导出全部结果',
                icon: <DownloadOutlined />,
                type: 'primary' as const,
                disabled: isLoading || isExporting || dataSource.length === 0,
                onClick: () => handleExportThrottled('all'),
              },
            ] : []),
          ]}
          extra={
            <Space>
              <span style={{ color: '#999', fontSize: 14 }}>
                共 {total} 条记录
              </span>
              {!hasExportPermission && (
                <span style={{ color: '#999', fontSize: 12 }}>
                  （无导出权限）
                </span>
              )}
              {isExporting && (
                <span style={{ color: '#1890ff', fontSize: 12 }}>
                  （导出中...）
                </span>
              )}
            </Space>
          }
          align="space-between"
          glass
        />

        {/* Task 16.1: 实现列表虚拟滚动 */}
        {/* Requirements 16.3, 23.3: 支持百万级日志记录存储和查询,性能不降级 */}
        {/* Task 17.2: 实现列表加载骨架屏 */}
        {isLoading ? (
          <LogTableSkeleton rows={pagination.pageSize} columns={7} />
        ) : dataSource.length === 0 ? (
          <LogListEmptyState
            hasFilters={Object.keys(filters).length > 0}
            onReset={handleReset}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={dataSource}
            loading={false}
            glass
            density="compact"
            striped
            hoverable
            scroll={getVirtualScrollConfig(600, 54)} // 虚拟滚动配置
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: ['10', '20', '50', '100'], // Requirement 15.2: 分页大小选项
              showTotal: (total) => `共 ${total} 条`,
              onChange: handlePageChange,
            }}
            rowKey="id"
          />
        )}
      </SectionCard>

      {/* 详情抽屉 - Requirement 13.1: 实现单条日志详情查看 */}
      <Drawer
        visible={detailVisible}
        title="登录日志详情"
        width={720}
        glass
        onClose={handleCloseDetail}
      >
        {currentRecord ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 基本信息 */}
            <div>
              <h3 style={{ marginBottom: 16 }}>基本信息</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
                <div style={{ color: '#999' }}>登录时间：</div>
                <div>{formatDate(currentRecord.create_time)}</div>

                <div style={{ color: '#999' }}>用户名：</div>
                <div>{currentRecord.username}</div>

                <div style={{ color: '#999' }}>真实姓名：</div>
                <div>{currentRecord.operator_name || '-'}</div>

                <div style={{ color: '#999' }}>登录状态：</div>
                <div>
                  <StatusTag
                    status={currentRecord.login_status === 1 ? 'success' : 'error'}
                    text={currentRecord.login_status === 1 ? '成功' : '失败'}
                  />
                </div>

                <div style={{ color: '#999' }}>IP地址：</div>
                <div>{currentRecord.login_ip || '-'}</div>

                <div style={{ color: '#999' }}>登录设备：</div>
                <div>{currentRecord.login_device || '未知设备'}</div>

                <div style={{ color: '#999' }}>所属平台：</div>
                <div>{currentRecord.platform_name || '-'}</div>
              </div>
            </div>

            {/* 错误信息 */}
            {currentRecord.error_message && (
              <div>
                <h3 style={{ marginBottom: 16, color: '#dc2626' }}>错误信息</h3>
                <div style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: 16,
                  borderRadius: 8,
                }}>
                  {currentRecord.error_message}
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
                {currentRecord.user_agent || '-'}
              </div>
            </div>
          </Space>
        ) : (
          <LogDetailSkeleton />
        )}
      </Drawer>

      {/* Task 17.2: 导出进度条 */}
      <ExportProgress
        visible={exportProgress.visible}
        status={exportProgress.status}
        progress={exportProgress.progress}
        message={exportProgress.message}
        onClose={() => setExportProgress(prev => ({ ...prev, visible: false }))}
      />
    </PageContainer>
  );
};

export default LoginLogPage;
