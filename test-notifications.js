// 测试通知功能的脚本
// 在开发过程中可以用来验证通知系统是否正常工作

import { 
  requestNotificationPermissions,
  getNotificationStatus,
  testNotification,
  initializeNotifications,
  REMINDER_PRESETS 
} from './utils/notifications';

export const runNotificationTests = async () => {
  console.log('🧪 开始通知功能测试...');
  
  try {
    // 1. 初始化通知系统
    console.log('1️⃣ 初始化通知系统...');
    await initializeNotifications();
    
    // 2. 检查权限状态
    console.log('2️⃣ 检查通知权限状态...');
    const status = await getNotificationStatus();
    console.log('权限状态:', status);
    
    // 3. 请求权限（如果需要）
    if (!status.granted) {
      console.log('3️⃣ 请求通知权限...');
      const granted = await requestNotificationPermissions();
      console.log('权限请求结果:', granted);
    }
    
    // 4. 发送测试通知
    console.log('4️⃣ 发送测试通知...');
    testNotification();
    
    // 5. 显示提醒预设选项
    console.log('5️⃣ 可用的提醒选项:');
    REMINDER_PRESETS.forEach(preset => {
      console.log(`- ${preset.label} (${preset.minutes}分钟)`);
    });
    
    console.log('✅ 通知功能测试完成');
    return true;
    
  } catch (error) {
    console.error('❌ 通知功能测试失败:', error);
    return false;
  }
};

// 测试事件通知调度
export const testEventNotification = async () => {
  const testEvent = {
    id: 'test_' + Date.now(),
    title: '测试事件',
    startDate: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2分钟后
    reminders: [1], // 1分钟前提醒
  };
  
  console.log('📅 测试事件通知调度:', testEvent);
  
  try {
    const { scheduleEventNotifications } = await import('./utils/notifications');
    const scheduledIds = await scheduleEventNotifications(testEvent);
    console.log('✅ 成功调度通知:', scheduledIds);
    return scheduledIds;
  } catch (error) {
    console.error('❌ 调度通知失败:', error);
    return [];
  }
};