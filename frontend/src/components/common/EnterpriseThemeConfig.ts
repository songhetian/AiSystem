import { ThemeConfig } from 'antd';

/**
 * 极致简约设计系统
 * 核心逻辑：去阴影、去渐变、纯净中性色、极致呼吸感
 */
export const enterpriseThemeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#0F172A', // 使用深石板色作为主色，比蓝色更具现代高级感
    borderRadius: 6,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    
    // 纯净色彩系统
    colorTextHeading: '#0F172A',
    colorText: '#334155',
    colorTextSecondary: '#64748B',
    
    // 纯白背景与极细边框
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#FAFAFA',
    colorBorder: '#E2E8F0',
    colorBorderSecondary: '#F1F5F9',
    
    controlHeight: 38,
    fontSize: 14,
  },
  components: {
    Button: {
      controlHeight: 38,
      fontWeight: 500,
      boxShadow: 'none',
      algorithm: true, // 启用自动算法
    },
    Table: {
      headerBg: '#F8FAFC',
      headerColor: '#475569',
      headerBorderRadius: 0,
      cellPaddingBlock: 12,
      rowHoverBg: '#F1F5F9',
    },
    Card: {
      borderRadius: 8,
      boxShadow: 'none', // 彻底去掉卡片阴影
      borderBg: '#E2E8F0',
    },
    Menu: {
      itemSelectedBg: '#F1F5F9',
      itemSelectedColor: '#0F172A',
      itemActiveBg: '#F1F5F9',
    },
    Input: {
      activeBorderColor: '#0F172A',
      hoverBorderColor: '#0F172A',
    }
  }
};
