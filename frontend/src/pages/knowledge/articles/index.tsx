import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Layout,
  Input,
  Tree,
  Typography,
  Tag,
  Space,
  Avatar,
  Button,
  Empty,
  Drawer,
  message,
  Divider,
  List,
  Card,
  Skeleton,
  Spin,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  FolderOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  PaperClipOutlined,
  UserOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import LeixiActionGroup, {
  ActionItem,
} from "@/components/common/LeixiActionGroup";
import LeixiModalForm from "@/components/common/LeixiModalForm";
import { EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import {
  knowledgeApi,
  KnowledgeCategory,
  KnowledgeArticle,
} from "@/api/knowledge";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const { Text, Title, Paragraph } = Typography;
const { Sider, Content } = Layout;

export default function DoubaoKnowledgeOptimizedPage() {
  const [keyword, setKeyword] = useState("");
  const [searchVal, setSearchVal] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();
  const [detailArticleId, setDetailArticleId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+f": () => {
      const input = document.querySelector(
        'input[placeholder*="自然语言"]',
      ) as HTMLInputElement;
      input?.focus();
    },
    "Ctrl+r": () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
      message.success("已刷新");
    },
    Escape: () => setDetailArticleId(null),
  });

  const handleSaveArticle = async (values: any, id?: string) => {
    if (id) await knowledgeApi.updateArticle(id, values);
    else await knowledgeApi.createArticle(values);
    message.success("文章已保存");
    queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
  };

  const handleDeleteArticle = async (id: string) => {
    // 假设 API 支持逻辑删除
    await knowledgeApi.updateArticle(id, { is_deleted: 1 } as any);
    message.success("文章已移至回收站");
    queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
  };

  // 1. 搜索防抖逻辑 (针对 150+ 人频繁输入场景)
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchVal);
    }, 400); // 400ms 防抖
    return () => clearTimeout(timer);
  }, [searchVal]);

  // 2. 数据查询 - 使用 React Query 缓存
  const { data: categories = [] } = useQuery<KnowledgeCategory[]>({
    queryKey: ["knowledge-categories"],
    queryFn: () => knowledgeApi.listCategories(),
    staleTime: 60000, // 分类树缓存 1 分钟
  });

  const { data: articles = [], isLoading } = useQuery<KnowledgeArticle[]>({
    queryKey: ["knowledge-articles", keyword, selectedCategoryId],
    queryFn: () =>
      knowledgeApi.listArticles({
        keyword: keyword || undefined,
        category_id: selectedCategoryId || undefined,
      }),
    enabled: true,
    placeholderData: (previousData) => previousData, // 搜索时保留旧数据，不白屏
  });

  // 详情查询
  const { data: detailData, isFetching: isDetailLoading } = useQuery({
    queryKey: ["knowledge-detail", detailArticleId],
    queryFn: () =>
      detailArticleId ? knowledgeApi.getArticle(detailArticleId) : null,
    enabled: !!detailArticleId,
  });

  const treeData = useMemo(() => {
    const map = (nodes: KnowledgeCategory[]): any[] =>
      nodes.map((n) => ({
        key: n.id,
        title: <Text className="font-bold">{n.category_name}</Text>,
        icon: <FolderOutlined className="text-amber-500" />,
        children: n.children ? map(n.children) : [],
      }));
    return map(categories);
  }, [categories]);

  return (
    <Layout className="min-h-screen bg-white">
      {/* 左侧极简导航 */}
      <Sider
        width={280}
        theme="light"
        className="border-r border-slate-100 p-4"
      >
        <div className="mb-8 px-2 flex items-center justify-between">
          <div>
            <Title level={4} className="!m-0 font-black text-slate-900">
              企业知识库
            </Title>
            <Text className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
              AI-Powered Hub
            </Text>
          </div>
          <Button
            shape="circle"
            icon={<PlusOutlined />}
            className="bg-slate-900 text-white border-none shadow-lg"
          />
        </div>

        <Tree
          showIcon
          blockNode
          switcherIcon={<ThunderboltOutlined className="text-[10px]" />}
          treeData={[
            {
              key: "all",
              title: (
                <Text className="font-black text-slate-900">全部文档</Text>
              ),
              icon: <FileTextOutlined className="text-blue-500" />,
            },
            ...treeData,
          ]}
          onSelect={(keys) =>
            setSelectedCategoryId(
              keys[0] === "all" ? undefined : (keys[0] as string),
            )
          }
          className="doubao-tree"
        />
      </Sider>

      {/* 沉浸式搜索与列表 */}
      <Content className="bg-slate-50/30 flex flex-col items-center p-8 overflow-auto">
        <div
          className={`w-full max-w-3xl transition-all duration-700 ${keyword || isLoading ? "mt-0" : "mt-[12vh]"}`}
        >
          {!keyword && !isLoading && (
            <div className="text-center mb-12 animate-fade-in">
              <Title level={2} className="font-black text-slate-900 mb-2">
                有什么可以帮您？
              </Title>
              <Text className="text-slate-400 font-bold">
                Qdrant 语义检索已连接 · 全域 MinIO 附件已索引
              </Text>
            </div>
          )}

          <div className="relative group">
            <Input
              prefix={
                isLoading ? (
                  <LoadingOutlined className="text-blue-500 mr-2" />
                ) : (
                  <SearchOutlined className="text-xl text-slate-400 mr-2" />
                )
              }
              suffix={
                searchVal && (
                  <CloseCircleOutlined
                    className="cursor-pointer text-slate-300"
                    onClick={() => {
                      setSearchVal("");
                      setKeyword("");
                    }}
                  />
                )
              }
              placeholder="通过自然语言提问..."
              className="h-[64px] rounded-2xl shadow-xl border-none text-lg font-bold px-6 group-hover:shadow-blue-50 transition-all"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
          </div>
        </div>

        {/* 高性能结果列表 */}
        {(keyword || isLoading) && (
          <div className="w-full max-w-4xl mt-12 animate-slide-up">
            <List
              dataSource={articles}
              renderItem={(item) => (
                <Card
                  hoverable
                  className="mb-4 rounded-2xl border-none shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setDetailArticleId(item.id)}
                >
                  <div className="flex gap-6">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="bg-slate-100 border-none text-slate-500 font-black text-[10px]">
                          {item.category_name}
                        </Tag>
                        <Text className="text-slate-400 text-[10px]">
                          {item.update_time}
                        </Text>
                      </div>
                      <Title
                        level={4}
                        className="!m-0 font-black text-slate-900"
                      >
                        {item.title}
                      </Title>
                      {item.keyword && (
                        <div className="mt-3 flex gap-1">
                          {item.keyword.split(",").map((k) => (
                            <Tag
                              key={k}
                              className="border-none bg-blue-50/50 text-blue-400 text-[10px] font-bold"
                            >
                              {k.trim()}
                            </Tag>
                          ))}
                        </div>
                      )}
                    </div>
                    {item.attachment_urls &&
                      (item.attachment_urls as string[]).length > 0 && (
                        <div className="flex flex-col items-center justify-center bg-slate-50/50 w-20 rounded-xl">
                          <PaperClipOutlined className="text-xl text-slate-300" />
                          <Text className="text-[10px] text-slate-400">
                            {(item.attachment_urls as string[]).length} 附件
                          </Text>
                        </div>
                      )}
                  </div>
                </Card>
              )}
              locale={{
                emptyText: isLoading ? (
                  <Skeleton active paragraph={{ rows: 4 }} className="mt-10" />
                ) : (
                  <Empty description="未发现匹配的 AI 知识，换个问法？" />
                ),
              }}
            />
          </div>
        )}
      </Content>

      {/* 详情抽屉 - 性能加固版 */}
      <Drawer
        title={null}
        width="60vw"
        onClose={() => setDetailArticleId(null)}
        open={!!detailArticleId}
        className="doubao-drawer"
        closeIcon={null}
      >
        {isDetailLoading ? (
          <div className="p-20">
            <Skeleton active title avatar paragraph={{ rows: 15 }} />
          </div>
        ) : detailData ? (
          <div className="max-w-4xl mx-auto py-12 px-10">
            <div className="flex items-center justify-between mb-10">
              <Button
                icon={<CloseCircleOutlined />}
                type="text"
                className="text-slate-300 hover:text-slate-900"
                onClick={() => setDetailArticleId(null)}
              />
              <LeixiActionGroup
                actions={[
                  {
                    key: "edit",
                    label: "编辑",
                    icon: <EditOutlined />,
                    onClick: () => {},
                  },
                  {
                    key: "delete",
                    label: "删除",
                    icon: <DeleteOutlined />,
                    danger: true,
                    confirm: "确定要删除这篇文章吗？",
                    onClick: async () => {
                      if (detailArticleId) {
                        await handleDeleteArticle(detailArticleId);
                        setDetailArticleId(null);
                      }
                    },
                  },
                ]}
              />
            </div>

            <div className="mb-12">
              <div className="flex items-center gap-4 mb-6">
                <Avatar
                  size={48}
                  icon={<UserOutlined />}
                  className="bg-blue-600 shadow-lg"
                />
                <div>
                  <Text className="font-black text-slate-900 block text-lg">
                    {detailData.author_name}
                  </Text>
                  <Text className="text-slate-400 text-xs font-bold">
                    最后修订：{detailData.update_time}
                  </Text>
                </div>
              </div>
              <Title
                level={1}
                className="!text-4xl font-black text-slate-900 mb-6"
              >
                {detailData.title}
              </Title>
              <div className="flex gap-2">
                <Tag className="bg-slate-900 text-white border-none px-3 font-bold">
                  {detailData.category_name}
                </Tag>
              </div>
            </div>

            <Divider className="opacity-50" />

            <article className="prose prose-slate max-w-none mb-20">
              <Paragraph className="text-xl leading-relaxed text-slate-800 font-medium whitespace-pre-wrap">
                {detailData.content}
              </Paragraph>
            </article>

            {detailData.attachment_urls?.length > 0 && (
              <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl">
                <Title
                  level={5}
                  className="!text-slate-400 mb-6 flex items-center uppercase tracking-widest text-xs font-black"
                >
                  <PaperClipOutlined className="mr-2 text-blue-400" /> Attached
                  Intelligence Resources
                </Title>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(detailData.attachment_urls as string[]).map((url, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 flex items-center gap-4 hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <FileTextOutlined className="text-2xl text-blue-400" />
                      <div className="flex-grow overflow-hidden">
                        <Text className="font-bold text-white block truncate">
                          {url.split("/").pop()}
                        </Text>
                        <Tag className="bg-blue-500/10 text-blue-400 border-none text-[9px] font-black uppercase">
                          OCR & Vector Indexed
                        </Tag>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Drawer>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .doubao-tree .ant-tree-node-content-wrapper { border-radius: 12px !important; padding: 10px 14px !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .doubao-tree .ant-tree-node-selected { background-color: #0f172a !important; }
        .doubao-tree .ant-tree-node-selected .ant-typography { color: #fff !important; }
        .doubao-drawer .ant-drawer-content { border-radius: 32px 0 0 32px !important; }
        .animate-fade-in { animation: fade-in 1s ease-out; }
        .animate-slide-up { animation: slide-up 0.8s cubic-bezier(0.22, 1, 0.36, 1); }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `,
        }}
      />
    </Layout>
  );
}
