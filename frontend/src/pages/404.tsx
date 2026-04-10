import { Button, Result, Typography } from 'antd';
import { history } from 'umi';

const { Text } = Typography;

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 m-4">
      <Result
        status="404"
        title={<span className="font-black text-5xl text-slate-900 tracking-tighter">404</span>}
        subTitle={
          <div className="mt-2">
            <Text className="text-slate-600 text-lg font-bold block">抱歉，您访问的页面已消失在雷犀云端</Text>
            <Text className="text-slate-400">请检查路径是否正确或联系系统管理员</Text>
          </div>
        }
        extra={
          <Button 
            type="primary" 
            size="large" 
            onClick={() => history.push('/')}
            className="h-[44px] px-8 bg-slate-900 border-none font-black rounded-lg"
          >
            返回雷犀首页
          </Button>
        }
      />
    </div>
  );
}
