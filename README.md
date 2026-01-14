# iCalSched

一个基于 React Native 的跨平台日历应用，支持农历、节假日、事件订阅和智能提醒功能。

## 功能特性

### 日历视图
- 月视图：显示完整月份，支持农历和节假日标识
- 周视图：一周概览，24小时时间轴
- 日视图：单日详细信息
- 流畅的视图切换

### 事件管理
- 创建、编辑、删除事件
- 支持全天事件和跨天事件
- 事件优先级（高/中/低）
- 事件搜索功能
- 重复事件（每天/每周/每月/每年）

### 日历订阅
- 预设订阅源（中国法定节假日等）
- 自动同步订阅内容
- 订阅状态管理

### 智能提醒
- 多种提醒时间（5分钟到1周前）
- 系统通知支持
- 多提醒时间设置

### 中国农历
- 农历日期显示（1900-2100年）
- 24节气标注
- 传统节日识别
- 生肖年份显示

### 主题系统
- 6个主题配色
- 实时切换
- 暗色模式支持

## 安装

### 环境要求
- Node.js >= 14.0.0
- npm 或 yarn
- Expo CLI

### 快速开始

```bash
# 克隆项目
git clone https://github.com/yourusername/icalSched.git
cd icalSched

# 安装依赖
npm install

# 启动开发服务器
npm start
```

### 运行应用

**使用 Expo Go**
```bash
npm start
# 扫描二维码在手机上运行
```

**构建独立应用**
```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录 Expo
eas login

# 构建 Android APK
eas build --platform android --profile preview
```

## 技术栈

- React Native - 跨平台移动应用框架
- Expo - 开发工具链
- React Hooks - 状态管理
- AsyncStorage - 本地数据存储
- Push Notification - 通知系统

## 项目结构

```
icalSched/
├── App.js                    # 主应用组件
├── components/               # 视图组件
│   ├── MonthView.js         # 月视图
│   ├── WeekView.js          # 周视图
│   └── DayView.js           # 日视图
├── utils/                   # 工具模块
│   ├── icalendar.js        # iCalendar 实现
│   ├── lunar.js            # 农历计算
│   ├── subscription.js     # 订阅管理
│   ├── notifications.js    # 通知系统
│   └── themes.js           # 主题系统
├── assets/                 # 资源文件
├── android/               # Android 原生代码
├── package.json           # 项目配置
├── app.json              # Expo 配置
└── eas.json              # 构建配置
```

## 使用说明

### 创建事件
1. 点击日期或右下角"+"按钮
2. 填写事件信息
3. 设置提醒时间（可选）
4. 保存事件

### 订阅日历
1. 打开订阅管理
2. 选择订阅源
3. 点击订阅
4. 等待同步完成

### 切换主题
1. 打开主题选择
2. 选择主题
3. 主题立即生效

## 天气订阅

应用支持天气订阅功能，使用 wttr.in API。详细配置说明请查看 [WEATHER_API_SETUP.md](./WEATHER_API_SETUP.md)。

## 开发

### 代码规范
- 使用 ES6+ 语法
- 函数式组件 + Hooks
- 遵循 React Native 最佳实践

### 调试
```bash
# 查看日志
npm start

# React Native Debugger
# 浏览器打开 http://localhost:19002
```

## 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情。
