import { Platform, Alert, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';

// 存储键
const STORAGE_KEYS = {
  NOTIFICATION_PERMISSIONS: 'notification_permissions',
  SCHEDULED_NOTIFICATIONS: 'scheduled_notifications',
};

// 提醒预设选项
export const REMINDER_PRESETS = [
  { id: 'none', label: '无提醒', minutes: 0 },
  { id: '5min', label: '5分钟前', minutes: 5 },
  { id: '15min', label: '15分钟前', minutes: 15 },
  { id: '30min', label: '30分钟前', minutes: 30 },
  { id: '1hour', label: '1小时前', minutes: 60 },
  { id: '2hours', label: '2小时前', minutes: 120 },
  { id: '1day', label: '1天前', minutes: 1440 },
  { id: '2days', label: '2天前', minutes: 2880 },
  { id: '1week', label: '1周前', minutes: 10080 },
];

// 初始化推送通知
let isInitialized = false;

const initializePushNotification = () => {
  if (isInitialized) return;
  
  PushNotification.configure({
    // Android 必需的配置
    onRegister: function (token) {
      console.log('📱 通知注册成功:', token);
    },

    onNotification: function (notification) {
      console.log('📬 收到通知:', notification);
      
      // 处理通知点击
      if (notification.userInteraction) {
        console.log('👆 用户点击了通知');
      }
    },

    // Android 特定配置
    senderID: "YOUR_SENDER_ID", // FCM Sender ID (可选)
    
    // 权限配置
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },

    // 弹出初始通知 (可选)
    popInitialNotification: true,

    // 请求权限 (可选)
    requestPermissions: Platform.OS === 'ios',
  });

  // 创建默认通知渠道 (Android 8.0+)
  if (Platform.OS === 'android') {
    PushNotification.createChannel(
      {
        channelId: "calendar-events", // 渠道ID
        channelName: "日历事件", // 渠道名称
        channelDescription: "日历事件提醒通知", // 渠道描述
        playSound: true, // 播放声音
        soundName: "default", // 声音文件名
        importance: 3, // 重要性级别 (0=min, 1=low, 2=default, 3=high, 4=max)
        vibrate: true, // 震动
        lights: true, // LED 灯
        lockscreenVisibility: 1, // 锁屏显示
      },
      (created, error) => {
        if (error) {
          console.error('📢 通知渠道创建失败:', error);
        } else {
          console.log(`📢 通知渠道创建${created ? '成功' : '失败'}`);
        }
      }
    );
  }

  isInitialized = true;
};

// 请求通知权限
export const requestNotificationPermissions = async () => {
  try {
    console.log('🔐 请求通知权限...');
    
    // 初始化推送通知
    initializePushNotification();
    
    if (Platform.OS === 'android') {
      // Android 13+ 需要显式请求通知权限
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: '通知权限',
            message: '日历应用需要通知权限来提醒您的事件',
            buttonNeutral: '稍后询问',
            buttonNegative: '拒绝',
            buttonPositive: '允许',
          }
        );
        
        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        console.log(`📱 Android 通知权限: ${hasPermission ? '已授权' : '被拒绝'}`);
        
        // 保存权限状态
        await AsyncStorage.setItem(
          STORAGE_KEYS.NOTIFICATION_PERMISSIONS,
          JSON.stringify({ granted: hasPermission, timestamp: Date.now() })
        );
        
        return hasPermission;
      } else {
        // Android 12 及以下版本默认有通知权限
        console.log('📱 Android 12及以下，默认有通知权限');
        await AsyncStorage.setItem(
          STORAGE_KEYS.NOTIFICATION_PERMISSIONS,
          JSON.stringify({ granted: true, timestamp: Date.now() })
        );
        return true;
      }
    } else if (Platform.OS === 'ios') {
      // iOS 权限请求
      return new Promise((resolve) => {
        PushNotification.requestPermissions((permissions) => {
          const hasPermission = permissions.alert && permissions.sound;
          console.log(`🍎 iOS 通知权限: ${hasPermission ? '已授权' : '被拒绝'}`);
          
          AsyncStorage.setItem(
            STORAGE_KEYS.NOTIFICATION_PERMISSIONS,
            JSON.stringify({ granted: hasPermission, timestamp: Date.now() })
          );
          
          resolve(hasPermission);
        });
      });
    }
    
    return false;
  } catch (error) {
    console.error('❌ 请求通知权限失败:', error);
    return false;
  }
};

// 获取通知权限状态
export const getNotificationStatus = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_PERMISSIONS);
    if (stored) {
      const { granted, timestamp } = JSON.parse(stored);
      return {
        granted,
        timestamp,
        platform: Platform.OS,
      };
    }
    return { granted: false, timestamp: null, platform: Platform.OS };
  } catch (error) {
    console.error('❌ 获取通知状态失败:', error);
    return { granted: false, timestamp: null, platform: Platform.OS };
  }
};

