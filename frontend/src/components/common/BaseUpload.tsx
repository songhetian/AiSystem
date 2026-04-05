import { Upload } from 'antd';
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload/interface';

interface BaseUploadProps {
  fileList?: UploadFile[];
  customRequest?: UploadProps['customRequest'];
  onChange?: UploadProps['onChange'];
  accept?: string;
  maxCount?: number;
  multiple?: boolean;
  beforeUpload?: (file: RcFile) => boolean | Promise<boolean>;
  description?: string;
}

export function BaseUpload({
  fileList,
  customRequest,
  onChange,
  accept = '.jpg,.jpeg,.png',
  maxCount = 1,
  multiple = false,
  beforeUpload,
  description = '点击或拖拽文件到此上传'
}: BaseUploadProps) {
  return (
    <Upload.Dragger
      fileList={fileList}
      customRequest={customRequest}
      onChange={onChange}
      accept={accept}
      maxCount={maxCount}
      multiple={multiple}
      beforeUpload={beforeUpload}
    >
      {description}
    </Upload.Dragger>
  );
}
