import React, { useState } from 'react';
import { Card, Row, Col, Button, Input, Space, Typography, Divider } from 'antd';
import { VirtualList } from '@/components/VirtualList';
import { LazyImage } from '@/components/LazyImage';
import { useDebounceSearch } from '@/hooks/useDebounceSearch';
import { storage } from '@/utils/storage';
import { performanceMonitor } from '@/utils/performance';

const { Title, Text, Paragraph } = Typography;

/**
 * 性能优化示例页面
 * 展示各种性能优化技术的使用
 */
export default function PerformanceDemoPage() {
  const [storageValue, setStorageValue] = useState('');

  // 虚拟滚动示例数据
  const virtualListData = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `项目 ${i + 1}`,
    description: `这是第 ${i + 1} 个项目的描述`,
  }));

  // 防抖搜索示例
  const { searchTerm, setSearchTerm, data: searchData, isLoading } = useDebounceSearch({
    searchFn: async (query) => {
      // 模拟API请求
      await new Promise(resolve => setTimeout(resolve, 500));
      return virtualListData.filter(item => 
        item.name.includes(query) || item.description.includes(query)
      );
    },
    delay: 300,
    minLength: 2,
  });

  // 本地存储示例
  const handleSaveToStorage = () => {
    storage.setWithExpiry('demo_key', storageValue, 60 * 1000); // 1分钟过期
    alert('已保存到本地存储(1分钟后过期)');
  };

  const handleLoadFromStorage = () => {
    const value = storage.getWithExpiry('demo_key');
    if (value) {
      setStorageValue(value);
      alert('从本地存储加载成功');
    } else {
      alert('本地存储中没有数据或已过期');
    }
  };

  // 性能监控示例
  const handlePerformanceTest = async () => {
    await performanceMonitor.measure('测试任务', async () => {
      // 模拟耗时操作
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
    
    alert(`任务完成! 平均耗时: ${performanceMonitor.getAverageDuration('测试任务').toFixed(2)}ms`);
  };

  return (
    <div className="p-6">
      <Title level={2}>性能优化示例</Title>
      <Paragraph>
        本页面展示了各种性能优化技术的使用方法,包括虚拟滚动、图片懒加载、防抖搜索、本地存储和性能监控。
      </Paragraph>

      <Row gutter={[24, 24]}>
        {/* 虚拟滚动示例 */}
        <Col span={12}>
          <Card title="虚拟滚动列表 (10,000 项)" bordered={false}>
            <Paragraph>
              虚拟滚动只渲染可见区域的项目,大幅提升大数据量列表的性能。
            </Paragraph>
            <VirtualList
              data={virtualListData}
              itemHeight={60}
              containerHeight={400}
              renderItem={(item, index) => (
                <div className="p-4 border-b border-gray-200 hover:bg-gray-50">
                  <div className="font-bold">{item.name}</div>
                  <div className="text-sm text-gray-500">{item.description}</div>
                </div>
              )}
            />
            <Text type="secondary" className="mt-2 block">
              总共 {virtualListData.length.toLocaleString()} 项,但只渲染可见部分
            </Text>
          </Card>
        </Col>

        {/* 图片懒加载示例 */}
        <Col span={12}>
          <Card title="图片懒加载" bordered={false}>
            <Paragraph>
              图片懒加载只在图片进入视口时才加载,减少初始加载时间。
            </Paragraph>
            <div className="space-y-4" style={{ height: 400, overflow: 'auto' }}>
              {Array.from({ length: 20 }, (_, i) => (
                <LazyImage
                  key={i}
                  src={`https://picsum.photos/400/200?random=${i}`}
                  alt={`示例图片 ${i + 1}`}
                  className="w-full h-48 rounded"
                />
              ))}
            </div>
            <Text type="secondary" className="mt-2 block">
              滚动查看更多图片,它们会在进入视口时才加载
            </Text>
          </Card>
        </Col>

        {/* 防抖搜索示例 */}
        <Col span={12}>
          <Card title="防抖搜索" bordered={false}>
            <Paragraph>
              防抖搜索避免频繁请求,只在用户停止输入后才发起搜索。
            </Paragraph>
            <Space direction="vertical" className="w-full">
              <Input
                placeholder="输入搜索关键词(至少2个字符)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
              />
              {isLoading && <Text>搜索中...</Text>}
              {searchData && (
                <div>
                  <Text strong>找到 {searchData.length} 个结果</Text>
                  <div className="mt-2 space-y-2" style={{ maxHeight: 300, overflow: 'auto' }}>
                    {searchData.slice(0, 10).map(item => (
                      <div key={item.id} className="p-2 border rounded">
                        <div className="font-bold">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Space>
            <Text type="secondary" className="mt-2 block">
              延迟 300ms 后才发起搜索请求
            </Text>
          </Card>
        </Col>

        {/* 本地存储示例 */}
        <Col span={12}>
          <Card title="本地存储管理" bordered={false}>
            <Paragraph>
              带过期时间的本地存储,自动清理过期数据。
            </Paragraph>
            <Space direction="vertical" className="w-full">
              <Input
                placeholder="输入要保存的值"
                value={storageValue}
                onChange={(e) => setStorageValue(e.target.value)}
              />
              <Space>
                <Button type="primary" onClick={handleSaveToStorage}>
                  保存到本地存储
                </Button>
                <Button onClick={handleLoadFromStorage}>
                  从本地存储加载
                </Button>
              </Space>
              <Divider />
              <div>
                <Text strong>存储信息:</Text>
                <div className="mt-2">
                  <Text>存储大小: {storage.getSizeReadable()}</Text>
                </div>
              </div>
            </Space>
            <Text type="secondary" className="mt-2 block">
              数据会在 1 分钟后自动过期
            </Text>
          </Card>
        </Col>

        {/* 性能监控示例 */}
        <Col span={24}>
          <Card title="性能监控" bordered={false}>
            <Paragraph>
              监控和分析代码执行性能,帮助发现性能瓶颈。
            </Paragraph>
            <Space>
              <Button type="primary" onClick={handlePerformanceTest}>
                运行性能测试
              </Button>
              <Button onClick={() => {
                const report = performanceMonitor.exportReport();
                console.log('性能报告:', report);
                alert('性能报告已输出到控制台');
              }}>
                导出性能报告
              </Button>
              <Button onClick={() => {
                performanceMonitor.clear();
                alert('性能数据已清除');
              }}>
                清除性能数据
              </Button>
            </Space>
            <Divider />
            <div>
              <Text strong>性能指标:</Text>
              <div className="mt-2">
                <Text>总测量次数: {performanceMonitor.getMetrics().length}</Text>
              </div>
            </div>
            <Text type="secondary" className="mt-2 block">
              打开浏览器控制台查看详细的性能日志
            </Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
