import { ThemeConfig } from 'antd';

/**
 * 钉钉风格企业级主题配置
 * 对标钉钉 (DingTalk) 的视觉规范：极简、高密度、专业
 */
export const enterpriseThemeConfig: ThemeConfig = {
  token: {
    // 品牌主色：钉钉蓝
    colorPrimary: '#0089FF',
    borderRadius: 4,
    fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    
    // 基础文字色
    colorTextHeading: '#1F2329',
    colorText: '#646A73',
    colorTextSecondary: '#8F959E',
    
    // 背景与边框
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F5F7FA',
    colorBorder: '#DEE0E3',
    colorBorderSecondary: '#EBEEF5',
    
    // 状态色
    colorSuccess: '#00B322',
    colorWarning: '#FF943E',
    colorError: '#F5222D',
    
    // 交互行为
    controlHeight: 32, // 默认高度紧凑化
    fontSize: 14,
  },
  components: {
    Button: {
      borderRadius: 4,
      controlHeight: 32,
      fontWeight: 500,
      boxShadow: 'none', // 去除按钮阴影
      colorBorder: '#DEE0E3',
    },
    Table: {
      headerBg: '#F5F6F7',
      headerColor: '#646A73',
      headerBorderRadius: 0,
      rowHoverBg: 'rgba(0, 137, 255, 0.05)',
      cellPaddingBlock: 8, // 紧凑行高
      cellPaddingInline: 12,
    },
    Card: {
      borderRadius: 4,
      boxShadow: '0 1px 4px rgba(31, 35, 41, 0.08)',
      paddingLG: 16, // 减小内边距
    },
    Modal: {
      borderRadius: 6,
      headerBg: '#FFFFFF',
      titleFontSize: 16,
      titleColor: '#1F2329',
    },
    Menu: {
      itemBorderRadius: 4,
      itemSelectedBg: 'rgba(0, 137, 255, 0.08)',
      itemSelectedColor: '#0089FF',
      subMenuItemBg: '#FFFFFF',
    },
    Input: {
      activeBorderColor: '#0089FF',
      hoverBorderColor: '#0089FF',
      controlHeight: 32,
    },
    Select: {
      controlHeight: 32,
    },
    Tabs: {
      titleFontSize: 14,
      horizontalMargin: '0 0 16px 0',
    },
    Segmented: {
      itemSelectedBg: '#FFFFFF',
      itemSelectedColor: '#0089FF',
      trackBg: '#F0F2F5',
    }
  }
};
