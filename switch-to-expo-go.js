// 切换到Expo Go兼容配置
const fs = require('fs');

console.log('🔄 切换到Expo Go兼容配置...');

// 备份当前配置
if (fs.existsSync('app.json')) {
  fs.copyFileSync('app.json', 'app-dev-client.json');
  console.log('✅ 已备份开发构建配置到 app-dev-client.json');
}

// 使用Expo Go配置
if (fs.existsSync('app-expo-go.json')) {
  fs.copyFileSync('app-expo-go.json', 'app.json');
  console.log('✅ 已切换到Expo Go配置');
} else {
  console.error('❌ 找不到 app-expo-go.json 文件');
  process.exit(1);
}

console.log('');
console.log('📱 现在可以使用以下命令启动Expo Go:');
console.log('   npx expo start');
console.log('');
console.log('🔧 要切换回开发构建配置，运行:');
console.log('   node switch-to-dev-client.js');
console.log('');