// 生成唯一的通知ID
const generateNotificationId = (eventId, reminderMinutes) => {
  // 使用更简单的 ID 格式，避免特殊字符和过长的 ID
  const hash = Math.abs(eventId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0));
  return `evt_${hash}_${reminderMinutes}`;
};

// 调度事件通知
export const scheduleEventNotifications = async (event, alarmActions = ['DISPLAY', 'AUDIO']) => {
  try {
    console.log('scheduleEventNotifications 被调用');
    console.log('event 参数:', JSON.stringify(event, null, 2));
    console.log('alarmActions 参数:', alarmActions);
    
    if (!event.reminders || event.reminders.length === 0) {
      console.log('事件无提醒设置，跳过通知调度');
      return [];
    }

    // 初始化推送通知
    initializePushNotification();

    const scheduledIds = [];
    const eventDate = event.startDate instanceof Date ? event.startDate : new Date(event.startDate);
    const now = new Date();

    console.log(`为事件 "${event.title}" 调度通知...`);
    console.log(`事件时间: ${eventDate.toLocaleString()}`);
    console.log(`当前时间: ${now.toLocaleString()}`);
    console.log(`提醒列表: ${event.reminders.join(', ')}`);
    console.log(`提醒动作: ${alarmActions.join(', ')}`);

    for (const reminderMinutes of event.reminders) {
      console.log(`处理提醒: ${reminderMinutes} 分钟`);
      
      const notificationTime = new Date(eventDate.getTime() - reminderMinutes * 60 * 1000);
      console.log(`通知时间: ${notificationTime.toLocaleString()}`);
      
      // 只调度未来的通知
      if (notificationTime <= now) {
        console.log(`⏰ 跳过过期提醒: ${reminderMinutes}分钟前 (${notificationTime.toLocaleString()})`);
        continue;
      }

      const notificationId = generateNotificationId(event.id, reminderMinutes);
      console.log(`通知ID: ${notificationId}`);
      
      // 计算距离通知时间的毫秒数
      const timeUntilNotification = notificationTime.getTime() - now.getTime();
      
      // 如果通知时间在1分钟内，使用 setTimeout + localNotification
      // 否则使用 localNotificationSchedule
      if (timeUntilNotification < 60000) {
        console.log(`通知时间在1分钟内 (${timeUntilNotification}ms)，使用 setTimeout`);
        
        const notificationConfig = {
          channelId: "calendar-events",
          title: `${event.title}`,
          message: `${getReminderDescription({ minutes: reminderMinutes })}开始\n${eventDate.toLocaleString()}`,
          playSound: alarmActions.includes('AUDIO'),
          soundName: 'default',
          vibrate: alarmActions.includes('AUDIO'),
          priority: 'high',
          importance: 3,
          userInfo: {
            eventId: event.id,
            eventTitle: event.title,
            eventStartDate: eventDate.toISOString(),
            reminderMinutes: reminderMinutes,
          },
        };
        
        console.log(`通知配置:`, JSON.stringify(notificationConfig, null, 2));
        
        setTimeout(() => {
          try {
            PushNotification.localNotification(notificationConfig);
            console.log(`通知发送成功: ${notificationId}`);
          } catch (error) {
            console.error(`通知发送失败: ${notificationId}`, error);
          }
        }, timeUntilNotification);
        
        scheduledIds.push(notificationId);
        console.log(`已设置定时器: ${notificationId} 在 ${notificationTime.toLocaleString()}`);
      } else {
        console.log(`通知时间超过1分钟，使用 localNotificationSchedule`);
        
        // 调度本地通知
        const notificationConfig = {
          id: notificationId,
          channelId: "calendar-events",
          title: `${event.title}`,
          message: `${getReminderDescription({ minutes: reminderMinutes })}开始\n${eventDate.toLocaleString()}`,
          date: notificationTime,
          playSound: alarmActions.includes('AUDIO'),
          soundName: 'default',
          vibrate: alarmActions.includes('AUDIO'),
          priority: 'high',
          importance: 3,
          allowWhileIdle: true,
          userInfo: {
            eventId: event.id,
            eventTitle: event.title,
            eventStartDate: eventDate.toISOString(),
            reminderMinutes: reminderMinutes,
          },
        };
        
        console.log(`通知配置:`, JSON.stringify(notificationConfig, null, 2));
        
        try {
          PushNotification.localNotificationSchedule(notificationConfig);
          console.log(`通知调度成功: ${notificationId}`);
          
          // 验证通知是否已调度
          setTimeout(() => {
            PushNotification.getScheduledLocalNotifications((notifications) => {
              console.log(`当前已调度的通知数量: ${notifications.length}`);
              const scheduled = notifications.find(n => n.id === notificationId);
              if (scheduled) {
                console.log(`通知 ${notificationId} 已成功调度`);
                console.log(`调度详情:`, JSON.stringify(scheduled, null, 2));
              } else {
                console.log(`通知 ${notificationId} 未找到在已调度列表中`);
              }
            });
          }, 500);
        } catch (scheduleError) {
          console.error(`通知调度失败: ${notificationId}`, scheduleError);
          continue;
        }

        scheduledIds.push(notificationId);
        console.log(`已调度通知: ${notificationId} 在 ${notificationTime.toLocaleString()}`);
      }
    }

    // 保存已调度的通知ID
    if (scheduledIds.length > 0) {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULED_NOTIFICATIONS);
      const scheduledNotifications = stored ? JSON.parse(stored) : {};
      scheduledNotifications[event.id] = scheduledIds;
      await AsyncStorage.setItem(
        STORAGE_KEYS.SCHEDULED_NOTIFICATIONS,
        JSON.stringify(scheduledNotifications)
      );
    }

    console.log(`成功调度 ${scheduledIds.length} 个通知`);
    return scheduledIds;
  } catch (error) {
    console.error('调度通知失败:', error);
    Alert.alert('通知调度失败', error.message);
    return [];
  }
};

