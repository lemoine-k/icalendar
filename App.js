import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Platform, Alert, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { THEMES, getTheme, getThemeList } from './utils/themes';
import { 
  createVEvent, 
  updateVEvent,
  formatICalDate, 
  formatICalDateTimeFromString,
  parseICalDateTime,
  exportToICalendar,
  parseICalendar,
  buildRRule,
  parseRRule,
  getRRuleDescription,
  createVAlarm,
  getAlarmDescription,
  parseTriggerToMinutes,
  EVENT_STATUS,
  PRIORITY,
  FREQ,
  ALARM_TRIGGER,
  ALARM_ACTION
} from './utils/icalendar';
import {
  createSubscription,
  syncSubscription,
  needsRefresh,
  getSubscriptionStatus,
  validateSubscriptionUrl,
  PRESET_CALENDARS,
  SUBSCRIPTION_CATEGORIES,
} from './utils/subscription';
import MonthView from './components/MonthView';
import WeekView from './components/WeekView';
import DayView from './components/DayView';

// 视图类型常量
const VIEW_TYPES = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
};

export default function App() {
  const [selectedDate, setSelectedDate] = useState('');
  const [events, setEvents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  
  // 事件基本信息
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventPriority, setEventPriority] = useState(PRIORITY.MEDIUM);
  
  // 时间相关
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [endDate, setEndDate] = useState('');
  
  // 重复规则
  const [hasRepeat, setHasRepeat] = useState(false);
  const [repeatFreq, setRepeatFreq] = useState(FREQ.DAILY);
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatCount, setRepeatCount] = useState(10);
  const [repeatWeekdays, setRepeatWeekdays] = useState([]);
  
  // 提醒设置
  const [hasAlarm, setHasAlarm] = useState(false);
  const [alarmTriggers, setAlarmTriggers] = useState([ALARM_TRIGGER.MINUTES_15]);
  const [alarmAction, setAlarmAction] = useState(ALARM_ACTION.DISPLAY);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewType, setViewType] = useState(VIEW_TYPES.MONTH);
  const [fadeAnim] = useState(new Animated.Value(1));
  
  // 订阅管理
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // 主题管理
  const [currentTheme, setCurrentTheme] = useState('apple');
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const theme = getTheme(currentTheme);
  
  // 快速跳转
  const [quickJumpVisible, setQuickJumpVisible] = useState(false);
  
  // 搜索功能
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const onDayPress = (dateString, time = null) => {
    setSelectedDate(dateString);
    setEndDate(dateString);
    if (time) {
      setStartTime(time);
      const [hours, minutes] = time.split(':');
      const endHour = (parseInt(hours) + 1) % 24;
      setEndTime(`${String(endHour).padStart(2, '0')}:${minutes}`);
    }
    setEditingEvent(null);
    resetForm();
    setModalVisible(true);
  };

  const resetForm = () => {
    setEventTitle('');
    setEventDescription('');
    setEventLocation('');
    setEventPriority(PRIORITY.MEDIUM);
    setIsAllDay(false);
    setStartTime('09:00');
    setEndTime('10:00');
    setHasRepeat(false);
    setRepeatFreq(FREQ.DAILY);
    setRepeatInterval(1);
    setRepeatCount(10);
    setRepeatWeekdays([]);
    setHasAlarm(false);
    setAlarmTriggers([ALARM_TRIGGER.MINUTES_15]);
    setAlarmAction(ALARM_ACTION.DISPLAY);
  };

  // 验证表单是否有效
  const isFormValid = () => {
    if (!eventTitle.trim()) return false;
    if (!selectedDate) return false;
    
    // 验证时间格式
    if (!isAllDay) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) return false;
    }
    
    // 验证日期格式
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(selectedDate)) return false;
    if (endDate && !dateRegex.test(endDate)) return false;
    
    return true;
  };

  const addEvent = () => {
    if (!isFormValid()) return;
    
    // 构建 RRULE
    let rrule = '';
    if (hasRepeat) {
      rrule = buildRRule({
        freq: repeatFreq,
        interval: repeatInterval,
        count: repeatCount,
        byday: repeatWeekdays.length > 0 ? repeatWeekdays : undefined,
      });
    }
    
    // 构建提醒
    const alarms = hasAlarm ? alarmTriggers.map(trigger => 
      createVAlarm({
        action: alarmAction,
        trigger: trigger,
        description: eventTitle,
      })
    ) : [];
    
    // 构建开始和结束时间
    const dtstart = isAllDay 
      ? formatICalDate(selectedDate)
      : formatICalDateTimeFromString(selectedDate, startTime);
    
    const dtend = isAllDay
      ? formatICalDate(endDate || selectedDate)
      : formatICalDateTimeFromString(endDate || selectedDate, endTime);
    
    if (editingEvent) {
      // 更新现有事件
      const updatedEvent = updateVEvent(editingEvent, {
        summary: eventTitle,
        dtstart,
        dtend,
        description: eventDescription,
        location: eventLocation,
        priority: eventPriority,
        isAllDay,
        rrule,
        alarms,
      });
      
      setEvents(events.map(e => e.uid === editingEvent.uid ? updatedEvent : e));
    } else {
      // 创建新事件
      const vevent = createVEvent({
        summary: eventTitle,
        dtstart,
        dtend,
        description: eventDescription,
        location: eventLocation,
        status: EVENT_STATUS.CONFIRMED,
        priority: eventPriority,
        isAllDay,
        rrule,
        alarms,
        categories: [],
      });
      
      setEvents([...events, vevent]);
    }
    
    setModalVisible(false);
    resetForm();
    setEditingEvent(null);
  };

  const editEvent = (event) => {
    setEditingEvent(event);
    setEventTitle(event.summary);
    setEventDescription(event.description);
    setEventLocation(event.location);
    setEventPriority(event.priority);
    setIsAllDay(event.isAllDay);
    
    const { date: startDate, time: startTimeStr } = parseICalDateTime(event.dtstart);
    const { date: endDateStr, time: endTimeStr } = parseICalDateTime(event.dtend);
    
    setSelectedDate(startDate);
    setEndDate(endDateStr);
    setStartTime(startTimeStr || '09:00');
    setEndTime(endTimeStr || '10:00');
    
    if (event.rrule) {
      setHasRepeat(true);
      const parsed = parseRRule(event.rrule);
      if (parsed) {
        setRepeatFreq(parsed.freq || FREQ.DAILY);
        setRepeatInterval(parsed.interval || 1);
        setRepeatCount(parsed.count || 10);
        setRepeatWeekdays(parsed.byday || []);
      }
    } else {
      setHasRepeat(false);
    }
    
    if (event.alarms && event.alarms.length > 0) {
      setHasAlarm(true);
      setAlarmTriggers(event.alarms.map(alarm => alarm.trigger));
      setAlarmAction(event.alarms[0].action || ALARM_ACTION.DISPLAY);
    } else {
      setHasAlarm(false);
    }
    
    setModalVisible(true);
  };

  const deleteEvent = (uid) => {
    setEvents(events.filter(event => event.uid !== uid));
  };

  const exportCalendar = () => {
    const icalString = exportToICalendar(events);
    console.log('iCalendar Export:', icalString);
    
    if (Platform.OS === 'web') {
      // Web 平台：下载为 .ics 文件
      const blob = new Blob([icalString], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `calendar_${new Date().getTime()}.ics`;
      link.click();
      URL.revokeObjectURL(url);
      
      Alert.alert('导出成功', `已导出 ${events.length} 个事件`);
    } else {
      Alert.alert('导出成功', 'iCalendar 数据已输出到控制台');
    }
  };

  const importCalendar = () => {
    if (Platform.OS === 'web') {
      // Web 平台：使用文件选择器
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.ics,.ical';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const icalString = event.target.result;
              const importedEvents = parseICalendar(icalString);
              
              if (importedEvents.length === 0) {
                alert('未找到有效的事件数据');
                return;
              }
              
              // 合并导入的事件（避免重复 UID）
              const existingUids = new Set(events.map(e => e.uid));
              const newEvents = importedEvents.filter(e => !existingUids.has(e.uid));
              
              if (newEvents.length === 0) {
                alert('所有事件已存在，未导入新事件');
                return;
              }
              
              setEvents([...events, ...newEvents]);
              alert(`导入成功！\n新增 ${newEvents.length} 个事件\n重复 ${importedEvents.length - newEvents.length} 个事件`);
            } catch (error) {
              console.error('Import error:', error);
              alert('导入失败：文件格式不正确');
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    } else {
      Alert.alert('提示', '移动端导入功能开发中');
    }
  };

  // 添加订阅
  const addSubscription = async (preset) => {
    // 检查是否已订阅
    if (subscriptions.some(sub => sub.id === preset.id)) {
      if (Platform.OS === 'web') {
        alert('已经订阅过此日历');
      } else {
        Alert.alert('提示', '已经订阅过此日历');
      }
      return;
    }
    
    const subscription = createSubscription({
      ...preset,
      enabled: true,
    });
    
    // 先添加到订阅列表
    setSubscriptions([...subscriptions, subscription]);
    
    // 立即同步（标记为初始同步）
    const result = await syncSubscriptionNow(subscription, true);
    
    // 如果同步失败，订阅已在 syncSubscriptionNow 中被移除
    return result;
  };

  // 同步单个订阅
  const syncSubscriptionNow = async (subscription, isInitialSync = false) => {
    if (!subscription.enabled) {
      console.log('订阅已禁用，跳过同步');
      return { success: false, error: '订阅已禁用' };
    }
    
    console.log('开始同步订阅:', subscription.name);
    setSyncing(true);
    
    try {
      const result = await syncSubscription(subscription, parseICalendar);
      
      console.log('同步结果:', result);
      
      if (result.success) {
        // 更新订阅状态
        const updatedSubscription = {
          ...subscription,
          lastSync: result.syncTime,
          lastSyncStatus: 'success',
          lastSyncError: null,
          eventCount: result.eventCount,
        };
        
        setSubscriptions(prevSubs => 
          prevSubs.map(sub => 
            sub.id === subscription.id ? updatedSubscription : sub
          )
        );
        
        // 移除旧的订阅事件
        setEvents(prevEvents => {
          const filteredEvents = prevEvents.filter(e => e.subscriptionId !== subscription.id);
          // 添加新的订阅事件
          return [...filteredEvents, ...result.events];
        });
        
        if (Platform.OS === 'web') {
          alert(`✅ 同步成功！\n\n订阅: ${subscription.name}\n事件数: ${result.eventCount}`);
        } else {
          Alert.alert('同步成功', `${subscription.name}\n事件数: ${result.eventCount}`);
        }
        
        return { success: true };
      } else {
        console.error('同步失败:', result.error);
        
        // 如果是初始同步失败，移除订阅
        if (isInitialSync) {
          console.log('初始同步失败，移除订阅');
          setSubscriptions(prevSubs => 
            prevSubs.filter(sub => sub.id !== subscription.id)
          );
          
          if (Platform.OS === 'web') {
            alert(`❌ 订阅失败\n\n订阅: ${subscription.name}\n错误: ${result.error}\n\n已自动取消订阅。\n\n建议:\n1. 检查网络连接\n2. 确认订阅URL是否正确\n3. 稍后重试`);
          } else {
            Alert.alert('订阅失败', `${subscription.name}\n${result.error}\n\n已自动取消订阅`);
          }
        } else {
          // 非初始同步失败，更新状态但保留订阅
          const updatedSubscription = {
            ...subscription,
            lastSync: result.syncTime,
            lastSyncStatus: 'error',
            lastSyncError: result.error,
            eventCount: 0,
          };
          
          setSubscriptions(prevSubs => 
            prevSubs.map(sub => 
              sub.id === subscription.id ? updatedSubscription : sub
            )
          );
          
          if (Platform.OS === 'web') {
            alert(`❌ 同步失败\n\n订阅: ${subscription.name}\n错误: ${result.error}\n\n提示: 可能是网络问题或 CORS 限制`);
          } else {
            Alert.alert('同步失败', `${subscription.name}\n${result.error}`);
          }
        }
        
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Sync error:', error);
      
      // 如果是初始同步失败，移除订阅
      if (isInitialSync) {
        console.log('初始同步异常，移除订阅');
        setSubscriptions(prevSubs => 
          prevSubs.filter(sub => sub.id !== subscription.id)
        );
        
        if (Platform.OS === 'web') {
          alert(`❌ 订阅失败\n\n${error.message}\n\n已自动取消订阅。\n\n建议:\n1. 检查网络连接\n2. 确认订阅URL是否正确\n3. 稍后重试`);
        } else {
          Alert.alert('订阅失败', `${error.message}\n\n已自动取消订阅`);
        }
      } else {
        if (Platform.OS === 'web') {
          alert(`❌ 同步异常\n\n${error.message}\n\n提示: 请检查网络连接或稍后重试`);
        } else {
          Alert.alert('同步异常', error.message);
        }
      }
      
      return { success: false, error: error.message };
    } finally {
      setSyncing(false);
    }
  };

  // 同步所有订阅
  const syncAllSubscriptions = async () => {
    const enabledSubs = subscriptions.filter(sub => sub.enabled && needsRefresh(sub));
    
    if (enabledSubs.length === 0) {
      if (Platform.OS === 'web') {
        alert('所有订阅都是最新的');
      } else {
        Alert.alert('提示', '所有订阅都是最新的');
      }
      return;
    }
    
    setSyncing(true);
    
    for (const sub of enabledSubs) {
      await syncSubscriptionNow(sub);
    }
    
    setSyncing(false);
  };

  // 删除订阅
  const removeSubscription = (subscriptionId) => {
    // 移除订阅
    setSubscriptions(subscriptions.filter(sub => sub.id !== subscriptionId));
    
    // 移除订阅的事件
    setEvents(events.filter(e => e.subscriptionId !== subscriptionId));
  };

  // 切换订阅启用状态
  const toggleSubscription = (subscriptionId) => {
    setSubscriptions(subscriptions.map(sub => {
      if (sub.id === subscriptionId) {
        const enabled = !sub.enabled;
        
        // 如果禁用，移除该订阅的事件
        if (!enabled) {
          setEvents(events.filter(e => e.subscriptionId !== subscriptionId));
        }
        
        return { ...sub, enabled };
      }
      return sub;
    }));
  };

  // 获取指定日期的事件
  const getEventsForDate = (dateString) => {
    const icalDate = formatICalDate(dateString);
    return events.filter(event => {
      // 检查日期部分是否匹配（支持 DATE 和 DATE-TIME 格式）
      const eventDatePart = event.dtstart.substring(0, 8);
      return eventDatePart === icalDate;
    });
  };

  // 搜索事件
  const searchEvents = (query) => {
    if (!query.trim()) return events;
    const lowerQuery = query.toLowerCase();
    return events.filter(event => 
      event.summary.toLowerCase().includes(lowerQuery) ||
      (event.description && event.description.toLowerCase().includes(lowerQuery)) ||
      (event.location && event.location.toLowerCase().includes(lowerQuery))
    );
  };

  // 获取事件统计
  const getEventStats = () => {
    const total = events.length;
    const subscribed = events.filter(e => e.isSubscribed).length;
    const personal = total - subscribed;
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayEvents = getEventsForDate(todayString).length;
    
    return { total, subscribed, personal, todayEvents };
  };



  const changeMonth = (delta) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentMonth(newDate);
  };

  const changeWeek = (delta) => {
    const currentDate = selectedDate ? new Date(selectedDate) : currentMonth;
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (delta * 7));
    setCurrentMonth(newDate);
    setSelectedDate(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`);
  };

  const changeDay = (delta) => {
    const currentDate = selectedDate ? new Date(selectedDate) : currentMonth;
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + delta);
    setCurrentMonth(newDate);
    setSelectedDate(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`);
  };

  const getWeekRange = () => {
    const date = selectedDate ? new Date(selectedDate) : currentMonth;
    const day = date.getDay();
    const diff = date.getDate() - day;
    
    const weekStart = new Date(date);
    weekStart.setDate(diff);
    
    const weekEnd = new Date(date);
    weekEnd.setDate(diff + 6);
    
    return `${weekStart.getMonth() + 1}月${weekStart.getDate()}日 - ${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`;
  };

  // 切换视图类型（带动画）
  const switchView = (newViewType) => {
    if (newViewType === viewType) return;
    
    // 淡出动画
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      // 切换视图
      setViewType(newViewType);
      
      // 淡入动画
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
    });
  };

  // 处理事件点击
  const handleEventPress = (event) => {
    const { date, time } = parseICalDateTime(event.dtstart);
    const repeatDesc = getRRuleDescription(event.rrule);
    
    // 订阅事件只读
    if (event.isSubscribed) {
      const message = `📅 ${date} ${time || '全天'}\n📝 ${event.description || '无描述'}\n📍 ${event.location || '无地点'}\n🔁 ${repeatDesc}\n✅ ${event.status}\n\n📌 来源: ${event.subscriptionName || '订阅日历'}\n🔒 此事件为只读，无法编辑`;
      
      if (Platform.OS === 'web') {
        alert(`${event.summary}\n\n${message}`);
      } else {
        Alert.alert(event.summary, message, [{ text: '确定' }]);
      }
      return;
    }
    
    // 普通事件可编辑
    const message = `📅 ${date} ${time || '全天'}\n📝 ${event.description || '无描述'}\n📍 ${event.location || '无地点'}\n🔁 ${repeatDesc}\n✅ ${event.status}\n⚡ 优先级: ${event.priority}`;
    
    if (Platform.OS === 'web') {
      if (confirm(`${event.summary}\n\n${message}\n\n是否编辑此事件？`)) {
        editEvent(event);
      }
    } else {
      Alert.alert(
        event.summary,
        message,
        [
          { text: '取消', style: 'cancel' },
          { text: '编辑', onPress: () => editEvent(event) },
          { text: '删除', onPress: () => deleteEvent(event.uid), style: 'destructive' },
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="auto" />
      
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>日历</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
              onPress={() => {
                const today = new Date();
                setCurrentMonth(today);
                setSelectedDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
              }}
            >
              <Text style={styles.headerButtonText}>今天</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
              onPress={() => setThemeModalVisible(true)}
            >
              <Text style={styles.themeButtonText}>🎨</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 视图切换按钮 */}
      <View style={[styles.viewSwitcher, { 
        backgroundColor: theme.card,
        borderBottomColor: theme.border 
      }]}>
        <TouchableOpacity
          style={[
            styles.viewButton, 
            viewType === VIEW_TYPES.MONTH && {
              backgroundColor: theme.primary,
            }
          ]}
          onPress={() => switchView(VIEW_TYPES.MONTH)}
        >
          <Text style={[
            styles.viewButtonText,
            { color: viewType === VIEW_TYPES.MONTH ? '#fff' : theme.textSecondary },
            viewType === VIEW_TYPES.MONTH && styles.viewButtonTextActive
          ]}>
            月
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewButton, 
            viewType === VIEW_TYPES.WEEK && {
              backgroundColor: theme.primary,
            }
          ]}
          onPress={() => switchView(VIEW_TYPES.WEEK)}
        >
          <Text style={[
            styles.viewButtonText,
            { color: viewType === VIEW_TYPES.WEEK ? '#fff' : theme.textSecondary },
            viewType === VIEW_TYPES.WEEK && styles.viewButtonTextActive
          ]}>
            周
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewButton, 
            viewType === VIEW_TYPES.DAY && {
              backgroundColor: theme.primary,
            }
          ]}
          onPress={() => switchView(VIEW_TYPES.DAY)}
        >
          <Text style={[
            styles.viewButtonText,
            { color: viewType === VIEW_TYPES.DAY ? '#fff' : theme.textSecondary },
            viewType === VIEW_TYPES.DAY && styles.viewButtonTextActive
          ]}>
            日
          </Text>
        </TouchableOpacity>
      </View>

      {/* 导航栏 */}
      {viewType === VIEW_TYPES.MONTH && (
        <View style={[styles.calendarNav, { 
          backgroundColor: theme.card,
          borderBottomColor: theme.border 
        }]}>
          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: theme.background }]} 
            onPress={() => changeMonth(-1)}
          >
            <Text style={[styles.navButtonText, { color: theme.primary }]}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setQuickJumpVisible(true)}>
            <Text style={[styles.monthTitle, { color: theme.text }]}>
              {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: theme.background }]} 
            onPress={() => changeMonth(1)}
          >
            <Text style={[styles.navButtonText, { color: theme.primary }]}>→</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {viewType === VIEW_TYPES.WEEK && (
        <View style={[styles.calendarNav, { 
          backgroundColor: theme.card,
          borderBottomColor: theme.border 
        }]}>
          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: theme.background }]} 
            onPress={() => changeWeek(-1)}
          >
            <Text style={[styles.navButtonText, { color: theme.primary }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: theme.text }]}>
            {getWeekRange()}
          </Text>
          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: theme.background }]} 
            onPress={() => changeWeek(1)}
          >
            <Text style={[styles.navButtonText, { color: theme.primary }]}>→</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {viewType === VIEW_TYPES.DAY && (
        <View style={[styles.calendarNav, { 
          backgroundColor: theme.card,
          borderBottomColor: theme.border 
        }]}>
          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: theme.background }]} 
            onPress={() => changeDay(-1)}
          >
            <Text style={[styles.navButtonText, { color: theme.primary }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: theme.text }]}>
            {selectedDate || `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(currentMonth.getDate()).padStart(2, '0')}`}
          </Text>
          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: theme.background }]} 
            onPress={() => changeDay(1)}
          >
            <Text style={[styles.navButtonText, { color: theme.primary }]}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 主内容区域 */}
      <View style={styles.mainContent}>
        {/* 视图容器（带动画） */}
        <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
          {viewType === VIEW_TYPES.MONTH && (
            <MonthView
              currentMonth={currentMonth}
              events={events}
              onDayPress={onDayPress}
              selectedDate={selectedDate}
              getEventsForDate={getEventsForDate}
              theme={theme}
            />
          )}
          {viewType === VIEW_TYPES.WEEK && (
            <WeekView
              currentMonth={currentMonth}
              events={events}
              onEventPress={handleEventPress}
              selectedDate={selectedDate}
              theme={theme}
            />
          )}
          {viewType === VIEW_TYPES.DAY && (
            <DayView
              selectedDate={selectedDate || `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(currentMonth.getDate()).padStart(2, '0')}`}
              events={events}
              onEventPress={handleEventPress}
              theme={theme}
            />
          )}
        </Animated.View>

        {/* 事件列表 */}
        <ScrollView style={[styles.eventsList, { backgroundColor: theme.background }]}>
        <View style={styles.eventsHeader}>
          <View style={styles.eventsHeaderLeft}>
            <Text style={[styles.eventsTitle, { color: theme.text }]}>事件</Text>
            <Text style={[styles.eventsStats, { color: theme.textSecondary }]}>
              {(() => {
                const stats = getEventStats();
                return `${stats.personal}个 · 今天${stats.todayEvents}个`;
              })()}
            </Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.subscribeButton, { backgroundColor: theme.primary }]}
              onPress={() => setSubscriptionModalVisible(true)}
            >
              <Text style={styles.subscribeButtonText}>🔗 订阅</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.importButton, { backgroundColor: theme.success }]}
              onPress={importCalendar}
            >
              <Text style={styles.importButtonText}>📥 导入</Text>
            </TouchableOpacity>
            {events.length > 0 && (
              <TouchableOpacity
                style={[styles.exportButton, { backgroundColor: theme.warning }]}
                onPress={exportCalendar}
              >
                <Text style={[styles.exportButtonText, { 
                  color: theme.id === 'appleDark' ? '#000' : '#fff' 
                }]}>📤 导出</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {events.filter(e => !e.isSubscribed).length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>暂无事件</Text>
            <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
              点击日历上的日期添加事件
            </Text>
          </View>
        ) : (
          events
            .filter(event => !event.isSubscribed) // 只显示非订阅事件
            .sort((a, b) => b.dtstart.localeCompare(a.dtstart))
            .map(event => (
              <TouchableOpacity 
                key={event.uid} 
                style={[
                  styles.eventItem,
                  { 
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    borderLeftColor: theme.primary 
                  }
                ]}
                onPress={() => editEvent(event)}
                activeOpacity={0.7}
              >
                <View style={styles.eventContent}>
                  <Text style={[styles.eventTitle, { color: theme.text }]}>{event.summary}</Text>
                  <Text style={[styles.eventDate, { color: theme.textSecondary }]}>
                    📅 {(() => {
                      const { date, time } = parseICalDateTime(event.dtstart);
                      return `${date} ${time ? time : '全天'}`;
                    })()}
                  </Text>
                  {event.rrule ? (
                    <Text style={[styles.eventRepeat, { color: theme.primary }]}>
                      🔁 {getRRuleDescription(event.rrule)}
                    </Text>
                  ) : null}
                  {event.alarms && event.alarms.length > 0 ? (
                    <Text style={[styles.eventAlarm, { color: theme.warning }]}>
                      🔔 {event.alarms.map(alarm => getAlarmDescription(alarm.trigger)).join(', ')}
                    </Text>
                  ) : null}
                  {event.description ? (
                    <Text style={[styles.eventDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                      📝 {event.description}
                    </Text>
                  ) : null}
                  {event.location ? (
                    <Text style={[styles.eventLocation, { color: theme.textSecondary }]}>
                      📍 {event.location}
                    </Text>
                  ) : null}
                  <View style={styles.eventMeta}>
                    <Text style={[styles.eventStatus, { color: theme.success }]}>
                      ✅ {event.status}
                    </Text>
                    <Text style={[styles.eventPriority, { color: theme.textSecondary }]}>
                      ⚡ P{event.priority}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    deleteEvent(event.uid);
                  }}
                  style={[styles.deleteButton, { backgroundColor: theme.danger }]}
                >
                  <Text style={styles.deleteButtonText}>删除</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
        )}
        
        {/* 订阅事件统计 */}
        {events.filter(e => e.isSubscribed).length > 0 && (
          <View style={styles.subscriptionSummary}>
            <Text style={styles.subscriptionSummaryTitle}>
              📅 订阅事件统计
            </Text>
            <Text style={styles.subscriptionSummaryText}>
              共有 {events.filter(e => e.isSubscribed).length} 个订阅事件在日历中显示
            </Text>
            <Text style={styles.subscriptionSummaryHint}>
              💡 订阅事件在日历视图中查看，不可编辑
            </Text>
          </View>
        )}
        </ScrollView>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingEvent ? '编辑事件' : '添加事件'} - {selectedDate}
              </Text>
              
              <Text style={styles.fieldLabel}>标题 *</Text>
              <TextInput
                style={styles.input}
                placeholder="请输入事件标题"
                placeholderTextColor="#999"
                value={eventTitle}
                onChangeText={setEventTitle}
              />
              
              <Text style={styles.fieldLabel}>描述</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="请输入事件描述（可选）"
                placeholderTextColor="#999"
                value={eventDescription}
                onChangeText={setEventDescription}
                multiline
                numberOfLines={3}
              />
              
              <Text style={styles.fieldLabel}>地点</Text>
              <TextInput
                style={styles.input}
                placeholder="请输入事件地点（可选）"
                placeholderTextColor="#999"
                value={eventLocation}
                onChangeText={setEventLocation}
              />

              {/* 全天事件开关 */}
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>全天事件</Text>
                <TouchableOpacity
                  style={[styles.switch, isAllDay && { backgroundColor: theme.primary }]}
                  onPress={() => setIsAllDay(!isAllDay)}
                >
                  <View style={[styles.switchThumb, isAllDay && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>

              {/* 时间选择 */}
              {!isAllDay && (
                <>
                  <Text style={styles.fieldLabel}>开始时间 *</Text>
                  <View style={styles.timePickerRow}>
                    <View style={styles.timePicker}>
                      <Text style={styles.timeLabel}>时</Text>
                      <TextInput
                        style={styles.timeInput}
                        value={startTime.split(':')[0]}
                        onChangeText={(text) => {
                          const hour = text.replace(/[^0-9]/g, '').slice(0, 2);
                          if (hour === '' || (parseInt(hour) >= 0 && parseInt(hour) <= 23)) {
                            setStartTime(`${hour.padStart(2, '0')}:${startTime.split(':')[1]}`);
                          }
                        }}
                        keyboardType="numeric"
                        maxLength={2}
                        placeholder="09"
                        placeholderTextColor="#999"
                      />
                    </View>
                    <Text style={styles.timeSeparator}>:</Text>
                    <View style={styles.timePicker}>
                      <Text style={styles.timeLabel}>分</Text>
                      <TextInput
                        style={styles.timeInput}
                        value={startTime.split(':')[1]}
                        onChangeText={(text) => {
                          const minute = text.replace(/[^0-9]/g, '').slice(0, 2);
                          if (minute === '' || (parseInt(minute) >= 0 && parseInt(minute) <= 59)) {
                            setStartTime(`${startTime.split(':')[0]}:${minute.padStart(2, '0')}`);
                          }
                        }}
                        keyboardType="numeric"
                        maxLength={2}
                        placeholder="00"
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>
                  
                  <Text style={styles.fieldLabel}>结束时间 *</Text>
                  <View style={styles.timePickerRow}>
                    <View style={styles.timePicker}>
                      <Text style={styles.timeLabel}>时</Text>
                      <TextInput
                        style={styles.timeInput}
                        value={endTime.split(':')[0]}
                        onChangeText={(text) => {
                          const hour = text.replace(/[^0-9]/g, '').slice(0, 2);
                          if (hour === '' || (parseInt(hour) >= 0 && parseInt(hour) <= 23)) {
                            setEndTime(`${hour.padStart(2, '0')}:${endTime.split(':')[1]}`);
                          }
                        }}
                        keyboardType="numeric"
                        maxLength={2}
                        placeholder="10"
                        placeholderTextColor="#999"
                      />
                    </View>
                    <Text style={styles.timeSeparator}>:</Text>
                    <View style={styles.timePicker}>
                      <Text style={styles.timeLabel}>分</Text>
                      <TextInput
                        style={styles.timeInput}
                        value={endTime.split(':')[1]}
                        onChangeText={(text) => {
                          const minute = text.replace(/[^0-9]/g, '').slice(0, 2);
                          if (minute === '' || (parseInt(minute) >= 0 && parseInt(minute) <= 59)) {
                            setEndTime(`${endTime.split(':')[0]}:${minute.padStart(2, '0')}`);
                          }
                        }}
                        keyboardType="numeric"
                        maxLength={2}
                        placeholder="00"
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>
                </>
              )}

              {/* 结束日期开关 */}
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>设置结束日期</Text>
                <TouchableOpacity
                  style={[styles.switch, endDate && { backgroundColor: theme.primary }]}
                  onPress={() => {
                    if (endDate) {
                      setEndDate('');
                    } else {
                      setEndDate(selectedDate);
                    }
                  }}
                >
                  <View style={[styles.switchThumb, endDate && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>

              {endDate && (
                <View style={styles.datePickerContainer}>
                  <TouchableOpacity
                    style={[styles.dateAdjustButton, { backgroundColor: theme.primary }]}
                    onPress={() => {
                      const date = new Date(endDate);
                      date.setDate(date.getDate() - 1);
                      setEndDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
                    }}
                  >
                    <Text style={styles.dateAdjustText}>−</Text>
                  </TouchableOpacity>
                  
                  <View style={[styles.datePicker, { 
                    backgroundColor: theme.background,
                    borderColor: theme.border 
                  }]}>
                    <Text style={[styles.datePickerText, { color: theme.text }]}>
                      {endDate}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.dateAdjustButton, { backgroundColor: theme.primary }]}
                    onPress={() => {
                      const date = new Date(endDate);
                      date.setDate(date.getDate() + 1);
                      setEndDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
                    }}
                  >
                    <Text style={styles.dateAdjustText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 重复规则 */}
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>重复事件</Text>
                <TouchableOpacity
                  style={[styles.switch, hasRepeat && styles.switchActive]}
                  onPress={() => setHasRepeat(!hasRepeat)}
                >
                  <View style={[styles.switchThumb, hasRepeat && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>

              {hasRepeat && (
                <>
                  <Text style={styles.fieldLabel}>重复频率</Text>
                  <View style={styles.repeatButtons}>
                    {[
                      { label: '每天', value: FREQ.DAILY },
                      { label: '每周', value: FREQ.WEEKLY },
                      { label: '每月', value: FREQ.MONTHLY },
                      { label: '每年', value: FREQ.YEARLY },
                    ].map(({ label, value }) => (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.repeatButton,
                          repeatFreq === value && {
                            backgroundColor: theme.primary,
                            borderColor: theme.primary,
                            shadowColor: theme.primary,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 3,
                          }
                        ]}
                        onPress={() => setRepeatFreq(value)}
                      >
                        <Text style={[
                          styles.repeatButtonText,
                          repeatFreq === value && styles.repeatButtonTextActive
                        ]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>重复次数</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="请输入重复次数，如: 10"
                    placeholderTextColor="#999"
                    value={String(repeatCount)}
                    onChangeText={(text) => setRepeatCount(parseInt(text) || 1)}
                    keyboardType="numeric"
                  />
                </>
              )}

              {/* 提醒设置 */}
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>设置提醒</Text>
                <TouchableOpacity
                  style={[styles.switch, hasAlarm && styles.switchActive]}
                  onPress={() => setHasAlarm(!hasAlarm)}
                >
                  <View style={[styles.switchThumb, hasAlarm && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>

              {hasAlarm && (
                <>
                  <Text style={styles.fieldLabel}>提醒时间</Text>
                  <View style={styles.alarmButtons}>
                    {[
                      { label: '准时', value: ALARM_TRIGGER.AT_TIME },
                      { label: '5分钟前', value: ALARM_TRIGGER.MINUTES_5 },
                      { label: '15分钟前', value: ALARM_TRIGGER.MINUTES_15 },
                      { label: '30分钟前', value: ALARM_TRIGGER.MINUTES_30 },
                      { label: '1小时前', value: ALARM_TRIGGER.HOURS_1 },
                      { label: '1天前', value: ALARM_TRIGGER.DAYS_1 },
                    ].map(({ label, value }) => (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.alarmButton,
                          alarmTriggers.includes(value) && {
                            backgroundColor: theme.warning,
                            borderColor: theme.warning,
                            shadowColor: theme.warning,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 3,
                          }
                        ]}
                        onPress={() => {
                          if (alarmTriggers.includes(value)) {
                            setAlarmTriggers(alarmTriggers.filter(t => t !== value));
                          } else {
                            setAlarmTriggers([...alarmTriggers, value]);
                          }
                        }}
                      >
                        <Text style={[
                          styles.alarmButtonText,
                          alarmTriggers.includes(value) && styles.alarmButtonTextActive
                        ]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>提醒方式</Text>
                  <View style={styles.alarmActionButtons}>
                    {[
                      { label: '📱 通知', value: ALARM_ACTION.DISPLAY },
                      { label: '🔔 声音', value: ALARM_ACTION.AUDIO },
                    ].map(({ label, value }) => (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.alarmActionButton,
                          alarmAction === value && styles.alarmActionButtonActive
                        ]}
                        onPress={() => setAlarmAction(value)}
                      >
                        <Text style={[
                          styles.alarmActionButtonText,
                          alarmAction === value && styles.alarmActionButtonTextActive
                        ]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              
              <Text style={styles.fieldLabel}>优先级</Text>
              <View style={styles.priorityButtons}>
                {[
                  { label: '最高', value: PRIORITY.HIGHEST },
                  { label: '高', value: PRIORITY.HIGH },
                  { label: '中', value: PRIORITY.MEDIUM },
                  { label: '低', value: PRIORITY.LOW },
                ].map(({ label, value }) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.priorityButton,
                      eventPriority === value && {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                        shadowColor: theme.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 3,
                      }
                    ]}
                    onPress={() => setEventPriority(value)}
                  >
                    <Text style={[
                      styles.priorityButtonText,
                      eventPriority === value && styles.priorityButtonTextActive
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setModalVisible(false);
                    setEventTitle('');
                    setEventDescription('');
                    setEventLocation('');
                    setEventPriority(PRIORITY.MEDIUM);
                  }}
                >
                  <Text style={styles.buttonText}>取消</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.button, 
                    styles.addButton,
                    !isFormValid() && styles.buttonDisabled
                  ]}
                  onPress={addEvent}
                  disabled={!isFormValid()}
                >
                  <Text style={[
                    styles.buttonText, 
                    styles.addButtonText,
                    !isFormValid() && styles.buttonTextDisabled
                  ]}>
                    {editingEvent ? '保存' : '添加'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
      {/* 订阅管理模态框 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={subscriptionModalVisible}
        onRequestClose={() => setSubscriptionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>日历订阅管理</Text>
              
              {/* 预设订阅 */}
              <Text style={styles.sectionTitle}>📚 预设订阅源</Text>
              {Object.values(PRESET_CALENDARS).map((preset) => {
                // 只有同步成功的订阅才显示"已订阅"
                const subscription = subscriptions.find(sub => sub.id === preset.id);
                const isSubscribed = subscription && subscription.lastSyncStatus === 'success';
                const isSyncing = subscription && subscription.lastSyncStatus === 'pending';
                
                return (
                  <View key={preset.id} style={styles.presetItem}>
                    <View style={styles.presetInfo}>
                      <Text style={styles.presetName}>{preset.name}</Text>
                      <Text style={styles.presetDescription}>{preset.description}</Text>
                      {subscription && subscription.lastSyncStatus === 'error' && (
                        <Text style={styles.presetError}>
                          ⚠️ 上次同步失败，可重新订阅
                        </Text>
                      )}
                    </View>
                    {isSubscribed ? (
                      <View style={styles.subscribedBadge}>
                        <Text style={styles.subscribedText}>✓ 已订阅</Text>
                        <Text style={styles.subscribedCount}>{subscription.eventCount} 事件</Text>
                      </View>
                    ) : isSyncing ? (
                      <Text style={styles.syncingText}>同步中...</Text>
                    ) : (
                      <TouchableOpacity
                        style={styles.subscribeSmallButton}
                        onPress={() => addSubscription(preset)}
                        disabled={syncing}
                      >
                        <Text style={styles.subscribeSmallButtonText}>
                          {syncing ? '请稍候' : '订阅'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              
              {/* 我的订阅 */}
              {subscriptions.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>📋 我的订阅</Text>
                  {subscriptions.map((sub) => (
                    <View key={sub.id} style={styles.subscriptionItem}>
                      <View style={styles.subscriptionHeader}>
                        <View style={styles.subscriptionInfo}>
                          <View style={styles.subscriptionTitleRow}>
                            <Text style={styles.subscriptionName}>{sub.name}</Text>
                            <View style={[
                              styles.statusIndicator,
                              sub.lastSyncStatus === 'success' && styles.statusSuccess,
                              sub.lastSyncStatus === 'error' && styles.statusError,
                              sub.lastSyncStatus === 'pending' && styles.statusPending,
                            ]}>
                              <Text style={styles.statusText}>
                                {sub.lastSyncStatus === 'success' ? '✓' : 
                                 sub.lastSyncStatus === 'error' ? '✗' : '○'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.subscriptionStatus}>
                            {getSubscriptionStatus(sub)} · {sub.eventCount} 个事件
                          </Text>
                          {sub.lastSyncError && (
                            <Text style={styles.errorText} numberOfLines={2}>
                              错误: {sub.lastSyncError}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={[styles.switch, sub.enabled && styles.switchActive]}
                          onPress={() => toggleSubscription(sub.id)}
                        >
                          <View style={[styles.switchThumb, sub.enabled && styles.switchThumbActive]} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.subscriptionActions}>
                        <TouchableOpacity
                          style={styles.syncButton}
                          onPress={() => syncSubscriptionNow(sub)}
                          disabled={syncing}
                        >
                          <Text style={styles.syncButtonText}>
                            {syncing ? '同步中...' : '🔄 同步'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeSubscription(sub.id)}
                        >
                          <Text style={styles.removeButtonText}>删除</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  
                  <TouchableOpacity
                    style={styles.syncAllButton}
                    onPress={syncAllSubscriptions}
                    disabled={syncing}
                  >
                    <Text style={styles.syncAllButtonText}>
                      {syncing ? '同步中...' : '🔄 同步所有订阅'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setSubscriptionModalVisible(false)}
              >
                <Text style={styles.buttonText}>关闭</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 快速跳转模态框 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={quickJumpVisible}
        onRequestClose={() => setQuickJumpVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setQuickJumpVisible(false)}
        >
          <View style={[styles.quickJumpModal, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>选择月份</Text>
            
            <View style={styles.yearSelector}>
              <TouchableOpacity
                style={[styles.yearButton, { backgroundColor: theme.background }]}
                onPress={() => {
                  const newDate = new Date(currentMonth);
                  newDate.setFullYear(newDate.getFullYear() - 1);
                  setCurrentMonth(newDate);
                }}
              >
                <Text style={[styles.yearButtonText, { color: theme.primary }]}>←</Text>
              </TouchableOpacity>
              <Text style={[styles.yearText, { color: theme.text }]}>
                {currentMonth.getFullYear()}年
              </Text>
              <TouchableOpacity
                style={[styles.yearButton, { backgroundColor: theme.background }]}
                onPress={() => {
                  const newDate = new Date(currentMonth);
                  newDate.setFullYear(newDate.getFullYear() + 1);
                  setCurrentMonth(newDate);
                }}
              >
                <Text style={[styles.yearButtonText, { color: theme.primary }]}>→</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.monthGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
                const isCurrentMonth = currentMonth.getMonth() + 1 === month;
                return (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.monthButton,
                      { backgroundColor: theme.background },
                      isCurrentMonth && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => {
                      const newDate = new Date(currentMonth);
                      newDate.setMonth(month - 1);
                      setCurrentMonth(newDate);
                      setQuickJumpVisible(false);
                    }}
                  >
                    <Text style={[
                      styles.monthButtonText,
                      { color: theme.text },
                      isCurrentMonth && { color: '#fff', fontWeight: '600' }
                    ]}>
                      {month}月
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { 
                backgroundColor: theme.background,
                borderColor: theme.border 
              }]}
              onPress={() => setQuickJumpVisible(false)}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>关闭</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 主题选择模态框 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={themeModalVisible}
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.themeModal}>
            <Text style={styles.modalTitle}>🎨 选择主题</Text>
            
            <View style={styles.themeGrid}>
              {getThemeList().map((themeOption) => (
                <TouchableOpacity
                  key={themeOption.id}
                  style={[
                    styles.themeCard,
                    currentTheme === themeOption.id && styles.themeCardActive
                  ]}
                  onPress={() => {
                    setCurrentTheme(themeOption.id);
                    setThemeModalVisible(false);
                  }}
                >
                  <View 
                    style={[
                      styles.themePreview,
                      { backgroundColor: themeOption.primary }
                    ]}
                  >
                    {currentTheme === themeOption.id && (
                      <Text style={styles.themeCheckmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.themeName}>{themeOption.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setThemeModalVisible(false)}
            >
              <Text style={styles.buttonText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  viewSwitcher: {
    flexDirection: 'row',
    padding: 12,
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 0.5,
  },
  viewButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'transparent',
    minWidth: 70,
    alignItems: 'center',
  },
  viewButtonActive: {
    // 动态设置
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  viewButtonTextActive: {
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
  },
  viewContainer: {
    flex: Platform.OS === 'web' ? 2 : 1,
    minHeight: Platform.OS === 'web' ? 0 : 400,
  },
  calendarNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  eventsList: {
    flex: Platform.OS === 'web' ? 1 : 1,
    padding: 16,
    maxHeight: Platform.OS === 'web' ? '100%' : undefined,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventsHeaderLeft: {
    flex: 1,
  },
  eventsTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  eventsStats: {
    fontSize: 13,
    fontWeight: '400',
  },
  subscriptionSummary: {
    backgroundColor: '#f8f3fc',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#9b59b6',
    shadowColor: '#9b59b6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  subscriptionSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subscriptionSummaryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  subscriptionSummaryHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  subscribeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  importButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  exportButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    textAlign: 'center',
  },
  eventItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#dadce0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      },
    }),
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#202124',
    marginBottom: 6,
  },
  eventDate: {
    fontSize: 13,
    color: '#5f6368',
    marginBottom: 4,
    fontWeight: '400',
  },
  eventRepeat: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  eventAlarm: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  eventDescription: {
    fontSize: 13,
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 13,
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    gap: 15,
  },
  eventStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventPriority: {
    fontSize: 12,
    fontWeight: '400',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    maxHeight: '90%',
    width: '100%',
    maxWidth: 600,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 24,
    color: '#2c3e50',
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
    marginTop: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#333',
    fontWeight: '500',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    gap: 12,
  },
  timePicker: {
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    fontSize: 12,
    color: '#7a8a99',
    fontWeight: '600',
  },
  timeInput: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    width: 80,
    backgroundColor: '#fafafa',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: '#667eea',
    marginTop: 20,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 15,
  },
  dateAdjustButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dateAdjustText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  datePicker: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  priorityButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  priorityButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  priorityButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ddd',
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#667eea',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  repeatButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  repeatButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  repeatButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  repeatButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  repeatButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  alarmButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  alarmButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  alarmButtonActive: {
    backgroundColor: '#ffa502',
    borderColor: '#ffa502',
    shadowColor: '#ffa502',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  alarmButtonText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  alarmButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  alarmActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  alarmActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  alarmActionButtonActive: {
    backgroundColor: '#ffa502',
    borderColor: '#ffa502',
    shadowColor: '#ffa502',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  alarmActionButtonText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  alarmActionButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 15,
  },
  presetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
  },
  presetInfo: {
    flex: 1,
    marginRight: 10,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  presetDescription: {
    fontSize: 13,
    color: '#666',
  },
  presetError: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 4,
  },
  subscribedBadge: {
    alignItems: 'flex-end',
  },
  subscribedText: {
    color: '#28a745',
    fontSize: 14,
    fontWeight: '600',
  },
  subscribedCount: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  syncingText: {
    color: '#ffa500',
    fontSize: 14,
    fontWeight: '600',
  },
  subscribeSmallButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  subscribeSmallButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  subscriptionItem: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  subscriptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  statusSuccess: {
    backgroundColor: '#28a745',
  },
  statusError: {
    backgroundColor: '#dc3545',
  },
  statusPending: {
    backgroundColor: '#6c757d',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subscriptionStatus: {
    fontSize: 13,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 4,
  },
  subscriptionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  syncButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    flex: 1,
    backgroundColor: '#ff4444',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  syncAllButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  syncAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#e8eef5',
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  addButton: {
    backgroundColor: '#4A90E2',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  addButtonText: {
    color: '#fff',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  buttonTextDisabled: {
    color: '#999',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 600,
  },
  themeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeButtonText: {
    fontSize: 24,
  },
  themeModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    marginTop: 100,
    maxHeight: '80%',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
    justifyContent: 'center',
  },
  themeCard: {
    width: 100,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  themeCardActive: {
    borderColor: '#667eea',
    backgroundColor: '#f0f4ff',
  },
  themePreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  themeCheckmark: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  themeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
  },
  quickJumpModal: {
    borderRadius: 20,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  yearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  yearText: {
    fontSize: 20,
    fontWeight: '700',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  monthButton: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  monthButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
