import { Button, Result, Typography } from "antd";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 m-4">
      <Result
        status="403"
        title={
          <span className="font-black text-5xl text-red-600 tracking-tighter">
            403
          </span>
        }
        subTitle={
          <div className="mt-2">
            <Text className="text-slate-900 text-lg font-black block uppercase">
              Access Denied
            </Text>
            <Text className="text-slate-600 font-bold">
              由于权限限制，雷犀暂时无法为您开启此区域
            </Text>
          </div>
        }
        extra={
          <Button
            type="primary"
            size="large"
            onClick={() => navigate("/")}
            className="h-[44px] px-8 bg-slate-900 border-none font-black rounded-lg"
          >
            返回雷犀首页
          </Button>
        }
      />
    </div>
  );
}
