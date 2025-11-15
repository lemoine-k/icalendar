# 📱 移动端使用快速指南

## 🚀 最快速的方式：使用 Expo Go

### Android 用户

1. **下载 Expo Go**
   - 打开 Google Play 商店
   - 搜索 "Expo Go"
   - 点击安装

2. **运行应用**
   ```bash
   # 在电脑上运行
   npm start
   ```

3. **扫描二维码**
   - 打开 Expo Go 应用
   - 点击 "Scan QR Code"
   - 扫描终端显示的二维码
   - 应用将自动加载

### iOS 用户

1. **下载 Expo Go**
   - 打开 App Store
   - 搜索 "Expo Go"
   - 点击获取

2. **运行应用**
   ```bash
   # 在电脑上运行
   npm start
   ```

3. **扫描二维码**
   - 打开 iPhone 相机
   - 对准终端显示的二维码
   - 点击弹出的通知
   - 应用将在 Expo Go 中打开

## 📦 构建独立应用（推荐）

### 为什么要构建独立应用？

- ✅ 不需要 Expo Go
- ✅ 可以独立安装和运行
- ✅ 更好的性能
- ✅ 可以发布到应用商店

### Android APK 构建

```bash
# 1. 安装 EAS CLI（只需一次）
npm install -g eas-cli

# 2. 登录 Expo 账号（免费注册）
eas login

# 3. 初始化配置（只需一次）
eas build:configure

# 4. 构建 APK
eas build --platform android --profile preview

# 5. 等待构建完成（约 10-20 分钟）
# 6. 下载 APK 文件
# 7. 传输到手机并安装
```

### iOS 应用构建

```bash
# 需要 Apple Developer 账号（$99/年）

# 1. 安装 EAS CLI
npm install -g eas-cli

# 2. 登录
eas login

# 3. 配置
eas build:configure

# 4. 构建
eas build --platform ios --profile preview

# 5. 通过 TestFlight 分发
```

## 🔧 常见问题解决

### 问题 1：无法连接到开发服务器

**症状**：扫描二维码后显示 "无法连接"

**解决方案**：
```bash
# 方法 1：使用隧道模式
npm start --tunnel

# 方法 2：检查网络
# - 确保手机和电脑在同一 WiFi
# - 关闭 VPN
# - 检查防火墙设置
```

### 问题 2：应用加载缓慢

**解决方案**：
```bash
# 清理缓存
npm start -- --clear

# 或者
expo start -c
```

### 问题 3：构建失败

**解决方案**：
```bash
# 1. 清理依赖
rm -rf node_modules
npm install

# 2. 清理缓存
npm start -- --clear

# 3. 检查 eas.json 配置
```

## 📊 性能对比

| 方式 | 启动速度 | 性能 | 安装难度 | 推荐度 |
|------|---------|------|---------|--------|
| Expo Go | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 开发测试 |
| 独立 APK | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 生产使用 |
| 本地构建 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | 高级用户 |

## 💡 推荐流程

### 开发阶段
1. 使用 Expo Go 快速测试
2. 实时查看修改效果
3. 快速迭代开发

### 测试阶段
1. 构建 Preview 版本
2. 分发给测试用户
3. 收集反馈

### 发布阶段
1. 构建 Production 版本
2. 发布到应用商店
3. 持续更新维护

## 🔗 相关链接

- [Expo Go 下载](https://expo.dev/client)
- [EAS Build 文档](https://docs.expo.dev/build/introduction/)
- [Expo 官方文档](https://docs.expo.dev/)

---

**需要帮助？** 查看 [README.md](./README.md) 获取更多详细信息。