// 取消事件的所有通知
export const cancelEventNotifications = async (eventId) => {
  try {
    console.log(`取消事件 ${eventId} 的所有通知...`);

    // 获取已调度的通知
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULED_NOTIFICATIONS);
    const scheduledNotifications = stored ? JSON.parse(stored) : {};
    
    const notificationIds = scheduledNotifications[eventId] || [];
    
    // 取消每个通知
    for (const notificationId of notificationIds) {
      PushNotification.cancelLocalNotification(notificationId);
      console.log(`已取消通知: ${notificationId}`);
    }

    // 从存储中移除
    delete scheduledNotifications[eventId];
    await AsyncStorage.setItem(
      STORAGE_KEYS.SCHEDULED_NOTIFICATIONS,
      JSON.stringify(scheduledNotifications)
    );

    console.log(`成功取消 ${notificationIds.length} 个通知`);
    return notificationIds.length;
  } catch (error) {
    console.error('取消通知失败:', error);
    return 0;
  }
};

// 根据事件ID取消通知 (别名函数)
export const cancelEventNotificationsByEventId = cancelEventNotifications;

// 获取提醒描述
export const getReminderDescription = (reminder) => {
  if (!reminder) return '无提醒';
  
  const minutes = reminder.minutes;
  if (minutes === 0) return '准时';
  if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours}小时前`;
  } else {
    const days = Math.floor(minutes / 1440);
    return `${days}天前`;
  }
};

// 清理过期的通知记录
export const cleanupExpiredNotifications = async () => {
  try {
    console.log('清理过期通知记录...');
    
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULED_NOTIFICATIONS);
    if (!stored) return;
    
    const scheduledNotifications = JSON.parse(stored);
    const now = Date.now();
    let cleanedCount = 0;
    
    // 这里可以添加更复杂的清理逻辑
    // 目前保持简单，只在应用启动时清理
    
    console.log(`清理完成，移除了 ${cleanedCount} 个过期记录`);
  } catch (error) {
    console.error('清理过期通知失败:', error);
  }
};

// 获取所有已调度的通知 (调试用)
export const getScheduledNotifications = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULED_NOTIFICATIONS);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('获取已调度通知失败:', error);
    return {};
  }
};

// 检查已调度的通知 (调试用)
export const checkScheduledNotifications = async () => {
  try {
    console.log('检查已调度的通知...');
    const scheduled = await getScheduledNotifications();
    console.log('已调度的通知:', JSON.stringify(scheduled, null, 2));
    
    // 使用 PushNotification.getScheduledLocalNotifications 获取实际调度的通知
    PushNotification.getScheduledLocalNotifications((notifications) => {
      console.log(`实际调度的通知数量: ${notifications.length}`);
      notifications.forEach((notification, index) => {
        console.log(`通知 ${index + 1}:`, JSON.stringify(notification, null, 2));
      });
    });
  } catch (error) {
    console.error('检查已调度通知失败:', error);
  }
};

// 测试通知功能
export const testNotification = () => {
  try {
    initializePushNotification();
    
    setTimeout(() => {
      PushNotification.localNotification({
        channelId: "calendar-events",
        title: "测试通知",
        message: "这是一个测试通知，用于验证通知功能是否正常工作",
        playSound: true,
        soundName: 'default',
        vibrate: true,
        priority: 'high',
        importance: 3,
      });
      
      console.log('已发送测试通知');
    }, 100);
  } catch (error) {
    console.error('测试通知失败:', error);
  }
};

// 应用启动时的初始化
export const initializeNotifications = async () => {
  try {
    console.log('初始化通知系统...');
    
    // 初始化推送通知配置
    initializePushNotification();
    
    // 清理过期通知
    await cleanupExpiredNotifications();
    
    console.log('通知系统初始化完成');
  } catch (error) {
    console.error('通知系统初始化失败:', error);
  }
};