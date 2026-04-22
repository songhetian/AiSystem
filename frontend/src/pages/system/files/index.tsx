import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Upload,
  Modal,
  Form,
  Select,
  Input,
  message,
  Tag,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Tabs,
  Tooltip,
  Progress,
  Empty,
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FolderOutlined,
  FileOutlined,
  PieChartOutlined,
  ReloadOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { request } from '@umijs/max';
import dayjs from 'dayjs';
import { GlobalLoading } from '@/components/common/GlobalLoading';
import { SmartSearch } from '@/components/common/SmartSearch';
import { EmptyState } from '@/components/common/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useResponsive } from '@/hooks/useResponsive';

const { Option } = Select;
const { TabPane } = Tabs;

interface FileRecord {
  id: string;
  original_name: string;
  stored_name: string;
  file_size: number;
  fileSizeReadable: string;
  mime_type: string;
  extension: string;
  platform_id: string;
  department_id: string | null;
  category: string;
  entity_type: string | null;
  entity_id: string | null;
  storage_type: string;
  is_public: number;
  access_count: number;
  status: string;
  uploaded_by: string;
  uploaded_at: string;
  create_time: string;
}

interface CategoryStats {
  category: string;
  fileCount: number;
  totalSize: number;
  totalSizeReadable: string;
}

interface FileCategory {
  code: string;
  name: string;
  module: string;
}

const FilesManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [categories, setCategories] = useState<FileCategory[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  // 权限检查 - 从localStorage获取用户权限
  const [permissions, setPermissions] = useState<string[]>([]);

  // 响应式设计
  const { isMobile } = useResponsive();

  // 防抖优化
  const debouncedSearch = useDebounce(searchText, 500);
  const debouncedCategory = useDebounce(selectedCategory, 300);

  // 表单草稿保存
  const { clearDraft } = useFormDraft(form, 'file-upload-form', 30000);

  useEffect(() => {
    // 从localStorage获取用户权限
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        setPermissions(user.permissions || []);
      } catch (error) {
        console.error('解析用户信息失败:', error);
      }
    }
  }, []);

  const hasPermission = (permission: string) => {
    return permissions.includes(permission) || permissions.includes('*:*:*');
  };

  // 快捷键支持
  useKeyboardShortcuts({
    'Ctrl+u': () => {
      if (hasPermission('system:file:upload') && !uploadModalVisible) {
        setUploadModalVisible(true);
      }
    },
    'Ctrl+r': () => {
      fetchFiles();
      fetchStats();
    },
    'Escape': () => {
      if (uploadModalVisible && !uploading) {
        setUploadModalVisible(false);
        form.resetFields();
      }
    },
  });

  // 获取文件分类列表
  const fetchCategories = async () => {
    try {
      const response = await request('/api/system/files/categories');
      setCategories(response.categories || []);
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  // 获取文件列表
  const fetchFiles = async () => {
    if (!hasPermission('system:file:list')) {
      message.warning('您没有查看文件列表的权限');
      return;
    }

    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
        status: 'active',
      };
      
      if (debouncedCategory) {
        params.category = debouncedCategory;
      }

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      const response = await request('/api/system/files', {
        params,
      });
      setFiles(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      message.error('获取文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取存储统计
  const fetchStats = async () => {
    try {
      // 这里需要根据实际的平台ID获取
      const platformId = 'seed-platform-main'; // 临时使用种子数据的平台ID
      
      const [categoryStatsRes, platformStatsRes] = await Promise.all([
        request('/api/system/files/stats/category', {
          params: { platformId },
        }),
        request('/api/system/files/stats/platform', {
          params: { platformId },
        }),
      ]);

      setCategoryStats(categoryStatsRes || []);
      setPlatformStats(platformStatsRes || null);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  useEffect(() => {
    if (permissions.length > 0) {
      fetchCategories();
      fetchStats();
    }
  }, [permissions]);

  useEffect(() => {
    if (permissions.length > 0) {
      fetchFiles();
    }
  }, [page, pageSize, debouncedSearch, debouncedCategory, permissions]);

  // 上传文件
  const handleUpload = async (values: any) => {
    if (!hasPermission('system:file:upload')) {
      message.warning('您没有上传文件的权限');
      return;
    }

    const { file, category, platformId, departmentId, isPublic } = values;

    if (!file || file.length === 0) {
      message.error('请选择要上传的文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', file[0].originFileObj);

    setUploading(true);
    setUploadProgress(0);
    
    try {
      await request('/api/system/files/upload', {
        method: 'POST',
        params: {
          platformId: platformId || 'seed-platform-main',
          departmentId,
          category,
          isPublic: isPublic ? 'true' : 'false',
        },
        data: formData,
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      message.success('文件上传成功');
      clearDraft(); // 清除草稿
      setUploadModalVisible(false);
      form.resetFields();
      setUploadProgress(0);
      fetchFiles();
      fetchStats();
    } catch (error: any) {
      message.error(error?.message || '文件上传失败');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // 下载文件
  const handleDownload = async (record: FileRecord) => {
    if (!hasPermission('system:file:download')) {
      message.warning('您没有下载文件的权限');
      return;
    }

    try {
      const response = await request(`/api/system/files/${record.id}/url`);
      if (response.url) {
        // 创建一个隐藏的a标签来触发下载
        const link = document.createElement('a');
        link.href = response.url;
        link.download = response.filename || record.original_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('文件下载已开始');
      }
    } catch (error: any) {
      message.error(error?.message || '获取文件URL失败');
    }
  };

  // 删除文件
  const handleDelete = async (id: string) => {
    if (!hasPermission('system:file:delete')) {
      message.warning('您没有删除文件的权限');
      return;
    }

    try {
      await request(`/api/system/files/${id}`, {
        method: 'DELETE',
      });
      message.success('文件删除成功');
      fetchFiles();
      fetchStats();
    } catch (error: any) {
      message.error(error?.message || '文件删除失败');
    }
  };

  // 查看文件详情
  const handleViewDetail = async (record: FileRecord) => {
    try {
      const detail = await request(`/api/system/files/${record.id}`);
      Modal.info({
        title: (
          <Space>
            <FileOutlined style={{ color: '#1890ff' }} />
            <span>文件详情</span>
          </Space>
        ),
        width: 650,
        icon: null,
        content: (
          <div style={{ marginTop: 16 }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: '#666', marginBottom: 4 }}>文件名</div>
                  <div style={{ fontWeight: 500 }}>{detail.original_name}</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: '#666', marginBottom: 4 }}>文件大小</div>
                  <div style={{ fontWeight: 500 }}>{detail.fileSizeReadable}</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: '#666', marginBottom: 4 }}>文件类型</div>
                  <div style={{ fontWeight: 500 }}>{detail.mime_type}</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: '#666', marginBottom: 4 }}>文件扩展名</div>
                  <div style={{ fontWeight: 500 }}>{detail.extension.toUpperCase()}</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: '#666', marginBottom: 4 }}>分类</div>
                  <div style={{ fontWeight: 500 }}>
                    {categories.find(c => c.code === detail.category)?.name || detail.category}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: '#666', marginBottom: 4 }}>访问次数</div>
                  <div style={{ fontWeight: 500 }}>{detail.access_count} 次</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: '#666', marginBottom: 4 }}>访问权限</div>
                  <div style={{ fontWeight: 500 }}>
                    {detail.is_public ? '🌐 公开' : '🔒 私有'}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: '#666', marginBottom: 4 }}>上传时间</div>
                  <div style={{ fontWeight: 500 }}>
                    {dayjs(detail.uploaded_at).format('YYYY-MM-DD HH:mm:ss')}
                  </div>
                </div>
              </Col>
              <Col span={24}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: '#666', marginBottom: 4 }}>存储路径</div>
                  <div style={{ 
                    fontWeight: 500, 
                    fontSize: 12, 
                    wordBreak: 'break-all',
                    background: '#f5f5f5',
                    padding: '8px 12px',
                    borderRadius: 4,
                  }}>
                    {detail.stored_name}
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        ),
        okText: '关闭',
      });
    } catch (error: any) {
      message.error(error?.message || '获取文件详情失败');
    }
  };

  const columns: ColumnsType<FileRecord> = [
    {
      title: '文件名',
      dataIndex: 'original_name',
      key: 'original_name',
      width: 250,
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip placement="topLeft" title={text}>
          <Space>
            <FileOutlined style={{ color: '#1890ff' }} />
            <span>{text}</span>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: '文件大小',
      dataIndex: 'fileSizeReadable',
      key: 'fileSizeReadable',
      width: 100,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (text) => {
        const category = categories.find((c) => c.code === text);
        return <Tag color="blue">{category?.name || text}</Tag>;
      },
    },
    {
      title: '文件类型',
      dataIndex: 'extension',
      key: 'extension',
      width: 80,
      render: (text) => <Tag>{text.toUpperCase()}</Tag>,
    },
    {
      title: '访问次数',
      dataIndex: 'access_count',
      key: 'access_count',
      width: 100,
      align: 'center',
    },
    {
      title: '上传时间',
      dataIndex: 'uploaded_at',
      key: 'uploaded_at',
      width: 180,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          {hasPermission('system:file:download') && (
            <Tooltip title="下载文件">
              <Button
                type="link"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(record)}
              />
            </Tooltip>
          )}
          {hasPermission('system:file:delete') && (
            <Popconfirm
              title="确定要删除这个文件吗?"
              description="删除后可在30天内恢复"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除文件">
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
      <Tabs defaultActiveKey="files" type="card">
        <TabPane 
          tab={
            <span>
              <FileOutlined />
              文件列表
            </span>
          } 
          key="files"
        >
          <Card
            title={
              <Space>
                <FolderOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                <span style={{ fontSize: 16, fontWeight: 500 }}>文件管理</span>
              </Space>
            }
            extra={
              <Space wrap>
                {/* 智能搜索 */}
                <SmartSearch
                  onSearch={(value) => {
                    setSearchText(value);
                    setPage(1); // 搜索时重置到第一页
                  }}
                  storageKey="file-search-history"
                  placeholder="搜索文件名..."
                  style={{ width: isMobile ? 200 : 250 }}
                  allowClear
                />
                
                {/* 分类筛选 */}
                <Select
                  placeholder="筛选分类"
                  allowClear
                  style={{ width: isMobile ? 150 : 200 }}
                  value={selectedCategory}
                  onChange={(value) => {
                    setSelectedCategory(value);
                    setPage(1); // 筛选时重置到第一页
                  }}
                >
                  {categories.map((cat) => (
                    <Option key={cat.code} value={cat.code}>
                      {cat.name}
                    </Option>
                  ))}
                </Select>
                
                {/* 刷新按钮 */}
                <Tooltip title="刷新 (Ctrl+R)">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      fetchFiles();
                      fetchStats();
                    }}
                  >
                    {!isMobile && '刷新'}
                  </Button>
                </Tooltip>
                
                {/* 上传按钮 */}
                {hasPermission('system:file:upload') && (
                  <Tooltip title="上传文件 (Ctrl+U)">
                    <Button
                      type="primary"
                      icon={<CloudUploadOutlined />}
                      onClick={() => setUploadModalVisible(true)}
                    >
                      {!isMobile && '上传文件'}
                    </Button>
                  </Tooltip>
                )}
              </Space>
            }
            bordered={false}
          >
            <GlobalLoading loading={loading} tip="加载文件列表..." minHeight="400px">
              <Table
                columns={columns}
                dataSource={files}
                rowKey="id"
                pagination={{
                  current: page,
                  pageSize: isMobile ? 10 : pageSize,
                  total,
                  showSizeChanger: !isMobile,
                  showQuickJumper: !isMobile,
                  showTotal: (total) => `共 ${total} 个文件`,
                  onChange: (page, pageSize) => {
                    setPage(page);
                    setPageSize(pageSize || 20);
                  },
                }}
                scroll={{ x: isMobile ? 800 : 1200 }}
                locale={{
                  emptyText: (
                    <EmptyState
                      description={searchText || selectedCategory ? '未找到匹配的文件' : '暂无文件'}
                      action={
                        hasPermission('system:file:upload') && !searchText && !selectedCategory ? (
                          <Button
                            type="primary"
                            icon={<CloudUploadOutlined />}
                            onClick={() => setUploadModalVisible(true)}
                          >
                            上传第一个文件
                          </Button>
                        ) : undefined
                      }
                    />
                  ),
                }}
              />
            </GlobalLoading>
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <PieChartOutlined />
              存储统计
            </span>
          } 
          key="stats"
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 总体统计 */}
            {platformStats && (
              <Card 
                title={
                  <Space>
                    <PieChartOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                    <span style={{ fontSize: 16, fontWeight: 500 }}>总体统计</span>
                  </Space>
                }
                bordered={false}
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}>
                    <Card>
                      <Statistic
                        title="文件总数"
                        value={platformStats.total?.fileCount || 0}
                        suffix="个"
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Card>
                      <Statistic
                        title="总存储空间"
                        value={platformStats.total?.totalSizeReadable || '0 B'}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Card>
                      <Statistic
                        title="部门数量"
                        value={platformStats.byDepartment?.length || 0}
                        suffix="个"
                        valueStyle={{ color: '#cf1322' }}
                      />
                    </Card>
                  </Col>
                </Row>
              </Card>
            )}

            {/* 分类统计 */}
            <Card 
              title={
                <Space>
                  <FolderOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                  <span style={{ fontSize: 16, fontWeight: 500 }}>分类统计</span>
                </Space>
              }
              bordered={false}
            >
              <Table
                dataSource={categoryStats}
                rowKey="category"
                pagination={false}
                size="middle"
                columns={[
                  {
                    title: '分类',
                    dataIndex: 'category',
                    key: 'category',
                    render: (text) => {
                      const category = categories.find((c) => c.code === text);
                      return (
                        <Space>
                          <FolderOutlined />
                          <span>{category?.name || text}</span>
                        </Space>
                      );
                    },
                  },
                  {
                    title: '文件数量',
                    dataIndex: 'fileCount',
                    key: 'fileCount',
                    align: 'right',
                    render: (text) => `${text} 个`,
                  },
                  {
                    title: '存储空间',
                    dataIndex: 'totalSizeReadable',
                    key: 'totalSizeReadable',
                    align: 'right',
                  },
                ]}
              />
            </Card>
          </Space>
        </TabPane>
      </Tabs>

      {/* 上传文件模态框 */}
      <Modal
        title={
          <Space>
            <CloudUploadOutlined style={{ color: '#1890ff' }} />
            <span>上传文件</span>
            {uploading && <span style={{ fontSize: 12, color: '#999' }}>(上传中，请勿关闭)</span>}
          </Space>
        }
        open={uploadModalVisible}
        onCancel={() => {
          if (!uploading) {
            setUploadModalVisible(false);
            form.resetFields();
            setUploadProgress(0);
          }
        }}
        onOk={() => form.submit()}
        confirmLoading={uploading}
        width={600}
        maskClosable={!uploading}
        closable={!uploading}
        keyboard={!uploading}
      >
        <Form form={form} layout="vertical" onFinish={handleUpload}>
          <Form.Item
            name="file"
            label="选择文件"
            rules={[{ required: true, message: '请选择文件' }]}
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e?.fileList;
            }}
            extra="支持上传任意格式文件，单个文件最大50MB"
          >
            <Upload
              beforeUpload={(file) => {
                const isLt50M = file.size / 1024 / 1024 < 50;
                if (!isLt50M) {
                  message.error('文件大小不能超过50MB');
                }
                return false;
              }}
              maxCount={1}
              accept="*/*"
            >
              <Button icon={<UploadOutlined />} block>
                点击选择文件
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="category"
            label="文件分类"
            rules={[{ required: true, message: '请选择文件分类' }]}
          >
            <Select
              placeholder="请选择文件分类"
              showSearch
              optionFilterProp="children"
            >
              {categories.map((cat) => (
                <Option key={cat.code} value={cat.code}>
                  {cat.name} ({cat.module})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item 
            name="platformId" 
            label="平台ID" 
            initialValue="seed-platform-main"
            tooltip="文件所属平台，默认为主平台"
          >
            <Input placeholder="平台ID" disabled />
          </Form.Item>

          <Form.Item 
            name="departmentId" 
            label="部门ID"
            tooltip="可选，指定文件所属部门"
          >
            <Input placeholder="部门ID(可选)" />
          </Form.Item>

          <Form.Item 
            name="isPublic" 
            label="访问权限"
            initialValue={false}
            tooltip="公开文件可被所有人访问，私有文件仅限有权限的用户访问"
          >
            <Select>
              <Option value={false}>🔒 私有</Option>
              <Option value={true}>🌐 公开</Option>
            </Select>
          </Form.Item>

          {/* 上传进度 */}
          {uploading && uploadProgress > 0 && (
            <Form.Item label="上传进度">
              <Progress 
                percent={uploadProgress} 
                status={uploadProgress === 100 ? 'success' : 'active'}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default FilesManagement;
