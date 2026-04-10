import { Typography, Space, Button, Result } from 'antd';
import { SettingOutlined, ReloadOutlined } from '@ant-design/icons';
import { history } from 'umi';

const { Title, Text, Paragraph } = Typography;

export default function MaintenancePage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{
        background: '#0f172a', // slate-900
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 背景动态光影 */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600 opacity-10 blur-[150px] rounded-full animate-pulse" />
      
      <div className="text-center z-10 p-8 max-w-2xl">
        <div className="mb-8">
          <SettingOutlined spin style={{ fontSize: 84, color: '#3b82f6' }} />
        </div>
        
        <Title level={1} className="m-0 font-black tracking-tighter text-white text-6xl mb-4">
          SYSTEM MAINTENANCE
        </Title>
        
        <Title level={3} className="text-blue-400 font-bold mb-8">
          系统正在进行紧急维护升级
        </Title>
        
        <div className="bg-slate-800 p-6 rounded-2xl border-2 border-slate-700 shadow-2xl mb-8">
          <Paragraph className="text-slate-300 text-lg leading-relaxed text-left">
            各位用户，由于我们正在对 <Text className="text-white font-bold">雷犀 AI 客服系统</Text> 
            进行核心架构优化和数据同步，当前除管理员外的所有访问已暂时暂停。
          </Paragraph>
          <Paragraph className="text-slate-400 italic text-sm text-left m-0">
            预计恢复时间：2026-04-07 18:00 (CST)
          </Paragraph>
        </div>

        <Space size={16}>
          <Button 
            size="large" 
            icon={<ReloadOutlined />} 
            onClick={() => window.location.reload()}
            className="h-[54px] px-8 rounded-xl font-black bg-white border-none hover:bg-slate-100"
          >
            检查恢复状态
          </Button>
          <Button 
            size="large" 
            type="link" 
            onClick={() => history.push('/login')}
            className="text-slate-500 font-bold"
          >
            管理员登录
          </Button>
        </Space>
      </div>

      {/* 页脚装饰 */}
      <div className="absolute bottom-10 w-full text-center">
        <Text className="text-slate-600 font-bold text-xs uppercase tracking-widest">
          Leixi Intelligent Technology · Global Infrastructure
        </Text>
      </div>
    </div>
  );
}
