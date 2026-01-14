// 切换到开发构建配置
const fs = require('fs');

console.log('🔄 切换到开发构建配置...');

// 恢复开发构建配置
if (fs.existsSync('app-dev-client.json')) {
  fs.copyFileSync('app-dev-client.json', 'app.json');
  console.log('✅ 已恢复开发构建配置');
} else {
  console.error('❌ 找不到 app-dev-client.json 备份文件');
  process.exit(1);
}

console.log('');
console.log('🏗️ 现在可以构建开发客户端:');
console.log('   eas build --profile development --platform android');
console.log('');
console.log('📱 或切换回Expo Go配置:');
console.log('   node switch-to-expo-go.js');
console.log('');