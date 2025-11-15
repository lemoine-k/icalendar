/**
 * 主题配置
 */

export const THEMES = {
  // 苹果经典红 - 默认主题
  apple: {
    id: 'apple',
    name: '苹果红',
    primary: '#ff3b30',
    secondary: '#ff2d55',
    accent: '#007aff',
    success: '#34c759',
    danger: '#ff3b30',
    warning: '#ff9500',
    background: '#f2f2f7',
    card: '#ffffff',
    text: '#000000',
    textSecondary: '#8e8e93',
    border: '#c6c6c8',
  },
  
  // 苹果蓝
  appleBlue: {
    id: 'appleBlue',
    name: '苹果蓝',
    primary: '#007aff',
    secondary: '#0051d5',
    accent: '#5ac8fa',
    success: '#34c759',
    danger: '#ff3b30',
    warning: '#ff9500',
    background: '#f2f2f7',
    card: '#ffffff',
    text: '#000000',
    textSecondary: '#8e8e93',
    border: '#c6c6c8',
  },
  
  // 苹果绿
  appleGreen: {
    id: 'appleGreen',
    name: '苹果绿',
    primary: '#34c759',
    secondary: '#30d158',
    accent: '#32d74b',
    success: '#34c759',
    danger: '#ff3b30',
    warning: '#ff9500',
    background: '#f2f2f7',
    card: '#ffffff',
    text: '#000000',
    textSecondary: '#8e8e93',
    border: '#c6c6c8',
  },
  
  // 苹果紫
  applePurple: {
    id: 'applePurple',
    name: '苹果紫',
    primary: '#af52de',
    secondary: '#bf5af2',
    accent: '#da8fff',
    success: '#34c759',
    danger: '#ff3b30',
    warning: '#ff9500',
    background: '#f2f2f7',
    card: '#ffffff',
    text: '#000000',
    textSecondary: '#8e8e93',
    border: '#c6c6c8',
  },
  
  // 苹果橙
  appleOrange: {
    id: 'appleOrange',
    name: '苹果橙',
    primary: '#ff9500',
    secondary: '#ff8c00',
    accent: '#ffb340',
    success: '#34c759',
    danger: '#ff3b30',
    warning: '#ff9500',
    background: '#f2f2f7',
    card: '#ffffff',
    text: '#000000',
    textSecondary: '#8e8e93',
    border: '#c6c6c8',
  },
  
  // 苹果暗色模式
  appleDark: {
    id: 'appleDark',
    name: '暗色模式',
    primary: '#0a84ff',
    secondary: '#007aff',
    accent: '#5ac8fa',
    success: '#32d74b',
    danger: '#ff453a',
    warning: '#ff9f0a',
    background: '#000000',
    card: '#1c1c1e',
    text: '#ffffff',
    textSecondary: '#8e8e93',
    border: '#38383a',
  },
};

export const getTheme = (themeId) => {
  return THEMES[themeId] || THEMES.default;
};

export const getThemeList = () => {
  return Object.values(THEMES);
};
