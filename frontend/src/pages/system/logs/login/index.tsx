import React, { useState, useEffect } from 'react';
import { Card, Space, message } from 'antd';
import { PageContainer } from '@ant-design/pro-layout';
import { LogFilter } from '../components/LogFilter';
import { LogTable } from '../components/LogTable';
import { LogDetailDrawer } from '../components/LogDetailDrawer';
import { ExportButton } from '../components/ExportButton';
import { request } from '@/utils/request';

/**
 * 登录日志列表页面
 * 功能：查询、筛选、查看详情、导出登录日志
 */
const LoginLogPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<any>({});
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);

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
  const handleFilter = (values: any) => {
    setFilters(values);
    loadData(1, pagination.pageSize, values);
  };

  // 分页处理
  const handlePageChange = (page: number, pageSize: number) => {
    loadData(page, pageSize, filters);
  };

  // 查看详情
  const handleViewDetail = (record: any) => {
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
      content="查看系统所有登录日志，支持多条件筛选和导出"
    >
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 筛选区域 */}
          <LogFilter
            onFilter={handleFilter}
            filterType="login"
            loading={loading}
          />

          {/* 操作按钮区域 */}
          <div style={{ textAlign: 'right' }}>
            <ExportButton
              exportType="login"
              filters={filters}
              disabled={loading || dataSource.length === 0}
            />
          </div>

          {/* 表格区域 */}
          <LogTable
            dataSource={dataSource}
            loading={loading}
            pagination={pagination}
            onPageChange={handlePageChange}
            onViewDetail={handleViewDetail}
            tableType="login"
          />
        </Space>
      </Card>

      {/* 详情抽屉 */}
      <LogDetailDrawer
        visible={detailVisible}
        onClose={handleCloseDetail}
        record={currentRecord}
        detailType="login"
      />
    </PageContainer>
  );
};

export default LoginLogPage;
