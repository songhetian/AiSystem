import { Button, Space } from 'antd';

export function ActionGroup() {
  return (
    <Space>
      <Button type="link">查看</Button>
      <Button type="link">编辑</Button>
      <Button type="link" danger>
        删除
      </Button>
    </Space>
  );
}
