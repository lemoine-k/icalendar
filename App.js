import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Platform, Alert, Animated, LayoutAnimation, PanResponder, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Bell, List, Palette, Calendar, ChevronLeft, ChevronRight, Link, Trash2, Check, X, Plus, Minus, Save } from 'lucide-react-native';
import { THEMES, getTheme, getThemeList } from './utils/themes';
import { 
  createVEvent, 
  updateVEvent,
  formatICalDate, 
  formatICalDateTimeFromString,
  parseICalDateTime,
  parseICalDateTimeToDate,
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
import {
  requestNotificationPermissions,
  scheduleEventNotifications,
  cancelEventNotifications,
  initializeNotifications,
} from './utils/notifications';
import { CITIES, getCityByCode } from './utils/cities';

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
  
  // 缓存ALARM_TRIGGER的值，避免每次渲染都调用Object.values
  const alarmTriggerValues = useMemo(() => Object.values(ALARM_TRIGGER), []);
  
  // 事件基本信息
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventPriority, setEventPriority] = useState(PRIORITY.MEDIUM);
  
  // 时间相关
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerType, setTimePickerType] = useState('start');
  const [datePickerType, setDatePickerType] = useState('start');
  
  // 时间选择器滚动引用
  const hourScrollRef = useRef(null);
  const minuteScrollRef = useRef(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  
  // 日期选择器滚动引用
  const yearScrollRef = useRef(null);
  const monthScrollRef = useRef(null);
  const dayScrollRef = useRef(null);
  
  // 处理小时滚动结束
  const handleHourScrollEnd = useCallback((event) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    isScrollingRef.current = true;
    
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / 44);
    const hour = String(index).padStart(2, '0');
    const currentMins = timePickerType === 'start'
      ? startTime.split(':')[1]
      : endTime.split(':')[1];
    const newTime = `${hour}:${currentMins}`;
    
    scrollTimeoutRef.current = setTimeout(() => {
      if (timePickerType === 'start') {
        setStartTime(newTime);
        // 如果新的开始时间 >= 结束时间，自动调整结束时间
        if (newTime >= endTime) {
          let newEndTime;
          if (parseInt(hour) === 23) {
            newEndTime = `23:59`;
          } else {
            newEndTime = `${String(parseInt(hour) + 1).padStart(2, '0')}:00`;
          }
          setEndTime(newEndTime);
        }
      } else {
        setEndTime(newTime);
        // 如果新的结束时间 <= 开始时间，自动调整开始时间
        if (newTime <= startTime) {
          let newStartTime;
          if (parseInt(hour) === 0) {
            newStartTime = `00:00`;
          } else {
            newStartTime = `${String(parseInt(hour) - 1).padStart(2, '0')}:00`;
          }
          setStartTime(newStartTime);
        }
      }
      
      isScrollingRef.current = false;
    }, 100);
  }, [timePickerType, startTime, endTime]);
  
  // 处理分钟滚动结束
  const handleMinuteScrollEnd = useCallback((event) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    isScrollingRef.current = true;
    
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / 44);
    const minute = String(index).padStart(2, '0');
    const currentHour = timePickerType === 'start'
      ? startTime.split(':')[0]
      : endTime.split(':')[0];
    const newTime = `${currentHour}:${minute}`;
    
    scrollTimeoutRef.current = setTimeout(() => {
      if (timePickerType === 'start') {
        setStartTime(newTime);
        // 如果新的开始时间 >= 结束时间，自动调整结束时间
        if (newTime >= endTime) {
          let newEndTime;
          if (parseInt(currentHour) === 23 && parseInt(minute) === 59) {
            newEndTime = `23:59`;
          } else if (parseInt(currentHour) === 23) {
            newEndTime = `23:59`;
          } else {
            const endHour = parseInt(currentHour) + 1;
            newEndTime = `${String(endHour).padStart(2, '0')}:00`;
          }
          setEndTime(newEndTime);
        }
      } else {
        setEndTime(newTime);
        // 如果新的结束时间 <= 开始时间，自动调整开始时间
        if (newTime <= startTime) {
          let newStartTime;
          if (parseInt(currentHour) === 0 && parseInt(minute) === 0) {
            newStartTime = `00:00`;
          } else if (parseInt(currentHour) === 0) {
            newStartTime = `00:00`;
          } else {
            const startHour = parseInt(currentHour) - 1;
            newStartTime = `${String(startHour).padStart(2, '0')}:00`;
          }
          setStartTime(newStartTime);
        }
      }
      
      isScrollingRef.current = false;
    }, 100);
  }, [timePickerType, startTime, endTime]);
  
  // 滚动到指定小时
  const scrollToHour = useCallback((hour) => {
    if (hourScrollRef.current && hourScrollRef.current.scrollTo) {
      const index = parseInt(hour);
      if (hourScrollRef.current && hourScrollRef.current.scrollTo) {
        hourScrollRef.current.scrollTo({ y: index * 44, animated: false });
      }
    }
  }, []);
  
  // 滚动到指定分钟
  const scrollToMinute = useCallback((minute) => {
    if (minuteScrollRef.current && minuteScrollRef.current.scrollTo) {
      const index = parseInt(minute);
      if (minuteScrollRef.current && minuteScrollRef.current.scrollTo) {
        minuteScrollRef.current.scrollTo({ y: index * 44, animated: false });
      }
    }
  }, []);
  
  // 处理年份滚动结束
  const handleYearScrollEnd = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / 44);
    const year = 2020 + index;
    const currentDate = datePickerType === 'start' ? startDate : endDate;
    const currentMonth = parseInt(currentDate.split('-')[1]);
    const currentDay = parseInt(currentDate.split('-')[2]);
    
    let newDate = `${year}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
    
    if (datePickerType === 'start') {
      if (newDate > endDate) {
        newDate = endDate;
      }
      setStartDate(newDate);
    } else {
      if (newDate < startDate) {
        newDate = startDate;
      }
      setEndDate(newDate);
    }
  }, [datePickerType, startDate, endDate]);
  
  // 处理月份滚动结束
  const handleMonthScrollEnd = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / 44);
    const month = index + 1;
    const currentDate = datePickerType === 'start' ? startDate : endDate;
    const currentYear = parseInt(currentDate.split('-')[0]);
    const currentDay = parseInt(currentDate.split('-')[2]);
    
    let newDate = `${currentYear}-${String(month).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
    
    if (datePickerType === 'start') {
      if (newDate > endDate) {
        newDate = endDate;
      }
      setStartDate(newDate);
    } else {
      if (newDate < startDate) {
        newDate = startDate;
      }
      setEndDate(newDate);
    }
  }, [datePickerType, startDate, endDate]);
  
  // 处理日期滚动结束
  const handleDayScrollEnd = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / 44);
    const day = index + 1;
    const currentDate = datePickerType === 'start' ? startDate : endDate;
    const currentYear = parseInt(currentDate.split('-')[0]);
    const currentMonth = parseInt(currentDate.split('-')[1]);
    
    let newDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (datePickerType === 'start') {
      if (newDate > endDate) {
        newDate = endDate;
      }
      setStartDate(newDate);
    } else {
      if (newDate < startDate) {
        newDate = startDate;
      }
      setEndDate(newDate);
    }
  }, [datePickerType, startDate, endDate]);
  
  // 滚动到指定年份
  const scrollToYear = useCallback((year) => {
    if (yearScrollRef.current && yearScrollRef.current.scrollTo) {
      const index = year - 2020;
      if (yearScrollRef.current && yearScrollRef.current.scrollTo) {
        yearScrollRef.current.scrollTo({ y: index * 44, animated: false });
      }
    }
  }, []);
  
  // 滚动到指定月份
  const scrollToMonth = useCallback((month) => {
    if (monthScrollRef.current && monthScrollRef.current.scrollTo) {
      const index = month - 1;
      if (monthScrollRef.current && monthScrollRef.current.scrollTo) {
        monthScrollRef.current.scrollTo({ y: index * 44, animated: false });
      }
    }
  }, []);
  
  // 滚动到指定日期
  const scrollToDay = useCallback((day) => {
    if (dayScrollRef.current && dayScrollRef.current.scrollTo) {
      const index = day - 1;
      if (dayScrollRef.current && dayScrollRef.current.scrollTo) {
        dayScrollRef.current.scrollTo({ y: index * 44, animated: false });
      }
    }
  }, []);
  
  // 当时间选择器打开时，滚动到当前时间
  useEffect(() => {
    let timeoutId;
    if (timePickerVisible) {
      const currentHour = timePickerType === 'start' 
        ? startTime.split(':')[0] 
        : endTime.split(':')[0];
      const currentMinute = timePickerType === 'start'
        ? startTime.split(':')[1]
        : endTime.split(':')[1];
      
      const delay = Platform.OS === 'android' ? 100 : 50;
      
      timeoutId = setTimeout(() => {
        scrollToHour(currentHour);
        scrollToMinute(currentMinute);
      }, delay);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [timePickerVisible, timePickerType, startTime, endTime, scrollToHour, scrollToMinute]);
  
  useEffect(() => {
    let timeoutId;
    if (datePickerVisible) {
      const currentDate = datePickerType === 'start' ? startDate : endDate;
      const currentYear = parseInt(currentDate.split('-')[0]);
      const currentMonth = parseInt(currentDate.split('-')[1]);
      const currentDay = parseInt(currentDate.split('-')[2]);
      
      const delay = Platform.OS === 'android' ? 100 : 50;
      
      timeoutId = setTimeout(() => {
        scrollToYear(currentYear);
        scrollToMonth(currentMonth);
        scrollToDay(currentDay);
      }, delay);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [datePickerVisible, datePickerType, startDate, endDate, scrollToYear, scrollToMonth, scrollToDay]);
  
  // 重复规则
  const [hasRepeat, setHasRepeat] = useState(false);
  const [repeatFreq, setRepeatFreq] = useState(FREQ.DAILY);
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatCount, setRepeatCount] = useState(10);
  const [repeatWeekdays, setRepeatWeekdays] = useState([]);
  
  // 提醒设置
  const [hasAlarm, setHasAlarm] = useState(false);
  const [alarmTriggers, setAlarmTriggers] = useState([ALARM_TRIGGER.MINUTES_15]);
  const [alarmActions, setAlarmActions] = useState([ALARM_ACTION.DISPLAY, ALARM_ACTION.AUDIO]);
  const [customReminderVisible, setCustomReminderVisible] = useState(false);
  const [customReminderMinutes, setCustomReminderMinutes] = useState(30);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewType, setViewType] = useState(VIEW_TYPES.MONTH);
  
  // 订阅管理
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscribedEvents, setSubscribedEvents] = useState([]);
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

  // 城市选择
  const [selectedCity, setSelectedCity] = useState('101010100');
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');

  useEffect(() => {
    initializeNotifications();
  }, []);

  const onDayPress = useCallback((dateString, time = null) => {
    setSelectedDate(dateString);
    setStartDate(dateString);
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
  }, []);

  useEffect(() => {
    if (selectedDate && viewType !== VIEW_TYPES.MONTH) {
      const date = new Date(selectedDate);
      setCurrentMonth(date);
    }
  }, [selectedDate, viewType]);

  const resetForm = () => {
    setEventTitle('');
    setEventDescription('');
    setEventLocation('');
    setEventPriority(PRIORITY.MEDIUM);
    setIsAllDay(false);
    setStartTime('09:00');
    setEndTime('10:00');
    setStartDate('');
    setEndDate('');
    setHasRepeat(false);
    setRepeatFreq(FREQ.DAILY);
    setRepeatInterval(1);
    setRepeatCount(10);
    setRepeatWeekdays([]);
    setHasAlarm(false);
    setAlarmTriggers([ALARM_TRIGGER.MINUTES_15]);
    setAlarmActions([ALARM_ACTION.DISPLAY, ALARM_ACTION.AUDIO]);
    setCustomReminderVisible(false);
    setCustomReminderMinutes(30);
  };

  const generateCustomTrigger = (minutes) => {
    if (minutes === 0) return 'PT0M';
    
    let result = '-PT';
    
    if (minutes >= 10080) {
      const weeks = Math.floor(minutes / 10080);
      result += `${weeks}W`;
    } else if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      result += `${days}D`;
    } else if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      result += `${hours}H`;
      if (mins > 0) result += `${mins}M`;
    } else {
      result += `${minutes}M`;
    }
    
    return result;
  };

  const adjustTime = (type, minutes) => {
    const timeStr = type === 'start' ? startTime : endTime;
    const [hours, mins] = timeStr.split(':').map(Number);
    
    const date = new Date();
    date.setHours(hours, mins + minutes);
    
    const newHours = String(date.getHours()).padStart(2, '0');
    const newMins = String(date.getMinutes()).padStart(2, '0');
    const newTime = `${newHours}:${newMins}`;
    
    if (type === 'start') {
      setStartTime(newTime);
    } else {
      setEndTime(newTime);
    }
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

  const addEvent = async () => {
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
        action: alarmActions[0],
        trigger: trigger,
        description: eventTitle,
      })
    ) : [];
    
    // 构建开始和结束时间
    const dtstart = isAllDay 
      ? formatICalDate(startDate || selectedDate)
      : formatICalDateTimeFromString(startDate || selectedDate, startTime);
    
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
      
      // 取消旧通知并调度新通知
      await cancelEventNotifications(editingEvent.uid);
      if (hasAlarm) {
        console.log('🔔 开始调度通知（编辑模式）...');
        console.log('🔔 alarmTriggers:', alarmTriggers);
        console.log('🔔 alarmActions:', alarmActions);
        const reminderMinutes = alarmTriggers.map(trigger => Math.abs(parseTriggerToMinutes(trigger)));
        console.log('🔔 reminderMinutes:', reminderMinutes);
        console.log('🔔 dtstart:', dtstart);
        console.log('🔔 eventDate:', parseICalDateTimeToDate(dtstart));
        await scheduleEventNotifications({
          id: editingEvent.uid,
          title: eventTitle,
          startDate: parseICalDateTimeToDate(dtstart),
          reminders: reminderMinutes,
        }, alarmActions);
      } else {
        console.log('🔔 事件未设置提醒，跳过通知调度（编辑模式）');
      }
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
      
      // 调度通知
      if (hasAlarm) {
        console.log('🔔 开始调度通知...');
        console.log('🔔 alarmTriggers:', alarmTriggers);
        console.log('🔔 alarmActions:', alarmActions);
        const reminderMinutes = alarmTriggers.map(trigger => Math.abs(parseTriggerToMinutes(trigger)));
        console.log('🔔 reminderMinutes:', reminderMinutes);
        console.log('🔔 dtstart:', dtstart);
        console.log('🔔 eventDate:', parseICalDateTimeToDate(dtstart));
        await scheduleEventNotifications({
          id: vevent.uid,
          title: eventTitle,
          startDate: parseICalDateTimeToDate(dtstart),
          reminders: reminderMinutes,
        }, alarmActions);
      } else {
        console.log('🔔 事件未设置提醒，跳过通知调度');
      }
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
    setStartDate(startDate);
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
      const actions = [...new Set(event.alarms.map(alarm => alarm.action))];
      setAlarmActions(actions.length > 0 ? actions : [ALARM_ACTION.DISPLAY, ALARM_ACTION.AUDIO]);
    } else {
      setHasAlarm(false);
    }
    
    setModalVisible(true);
  };

  const deleteEvent = async (uid) => {
    await cancelEventNotifications(uid);
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
  const syncSubscriptionNow = async (subscription, isInitialSync = false, locationCode = null) => {
    if (!subscription.enabled) {
      console.log('订阅已禁用，跳过同步');
      return { success: false, error: '订阅已禁用' };
    }
    
    console.log('开始同步订阅:', subscription.name);
    setSyncing(true);
    
    try {
      const cityCode = locationCode || selectedCity;
      const result = await syncSubscription(subscription, parseICalendar, cityCode);
      
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
        setSubscribedEvents(prevEvents => {
          const filteredEvents = prevEvents.filter(e => e.subscriptionId !== subscription.id);
          // 添加新的订阅事件
          return [...filteredEvents, ...result.events];
        });
        
        if (Platform.OS === 'web') {
          alert(`同步成功！\n\n订阅: ${subscription.name}\n事件数: ${result.eventCount}`);
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
    setSubscribedEvents(subscribedEvents.filter(e => e.subscriptionId !== subscriptionId));
  };

  // 切换订阅启用状态
  const toggleSubscription = (subscriptionId) => {
    setSubscriptions(subscriptions.map(sub => {
      if (sub.id === subscriptionId) {
        const enabled = !sub.enabled;
        
        // 如果禁用，移除该订阅的事件
        if (!enabled) {
          setSubscribedEvents(subscribedEvents.filter(e => e.subscriptionId !== subscriptionId));
        }
        
        return { ...sub, enabled };
      }
      return sub;
    }));
  };

  // 获取指定日期的事件
  const getEventsForDate = useCallback((dateString) => {
    const icalDate = formatICalDate(dateString);
    return events.filter(event => {
      const eventDatePart = event.dtstart.substring(0, 8);
      return eventDatePart === icalDate;
    });
  }, [events]);

  const getPersonalEventsForDate = useCallback((dateString) => {
    const icalDate = formatICalDate(dateString);
    return events.filter(event => {
      const eventDatePart = event.dtstart.substring(0, 8);
      return eventDatePart === icalDate && !event.isSubscribed;
    });
  }, [events]);

  const getSubscribedEventsForDate = useCallback((dateString) => {
    const icalDate = formatICalDate(dateString);
    return subscribedEvents.filter(event => {
      const eventDatePart = event.dtstart.substring(0, 8);
      return eventDatePart === icalDate;
    });
  }, [subscribedEvents]);

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
  const getEventStats = useCallback(() => {
    const total = events.length;
    const subscribed = events.filter(e => e.isSubscribed).length;
    const personal = total - subscribed;
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayEvents = getEventsForDate(todayString).length;
    
    return { total, subscribed, personal, todayEvents };
  }, [events, subscribedEvents, getEventsForDate]);

  const personalEvents = useMemo(() => {
    return events.sort((a, b) => b.dtstart.localeCompare(a.dtstart));
  }, [events]);

  const changeMonth = useCallback((delta) => {
    setCurrentMonth(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + delta);
      return newDate;
    });
  }, []);

  const changeWeek = useCallback((delta) => {
    setSelectedDate(prevDate => {
      const currentDate = prevDate ? new Date(prevDate) : new Date();
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + (delta * 7));
      return `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
    });
  }, []);

  const changeDay = useCallback((delta) => {
    setSelectedDate(prevDate => {
      const currentDate = prevDate ? new Date(prevDate) : new Date();
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + delta);
      return `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
    });
  }, []);

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
    
    LayoutAnimation.configureNext({
      duration: 100,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut', property: 'opacity' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
    
    setViewType(newViewType);
  };

  // 手势处理 - 左划右划翻页
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
        },
        onPanResponderRelease: (_, gestureState) => {
          const screenWidth = Dimensions.get('window').width;
          const threshold = screenWidth * 0.2;
          
          if (gestureState.dx > threshold) {
            // 右划 - 上一页
            if (viewType === VIEW_TYPES.MONTH) {
              changeMonth(-1);
            } else if (viewType === VIEW_TYPES.WEEK) {
              changeWeek(-1);
            } else if (viewType === VIEW_TYPES.DAY) {
              changeDay(-1);
            }
          } else if (gestureState.dx < -threshold) {
            // 左划 - 下一页
            if (viewType === VIEW_TYPES.MONTH) {
              changeMonth(1);
            } else if (viewType === VIEW_TYPES.WEEK) {
              changeWeek(1);
            } else if (viewType === VIEW_TYPES.DAY) {
              changeDay(1);
            }
          }
        },
      }),
    [viewType]
  );

  // 处理事件点击
  const handleEventPress = useCallback((event) => {
    const { date, time } = parseICalDateTime(event.dtstart);
    const repeatDesc = getRRuleDescription(event.rrule);
    
    if (event.isSubscribed) {
      const message = `日期: ${date} ${time || '全天'}\n描述: ${event.description || '无描述'}\n地点: ${event.location || '无地点'}\n重复: ${repeatDesc}\n状态: ${event.status}\n\n来源: ${event.subscriptionName || '订阅日历'}\n此事件为只读，无法编辑`;
      
      if (Platform.OS === 'web') {
        alert(`${event.summary}\n\n${message}`);
      } else {
        Alert.alert(event.summary, message, [{ text: '确定' }]);
      }
      return;
    }
    
    const message = `日期: ${date} ${time || '全天'}\n描述: ${event.description || '无描述'}\n地点: ${event.location || '无地点'}\n重复: ${repeatDesc}\n状态: ${event.status}\n优先级: ${event.priority}`;
    
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
  }, [editEvent, deleteEvent]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="auto" />
      
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => setCityModalVisible(true)}>
            <View style={styles.citySelector}>
              <Text style={styles.headerTitle}>{getCityByCode(selectedCity)?.name || '北京'}</Text>
              <ChevronRight size={16} color="#fff" />
            </View>
          </TouchableOpacity>
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
              onPress={() => setSubscriptionModalVisible(true)}
            >
              <Link size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
              onPress={() => setThemeModalVisible(true)}
            >
              <Palette size={24} color="#fff" />
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
            <ChevronLeft size={24} color={theme.primary} />
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
            <ChevronRight size={24} color={theme.primary} />
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
            <ChevronLeft size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: theme.text }]}>
            {getWeekRange()}
          </Text>
          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: theme.background }]} 
            onPress={() => changeWeek(1)}
          >
            <ChevronRight size={24} color={theme.primary} />
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
            <ChevronLeft size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: theme.text }]}>
            {selectedDate || `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(currentMonth.getDate()).padStart(2, '0')}`}
          </Text>
          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: theme.background }]} 
            onPress={() => changeDay(1)}
          >
            <ChevronRight size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* 主内容区域 */}
      <View style={styles.mainContent}>
        <View style={styles.viewContainer} {...panResponder.panHandlers}>
          <MonthView
            currentMonth={currentMonth}
            events={events}
            subscribedEvents={subscribedEvents}
            onDayPress={onDayPress}
            selectedDate={selectedDate}
            getEventsForDate={getEventsForDate}
            selectedCity={selectedCity}
            theme={theme}
            style={viewType === VIEW_TYPES.MONTH ? styles.visibleView : styles.hiddenView}
          />
          <WeekView
            currentMonth={currentMonth}
            events={events}
            subscribedEvents={subscribedEvents}
            onEventPress={handleEventPress}
            selectedDate={selectedDate}
            selectedCity={selectedCity}
            theme={theme}
            style={viewType === VIEW_TYPES.WEEK ? styles.visibleView : styles.hiddenView}
          />
          <DayView
            selectedDate={selectedDate || `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(currentMonth.getDate()).padStart(2, '0')}`}
            events={events}
            subscribedEvents={subscribedEvents}
            onEventPress={handleEventPress}
            theme={theme}
            style={viewType === VIEW_TYPES.DAY ? styles.visibleView : styles.hiddenView}
          />
        </View>

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
        </View>
        
        {personalEvents.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
            <Calendar size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>暂无事件</Text>
            <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
              点击日历上的日期添加事件
            </Text>
          </View>
        ) : (
          personalEvents.map(event => (
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
                    {(() => {
                      const { date, time } = parseICalDateTime(event.dtstart);
                      return `${date} ${time ? time : '全天'}`;
                    })()}
                  </Text>
                  {event.rrule ? (
                    <Text style={[styles.eventRepeat, { color: theme.primary }]}>
                      {getRRuleDescription(event.rrule)}
                    </Text>
                  ) : null}
                  {event.alarms && event.alarms.length > 0 ? (
                    <Text style={[styles.eventAlarm, { color: theme.warning }]}>
                      {event.alarms.map(alarm => getAlarmDescription(alarm.trigger)).join(', ')}
                    </Text>
                  ) : null}
                  {event.description ? (
                    <Text style={[styles.eventDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                      {event.description}
                    </Text>
                  ) : null}
                  {event.location ? (
                    <Text style={[styles.eventLocation, { color: theme.textSecondary }]}>
                      {event.location}
                    </Text>
                  ) : null}
                  <View style={styles.eventMeta}>
                    <Text style={[styles.eventStatus, { color: theme.success }]}>
                      {event.status}
                    </Text>
                    <Text style={[styles.eventPriority, { color: theme.textSecondary }]}>
                      P{event.priority}
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
                  <Trash2 size={20} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
        )}
        
        {subscribedEvents.length > 0 && (
          <View style={styles.subscriptionSummary}>
            <Text style={styles.subscriptionSummaryTitle}>
              订阅事件统计
            </Text>
            <Text style={styles.subscriptionSummaryText}>
              共有 {subscribedEvents.length} 个订阅事件在日历中显示
            </Text>
            <Text style={styles.subscriptionSummaryHint}>
              订阅事件在日历视图中查看，不可编辑
            </Text>
          </View>
        )}
        </ScrollView>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.iosModalOverlay}
          activeOpacity={1}
          onPress={() => {
            setModalVisible(false);
            resetForm();
            setEditingEvent(null);
          }}
        >
          <View style={styles.iosModalContainer}>
            <View style={styles.iosModalHeader}>
              <Text style={styles.iosModalTitle}>
                {editingEvent ? '编辑事件' : '新事件'}
              </Text>
              <TouchableOpacity
                style={[styles.iosModalSaveButton, !isFormValid() && styles.iosModalSaveButtonDisabled]}
                onPress={addEvent}
                disabled={!isFormValid()}
              >
                <Text style={styles.iosModalSaveText}>完成</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.iosModalScrollView}
              contentContainerStyle={styles.iosModalScrollViewContent}
              nestedScrollEnabled={true}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.iosModalContent}>
                <View style={styles.iosInputGroup}>
                  <Text style={styles.iosInputTitle}>标题</Text>
                  <TextInput
                    style={styles.iosInput}
                    placeholder="事件标题"
                    placeholderTextColor="#999"
                    value={eventTitle}
                    onChangeText={setEventTitle}
                  />
                </View>
                
                <View style={styles.iosInputGroup}>
                  <Text style={styles.iosInputTitle}>位置</Text>
                  <TextInput
                    style={styles.iosInput}
                    placeholder="添加位置"
                    placeholderTextColor="#999"
                    value={eventLocation}
                    onChangeText={setEventLocation}
                  />
                </View>
                
                <View style={styles.iosInputGroup}>
                  <Text style={styles.iosInputTitle}>备注</Text>
                  <TextInput
                    style={[styles.iosInput, styles.iosTextArea]}
                    placeholder="添加备注"
                    placeholderTextColor="#999"
                    value={eventDescription}
                    onChangeText={setEventDescription}
                    multiline
                    numberOfLines={3}
                  />
                </View>
                
                <View style={styles.iosCard}>
                  <View style={styles.iosCardRow}>
                    <Text style={styles.iosCardLabel}>全天</Text>
                    <TouchableOpacity
                      style={[styles.iosSwitch, isAllDay && styles.iosSwitchActive]}
                      onPress={() => setIsAllDay(!isAllDay)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.iosSwitchThumb, isAllDay && styles.iosSwitchThumbActive]} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.iosCardDivider} />
                  
                  <TouchableOpacity
                    style={styles.iosCardRow}
                    onPress={() => {
                      setDatePickerType('start');
                      setDatePickerVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.iosCardLabel}>开始</Text>
                    <View style={styles.iosTimePickerContainer}>
                      <Text style={styles.iosCardValue}>{startDate || selectedDate}</Text>
                      <ChevronRight size={20} color={theme.textSecondary} />
                    </View>
                  </TouchableOpacity>
                  
                  {!isAllDay && (
                    <>
                      <View style={styles.iosCardDivider} />
                      <TouchableOpacity
                        style={styles.iosCardRow}
                        onPress={() => {
                          setTimePickerType('start');
                          setTimePickerVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.iosCardLabel}>开始时间</Text>
                        <View style={styles.iosTimePickerContainer}>
                          <Text style={styles.iosCardValue}>{startTime}</Text>
                          <ChevronRight size={20} color={theme.textSecondary} />
                        </View>
                      </TouchableOpacity>
                    </>
                  )}
                  
                  <View style={styles.iosCardDivider} />
                  
                  <TouchableOpacity
                    style={styles.iosCardRow}
                    onPress={() => {
                      setDatePickerType('end');
                      setDatePickerVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.iosCardLabel}>结束</Text>
                    <View style={styles.iosTimePickerContainer}>
                      <Text style={styles.iosCardValue}>{endDate || selectedDate}</Text>
                      <ChevronRight size={20} color={theme.textSecondary} />
                    </View>
                  </TouchableOpacity>
                  
                  {!isAllDay && (
                    <>
                      <View style={styles.iosCardDivider} />
                      <TouchableOpacity
                        style={styles.iosCardRow}
                        onPress={() => {
                          setTimePickerType('end');
                          setTimePickerVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.iosCardLabel}>结束时间</Text>
                        <View style={styles.iosTimePickerContainer}>
                          <Text style={styles.iosCardValue}>{endTime}</Text>
                          <ChevronRight size={20} color={theme.textSecondary} />
                        </View>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                
                <View style={styles.iosCard}>
                  <View style={styles.iosCardRow}>
                    <View style={styles.iosCardLabelContainer}>
                      <Text style={styles.iosCardLabel}>重复</Text>
                      <Text style={styles.iosCardSublabel}>
                        {hasRepeat ? getRRuleDescription(buildRRule({ freq: repeatFreq, count: repeatCount })) : '从不'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.iosSwitch, hasRepeat && styles.iosSwitchActive]}
                      onPress={() => setHasRepeat(!hasRepeat)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.iosSwitchThumb, hasRepeat && styles.iosSwitchThumbActive]} />
                    </TouchableOpacity>
                  </View>
                  
                  {hasRepeat && (
                    <>
                      <View style={styles.iosCardDivider} />
                      <View style={styles.iosRepeatOptions}>
                        {[
                          { label: '每天', value: FREQ.DAILY },
                          { label: '每周', value: FREQ.WEEKLY },
                          { label: '每月', value: FREQ.MONTHLY },
                          { label: '每年', value: FREQ.YEARLY },
                        ].map(({ label, value }) => (
                          <TouchableOpacity
                            key={value}
                            style={[
                              styles.iosRepeatOption,
                              repeatFreq === value && styles.iosRepeatOptionActive
                            ]}
                            onPress={() => setRepeatFreq(value)}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.iosRepeatOptionText,
                              repeatFreq === value && styles.iosRepeatOptionTextActive
                            ]}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      
                      <View style={styles.iosCardDivider} />
                      
                      <View style={styles.iosCardRow}>
                        <Text style={styles.iosCardLabel}>重复次数</Text>
                        <TextInput
                          style={styles.iosNumberInput}
                          value={String(repeatCount)}
                          onChangeText={(text) => setRepeatCount(parseInt(text) || 1)}
                          keyboardType="numeric"
                        />
                      </View>
                    </>
                  )}
                </View>
                
                <View style={styles.iosCard}>
                  <View style={styles.iosCardRow}>
                    <View style={styles.iosCardLabelContainer}>
                      <Text style={styles.iosCardLabel}>提醒</Text>
                      <Text style={styles.iosCardSublabel}>
                        {hasAlarm ? `已设置 ${alarmTriggers.length} 个提醒` : '无'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.iosSwitch, hasAlarm && styles.iosSwitchActive]}
                      onPress={() => {
                        console.log('🔔 提醒开关点击，当前状态:', hasAlarm, '切换到:', !hasAlarm);
                        setHasAlarm(!hasAlarm);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.iosSwitchThumb, hasAlarm && styles.iosSwitchThumbActive]} />
                    </TouchableOpacity>
                  </View>
                  
                  {hasAlarm && (
                    <>
                      <View style={styles.iosCardDivider} />
                      <View style={styles.iosAlarmOptions}>
                        {[
                          { label: '准时', value: ALARM_TRIGGER.AT_TIME },
                          { label: '5分钟前', value: ALARM_TRIGGER.MINUTES_5 },
                          { label: '15分钟前', value: ALARM_TRIGGER.MINUTES_15 },
                          { label: '30分钟前', value: ALARM_TRIGGER.MINUTES_30 },
                          { label: '1小时前', value: ALARM_TRIGGER.HOURS_1 },
                          { label: '自定义', value: 'CUSTOM' },
                        ].map(({ label, value }) => {
                          const isCustomSelected = value === 'CUSTOM' && alarmTriggers.some(t => t.startsWith('-PT') && !alarmTriggerValues.includes(t));
                          const isSelected = alarmTriggers.includes(value) || isCustomSelected;
                          
                          return (
                            <TouchableOpacity
                              key={value}
                              style={[
                                styles.iosAlarmOption,
                                isSelected && styles.iosAlarmOptionActive
                              ]}
                              onPress={() => {
                                console.log('🔔 提醒选项点击:', label, value, '当前alarmTriggers:', alarmTriggers);
                                if (value === 'CUSTOM') {
                                  setCustomReminderVisible(true);
                                } else {
                                  if (alarmTriggers.includes(value)) {
                                    console.log('🔔 移除提醒:', value);
                                    setAlarmTriggers(alarmTriggers.filter(t => t !== value));
                                  } else {
                                    console.log('🔔 添加提醒:', value);
                                    setAlarmTriggers([...alarmTriggers, value]);
                                  }
                                }
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.iosAlarmOptionText,
                                isSelected && styles.iosAlarmOptionTextActive
                              ]}>
                                {label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      
                      <View style={styles.iosCardDivider} />
                      
                      <View style={styles.iosAlarmActions}>
                        {[
                          { label: '通知', value: ALARM_ACTION.DISPLAY, icon: Bell },
                          { label: '声音', value: ALARM_ACTION.AUDIO, icon: Bell },
                        ].map(({ label, value, icon: Icon }) => (
                          <TouchableOpacity
                            key={value}
                            style={[
                              styles.iosAlarmAction,
                              alarmActions.includes(value) && styles.iosAlarmActionActive
                            ]}
                            onPress={() => {
                              if (alarmActions.includes(value)) {
                                setAlarmActions(alarmActions.filter(a => a !== value));
                              } else {
                                setAlarmActions([...alarmActions, value]);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <Icon size={20} color={alarmActions.includes(value) ? '#fff' : theme.textSecondary} />
                            <Text style={[
                              styles.iosAlarmActionText,
                              alarmActions.includes(value) && styles.iosAlarmActionTextActive
                            ]}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </View>
                
                <View style={styles.iosCard}>
                  <View style={styles.iosCardRow}>
                    <Text style={styles.iosCardLabel}>优先级</Text>
                  </View>
                  <View style={styles.iosPriorityOptions}>
                    {[
                      { label: '最高', value: PRIORITY.HIGHEST },
                      { label: '高', value: PRIORITY.HIGH },
                      { label: '中', value: PRIORITY.MEDIUM },
                      { label: '低', value: PRIORITY.LOW },
                    ].map(({ label, value }) => (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.iosPriorityOption,
                          eventPriority === value && styles.iosPriorityOptionActive
                        ]}
                        onPress={() => setEventPriority(value)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.iosPriorityOptionText,
                          eventPriority === value && styles.iosPriorityOptionTextActive
                        ]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* 订阅管理模态框 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={subscriptionModalVisible}
        onRequestClose={() => {
          if (!syncing) {
            setSubscriptionModalVisible(false);
          }
        }}
      >
        <TouchableOpacity 
          style={styles.iosModalOverlay}
          activeOpacity={1}
          onPress={() => {
            if (!syncing) {
              setSubscriptionModalVisible(false);
            }
          }}
        >
          <View style={styles.iosModalContainer}>
            <View style={styles.iosModalHeader}>
              <Text style={styles.iosModalTitle}>日历订阅管理</Text>
              <View style={{ width: 80 }} />
            </View>
            
            <ScrollView 
              style={styles.iosModalScrollView}
              contentContainerStyle={styles.iosModalScrollViewContent}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.iosModalContent}>
                <Text style={styles.iosInputTitle}>预设订阅源</Text>
                <View style={styles.iosCard}>
                  {Object.values(PRESET_CALENDARS).map((preset) => {
                    const subscription = subscriptions.find(sub => sub.id === preset.id);
                    const isSubscribed = subscription && subscription.lastSyncStatus === 'success';
                    const isSyncing = subscription && subscription.lastSyncStatus === 'pending';
                    
                    return (
                      <View key={preset.id}>
                        <View style={styles.iosCardRow}>
                          <View style={styles.iosCardLabelContainer}>
                            <Text style={styles.iosCardLabel}>{preset.name}</Text>
                            <Text style={styles.iosCardSublabel}>{preset.description}</Text>
                            {subscription && subscription.lastSyncStatus === 'error' && (
                              <Text style={[styles.iosCardSublabel, { color: '#ff3b30' }]}>
                                上次同步失败
                              </Text>
                            )}
                          </View>
                          {isSubscribed ? (
                            <View style={styles.subscriptionSubscribedBadge}>
                              <Check size={16} color="#fff" />
                              <Text style={[styles.subscriptionSubscribedText, { marginLeft: 4 }]}>已订阅</Text>
                            </View>
                          ) : isSyncing ? (
                            <Text style={styles.subscriptionSyncingText}>同步中...</Text>
                          ) : (
                            <TouchableOpacity
                              style={styles.subscriptionSubscribeButton}
                              onPress={() => addSubscription(preset)}
                              disabled={syncing}
                            >
                              <Text style={styles.subscriptionSubscribeButtonText}>
                                {syncing ? '请稍候' : '订阅'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        {preset.id !== Object.values(PRESET_CALENDARS)[Object.values(PRESET_CALENDARS).length - 1].id && (
                          <View style={styles.iosCardDivider} />
                        )}
                      </View>
                    );
                  })}
                </View>
                
                {subscriptions.length > 0 && (
                  <>
                    <Text style={styles.iosInputTitle}>我的订阅</Text>
                    {subscriptions.map((sub) => (
                      <View key={sub.id} style={styles.iosCard}>
                        <View style={styles.iosCardRow}>
                          <View style={styles.iosCardLabelContainer}>
                            <Text style={styles.iosCardLabel}>{sub.name}</Text>
                            <Text style={styles.iosCardSublabel}>
                              {getSubscriptionStatus(sub)}
                            </Text>
                            {sub.lastSyncError && (
                              <Text style={[styles.iosCardSublabel, { color: '#ff3b30' }]} numberOfLines={2}>
                                错误: {sub.lastSyncError}
                              </Text>
                            )}
                          </View>
                          <TouchableOpacity
                            style={[styles.iosSwitch, sub.enabled && styles.iosSwitchActive]}
                            onPress={() => toggleSubscription(sub.id)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.iosSwitchThumb, sub.enabled && styles.iosSwitchThumbActive]} />
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.iosCardDivider} />
                        
                        <View style={styles.subscriptionActions}>
                          <TouchableOpacity
                            style={[styles.iosAlarmAction, { flex: 1 }]}
                            onPress={() => syncSubscriptionNow(sub)}
                            disabled={syncing}
                          >
                            <Text style={[styles.iosAlarmActionText, { color: '#007AFF' }]}>
                              {syncing ? '同步中...' : '同步'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.iosAlarmAction, { flex: 1, backgroundColor: '#ff3b30', borderColor: '#ff3b30' }]}
                            onPress={() => removeSubscription(sub.id)}
                          >
                            <Text style={[styles.iosAlarmActionText, { color: '#fff' }]}>删除</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    
                    <TouchableOpacity
                      style={[styles.iosAlarmAction, styles.subscriptionSyncAllButton]}
                      onPress={syncAllSubscriptions}
                      disabled={syncing}
                    >
                      <Text style={[styles.iosAlarmActionText, { color: '#fff' }]}>
                        {syncing ? '同步中...' : '同步所有订阅'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 快速跳转模态框 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={quickJumpVisible}
        onRequestClose={() => setQuickJumpVisible(false)}
      >
        <TouchableOpacity 
          style={styles.iosModalOverlay}
          activeOpacity={1}
          onPress={() => setQuickJumpVisible(false)}
        >
          <View style={styles.iosModalContainer}>
            <View style={styles.iosModalHeader}>
              <Text style={styles.iosModalTitle}>选择月份</Text>
              <View style={{ width: 80 }} />
            </View>
            
            <ScrollView 
              style={styles.iosModalScrollView}
              contentContainerStyle={styles.iosModalScrollViewContent}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.iosModalContent}>
                <View style={styles.iosCard}>
                  <View style={styles.iosCardRow}>
                    <TouchableOpacity
                      style={styles.iosYearButton}
                      onPress={() => {
                        const newDate = new Date(currentMonth);
                        newDate.setFullYear(newDate.getFullYear() - 1);
                        setCurrentMonth(newDate);
                      }}
                    >
                      <ChevronLeft size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={styles.iosYearText}>
                      {currentMonth.getFullYear()}年
                    </Text>
                    <TouchableOpacity
                      style={styles.iosYearButton}
                      onPress={() => {
                        const newDate = new Date(currentMonth);
                        newDate.setFullYear(newDate.getFullYear() + 1);
                        setCurrentMonth(newDate);
                      }}
                    >
                      <ChevronRight size={24} color={theme.text} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.iosCard}>
                  <View style={styles.iosMonthGrid}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
                      const isCurrentMonth = currentMonth.getMonth() + 1 === month;
                      return (
                        <TouchableOpacity
                          key={month}
                          style={[
                            styles.iosMonthButton,
                            isCurrentMonth && styles.iosMonthButtonActive
                          ]}
                          onPress={() => {
                            const newDate = new Date(currentMonth);
                            newDate.setMonth(month - 1);
                            setCurrentMonth(newDate);
                            setQuickJumpVisible(false);
                          }}
                        >
                          <Text style={[
                            styles.iosMonthButtonText,
                            isCurrentMonth && styles.iosMonthButtonTextActive
                          ]}>
                            {month}月
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 自定义提醒时间模态框 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={customReminderVisible}
        onRequestClose={() => setCustomReminderVisible(false)}
      >
        <TouchableOpacity 
          style={styles.iosModalOverlay}
          activeOpacity={1}
          onPress={() => setCustomReminderVisible(false)}
        >
          <View style={styles.iosModalContainer}>
            <View style={styles.iosModalHeader}>
              <Text style={styles.iosModalTitle}>自定义提醒时间</Text>
              <TouchableOpacity
                style={[styles.iosModalSaveButton, customReminderMinutes <= 0 && styles.iosModalSaveButtonDisabled]}
                onPress={() => {
                  if (customReminderMinutes > 0) {
                    const customTrigger = generateCustomTrigger(customReminderMinutes);
                    const existingCustomIndex = alarmTriggers.findIndex(t => 
                      t.startsWith('-PT') && !alarmTriggerValues.includes(t)
                    );
                    
                    if (existingCustomIndex >= 0) {
                      const newTriggers = [...alarmTriggers];
                      newTriggers[existingCustomIndex] = customTrigger;
                      setAlarmTriggers(newTriggers);
                    } else {
                      setAlarmTriggers([...alarmTriggers, customTrigger]);
                    }
                    setCustomReminderVisible(false);
                  }
                }}
                disabled={customReminderMinutes <= 0}
              >
                <Text style={styles.iosModalSaveText}>完成</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.iosModalScrollView}
              contentContainerStyle={styles.iosModalScrollViewContent}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.iosModalContent}>
                <View style={styles.iosCard}>
                  <Text style={styles.iosInputTitle}>提前时间（分钟）</Text>
                  <TextInput
                    style={styles.iosInput}
                    value={String(customReminderMinutes)}
                    onChangeText={(text) => {
                      const minutes = parseInt(text) || 0;
                      setCustomReminderMinutes(minutes);
                    }}
                    keyboardType="number-pad"
                    placeholder="输入分钟数"
                    placeholderTextColor="#999"
                  />
                </View>
                
                <View style={styles.iosCard}>
                  <Text style={styles.iosInputTitle}>快速选择</Text>
                  <View style={styles.customReminderPresets}>
                    {[
                      { label: '5分钟', minutes: 5 },
                      { label: '15分钟', minutes: 15 },
                      { label: '30分钟', minutes: 30 },
                      { label: '1小时', minutes: 60 },
                      { label: '2小时', minutes: 120 },
                      { label: '1天', minutes: 1440 },
                      { label: '2天', minutes: 2880 },
                      { label: '1周', minutes: 10080 },
                    ].map(({ label, minutes }) => (
                      <TouchableOpacity
                        key={label}
                        style={[
                          styles.customReminderPreset,
                          customReminderMinutes === minutes && styles.customReminderPresetActive
                        ]}
                        onPress={() => setCustomReminderMinutes(minutes)}
                      >
                        <Text style={[
                          styles.customReminderPresetText,
                          customReminderMinutes === minutes && styles.customReminderPresetTextActive
                        ]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 城市选择模态框 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cityModalVisible}
        onRequestClose={() => setCityModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.iosModalOverlay}
          activeOpacity={1}
          onPress={() => setCityModalVisible(false)}
        >
          <View style={styles.iosModalContainer}>
            <View style={styles.iosModalHeader}>
              <Text style={styles.iosModalTitle}>选择城市</Text>
              <View style={{ width: 80 }} />
            </View>
            
            <ScrollView 
              style={styles.iosModalScrollView}
              contentContainerStyle={styles.iosModalScrollViewContent}
            >
              <View style={styles.iosModalContent}>
                <View style={styles.iosCard}>
                  <TextInput
                    style={styles.iosInput}
                    value={citySearchQuery}
                    onChangeText={setCitySearchQuery}
                    placeholder="搜索城市名称"
                    placeholderTextColor="#999"
                  />
                </View>
                
                <View style={styles.iosCard}>
                  {CITIES
                    .filter(city => 
                      city.name.includes(citySearchQuery) || 
                      city.province.includes(citySearchQuery)
                    )
                    .map((city) => (
                      <TouchableOpacity
                        key={city.code}
                        style={[
                          styles.cityListItem,
                          selectedCity === city.code && styles.cityListItemActive
                        ]}
                        onPress={async () => {
                          const previousCity = selectedCity;
                          setSelectedCity(city.code);
                          setCityModalVisible(false);
                          setCitySearchQuery('');
                          
                          if (previousCity !== city.code) {
                            const weatherSubscription = subscriptions.find(sub => sub.id === 'weather');
                            if (weatherSubscription && weatherSubscription.enabled) {
                              console.log('切换地点，同步天气信息，新城市代码:', city.code);
                              await syncSubscriptionNow(weatherSubscription, false, city.code);
                            }
                          }
                        }}
                      >
                        <View style={styles.cityListItemContent}>
                          <Text style={styles.cityListItemName}>{city.name}</Text>
                          <Text style={styles.cityListItemProvince}>{city.province}</Text>
                        </View>
                        {selectedCity === city.code && (
                          <Check size={20} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            </ScrollView>
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
        <TouchableOpacity 
          style={styles.iosModalOverlay}
          activeOpacity={1}
          onPress={() => setThemeModalVisible(false)}
        >
          <View style={styles.iosModalContainer}>
            <View style={styles.iosModalHeader}>
              <Text style={styles.iosModalTitle}>选择主题</Text>
              <View style={{ width: 80 }} />
            </View>
            
            <ScrollView 
              style={styles.iosModalScrollView}
              contentContainerStyle={styles.iosModalScrollViewContent}
            >
              <View style={styles.iosModalContent}>
                <View style={styles.iosCard}>
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
                </View>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 时间选择器模态框 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={timePickerVisible}
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.iosModalOverlay}
          activeOpacity={1}
          onPress={() => setTimePickerVisible(false)}
        >
          <View style={styles.iosModalContainer}>
            <View style={styles.iosModalHeader}>
              <Text style={styles.iosModalTitle}>
                {timePickerType === 'start' ? '开始时间' : '结束时间'}
              </Text>
              <TouchableOpacity
                style={styles.iosModalSaveButton}
                onPress={() => setTimePickerVisible(false)}
              >
                <Text style={styles.iosModalSaveText}>完成</Text>
              </TouchableOpacity>
            </View>
            
            <View 
              style={styles.wheelPickerContainer}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.wheelPickerColumn}>
                <ScrollView
                  ref={hourScrollRef}
                  style={styles.wheelPickerScroll}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={44}
                  decelerationRate="fast"
                  contentContainerStyle={styles.wheelPickerContent}
                  onMomentumScrollBegin={() => {
                    isScrollingRef.current = true;
                  }}
                  onMomentumScrollEnd={handleHourScrollEnd}
                  onScrollEndDrag={() => {
                    setTimeout(() => {
                      isScrollingRef.current = false;
                    }, 100);
                  }}
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = String(i).padStart(2, '0');
                    const currentHour = timePickerType === 'start' 
                      ? startTime.split(':')[0] 
                      : endTime.split(':')[0];
                    const isSelected = hour === currentHour;
                    
                    return (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.wheelPickerItem,
                          isSelected && styles.wheelPickerItemSelected
                        ]}
                        onPress={() => {
                          if (isScrollingRef.current) return;
                          
                          const currentMins = timePickerType === 'start'
                            ? startTime.split(':')[1]
                            : endTime.split(':')[1];
                          const newTime = `${hour}:${currentMins}`;
                          if (timePickerType === 'start') {
                            setStartTime(newTime);
                            if (newTime >= endTime) {
                              let newEndTime;
                              if (parseInt(hour) === 23) {
                                newEndTime = `23:59`;
                              } else {
                                newEndTime = `${String(parseInt(hour) + 1).padStart(2, '0')}:00`;
                              }
                              setEndTime(newEndTime);
                            }
                          } else {
                            setEndTime(newTime);
                            if (newTime <= startTime) {
                              let newStartTime;
                              if (parseInt(hour) === 0) {
                                newStartTime = `00:00`;
                              } else {
                                newStartTime = `${String(parseInt(hour) - 1).padStart(2, '0')}:00`;
                              }
                              setStartTime(newStartTime);
                            }
                          }
                          scrollToHour(hour);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.wheelPickerItemText,
                          isSelected && styles.wheelPickerItemTextSelected
                        ]}>
                          {hour}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              
              <View style={styles.wheelPickerDivider}>
                <Text style={styles.wheelPickerDividerText}>:</Text>
              </View>
              
              <View style={styles.wheelPickerColumn}>
                <ScrollView
                  ref={minuteScrollRef}
                  style={styles.wheelPickerScroll}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={44}
                  decelerationRate="fast"
                  contentContainerStyle={styles.wheelPickerContent}
                  onMomentumScrollBegin={() => {
                    isScrollingRef.current = true;
                  }}
                  onMomentumScrollEnd={handleMinuteScrollEnd}
                  onScrollEndDrag={() => {
                    setTimeout(() => {
                      isScrollingRef.current = false;
                    }, 100);
                  }}
                >
                  {Array.from({ length: 60 }, (_, i) => {
                    const minute = String(i).padStart(2, '0');
                    const currentMinute = timePickerType === 'start' 
                      ? startTime.split(':')[1] 
                      : endTime.split(':')[1];
                    const isSelected = minute === currentMinute;
                    
                    return (
                      <TouchableOpacity
                        key={minute}
                        style={[
                          styles.wheelPickerItem,
                          isSelected && styles.wheelPickerItemSelected
                        ]}
                        onPress={() => {
                          if (isScrollingRef.current) return;
                          
                          const currentHour = timePickerType === 'start'
                            ? startTime.split(':')[0]
                            : endTime.split(':')[0];
                          const newTime = `${currentHour}:${minute}`;
                          if (timePickerType === 'start') {
                            setStartTime(newTime);
                            if (newTime >= endTime) {
                              let newEndTime;
                              if (parseInt(currentHour) === 23 && parseInt(minute) === 59) {
                                newEndTime = `23:59`;
                              } else if (parseInt(currentHour) === 23) {
                                newEndTime = `23:59`;
                              } else {
                                const endHour = parseInt(currentHour) + 1;
                                newEndTime = `${String(endHour).padStart(2, '0')}:00`;
                              }
                              setEndTime(newEndTime);
                            }
                          } else {
                            setEndTime(newTime);
                            if (newTime <= startTime) {
                              let newStartTime;
                              if (parseInt(currentHour) === 0 && parseInt(minute) === 0) {
                                newStartTime = `00:00`;
                              } else if (parseInt(currentHour) === 0) {
                                newStartTime = `00:00`;
                              } else {
                                const startHour = parseInt(currentHour) - 1;
                                newStartTime = `${String(startHour).padStart(2, '0')}:00`;
                              }
                              setStartTime(newStartTime);
                            }
                          }
                          scrollToMinute(minute);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.wheelPickerItemText,
                          isSelected && styles.wheelPickerItemTextSelected
                        ]}>
                          {minute}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              
              <View style={styles.wheelPickerSelectionIndicator} />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* 日期选择器模态框 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={datePickerVisible}
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.iosModalOverlay}
          activeOpacity={1}
          onPress={() => setDatePickerVisible(false)}
        >
          <View style={styles.iosModalContainer}>
            <View style={styles.iosModalHeader}>
              <Text style={styles.iosModalTitle}>
                {datePickerType === 'start' ? '开始日期' : '结束日期'}
              </Text>
              <TouchableOpacity
                style={styles.iosModalSaveButton}
                onPress={() => setDatePickerVisible(false)}
              >
                <Text style={styles.iosModalSaveText}>完成</Text>
              </TouchableOpacity>
            </View>
            
            <View 
              style={styles.wheelPickerContainer}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.wheelPickerColumn}>
                <ScrollView
                  ref={yearScrollRef}
                  style={styles.wheelPickerScroll}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={44}
                  decelerationRate="fast"
                  contentContainerStyle={styles.wheelPickerContent}
                  onMomentumScrollEnd={handleYearScrollEnd}
                >
                  {Array.from({ length: 20 }, (_, i) => {
                    const year = 2020 + i;
                    const currentDate = datePickerType === 'start' ? startDate : endDate;
                    const currentYear = parseInt(currentDate.split('-')[0]);
                    const isSelected = year === currentYear;
                    
                    return (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.wheelPickerItem,
                          isSelected && styles.wheelPickerItemSelected
                        ]}
                        onPress={() => {
                          const currentDate = datePickerType === 'start' ? startDate : endDate;
                          const currentMonth = parseInt(currentDate.split('-')[1]);
                          const currentDay = parseInt(currentDate.split('-')[2]);
                          let newDate = `${year}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
                          
                          if (datePickerType === 'start') {
                            if (newDate > endDate) {
                              newDate = endDate;
                            }
                            setStartDate(newDate);
                          } else {
                            if (newDate < startDate) {
                              newDate = startDate;
                            }
                            setEndDate(newDate);
                          }
                          scrollToYear(year);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.wheelPickerItemText,
                          isSelected && styles.wheelPickerItemTextSelected
                        ]}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              
              <View style={styles.wheelPickerDivider}>
                <Text style={styles.wheelPickerDividerText}>-</Text>
              </View>
              
              <View style={styles.wheelPickerColumn}>
                <ScrollView
                  ref={monthScrollRef}
                  style={styles.wheelPickerScroll}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={44}
                  decelerationRate="fast"
                  contentContainerStyle={styles.wheelPickerContent}
                  onMomentumScrollEnd={handleMonthScrollEnd}
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const currentDate = datePickerType === 'start' ? startDate : endDate;
                    const currentMonth = parseInt(currentDate.split('-')[1]);
                    const isSelected = month === currentMonth;
                    
                    return (
                      <TouchableOpacity
                        key={month}
                        style={[
                          styles.wheelPickerItem,
                          isSelected && styles.wheelPickerItemSelected
                        ]}
                        onPress={() => {
                          const currentDate = datePickerType === 'start' ? startDate : endDate;
                          const currentYear = parseInt(currentDate.split('-')[0]);
                          const currentDay = parseInt(currentDate.split('-')[2]);
                          let newDate = `${currentYear}-${String(month).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
                          
                          if (datePickerType === 'start') {
                            if (newDate > endDate) {
                              newDate = endDate;
                            }
                            setStartDate(newDate);
                          } else {
                            if (newDate < startDate) {
                              newDate = startDate;
                            }
                            setEndDate(newDate);
                          }
                          scrollToMonth(month);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.wheelPickerItemText,
                          isSelected && styles.wheelPickerItemTextSelected
                        ]}>
                          {String(month).padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              
              <View style={styles.wheelPickerDivider}>
                <Text style={styles.wheelPickerDividerText}>-</Text>
              </View>
              
              <View style={styles.wheelPickerColumn}>
                <ScrollView
                  ref={dayScrollRef}
                  style={styles.wheelPickerScroll}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={44}
                  decelerationRate="fast"
                  contentContainerStyle={styles.wheelPickerContent}
                  onMomentumScrollEnd={handleDayScrollEnd}
                >
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1;
                    const currentDate = datePickerType === 'start' ? startDate : endDate;
                    const currentDay = parseInt(currentDate.split('-')[2]);
                    const isSelected = day === currentDay;
                    
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.wheelPickerItem,
                          isSelected && styles.wheelPickerItemSelected
                        ]}
                        onPress={() => {
                          const currentDate = datePickerType === 'start' ? startDate : endDate;
                          const currentYear = parseInt(currentDate.split('-')[0]);
                          const currentMonth = parseInt(currentDate.split('-')[1]);
                          let newDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          
                          if (datePickerType === 'start') {
                            if (newDate > endDate) {
                              newDate = endDate;
                            }
                            setStartDate(newDate);
                          } else {
                            if (newDate < startDate) {
                              newDate = startDate;
                            }
                            setEndDate(newDate);
                          }
                          scrollToDay(day);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.wheelPickerItemText,
                          isSelected && styles.wheelPickerItemTextSelected
                        ]}>
                          {String(day).padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              
              <View style={styles.wheelPickerSelectionIndicator} />
            </View>
          </View>
        </TouchableOpacity>
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
    flex: Platform.OS === 'web' ? 0.6 : 0.07,
    minHeight: Platform.OS === 'web' ? 0 : 330,
  },
  visibleView: {
    display: 'flex',
  },
  hiddenView: {
    display: 'none',
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
    flex: 1,
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
  },
  modalScrollView: {
    maxHeight: '90%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  modalScrollViewContent: {
    paddingBottom: Platform.OS === 'android' ? 80 : 30,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    color: '#2c3e50',
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 3,
    marginTop: 3,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 6,
    marginBottom: 6,
    fontSize: 13,
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
    minHeight: 40,
    textAlignVertical: 'top',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  timePicker: {
    alignItems: 'center',
    gap: 4,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  timeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  timeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  timeColumn: {
    alignItems: 'center',
  },
  timeColumnLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7a8a99',
    marginBottom: 8,
  },
  timeValueContainer: {
    alignItems: 'center',
    gap: 6,
  },
  timeAdjustBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  timeAdjustIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  timeValue: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
    minWidth: 70,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: '#667eea',
    marginTop: 24,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  dateCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dateCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  dateDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateAdjustBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  dateAdjustIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  dateDisplay: {
    flex: 1,
    marginHorizontal: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  dateDisplayText: {
    fontSize: 16,
    fontWeight: '700',
  },
  dateQuickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  dateQuickActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dateQuickActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 8,
  },
  priorityButton: {
    flex: 1,
    padding: 6,
    borderRadius: 8,
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
    fontSize: 11,
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
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 6,
  },
  switch: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ccc',
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#4A90E2',
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  repeatButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 6,
  },
  repeatButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
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
    fontSize: 11,
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
    gap: 5,
    marginBottom: 6,
  },
  alarmButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
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
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  alarmButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  alarmActionButtons: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  alarmActionButton: {
    flex: 1,
    paddingVertical: 8,
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
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  alarmActionButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#e8eef5',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#4A90E2',
  },
  buttonText: {
    fontSize: 13,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeButtonText: {
    fontSize: 20,
  },
  themeModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 12,
    maxHeight: '80%',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
    justifyContent: 'center',
  },
  themeCard: {
    width: 80,
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  themeCardActive: {
    borderColor: '#667eea',
    backgroundColor: '#f0f4ff',
  },
  themePreview: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 4,
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  themeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
  },
  
  // 订阅窗体独立样式
  subscriptionSubscribeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  subscriptionSubscribeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  subscriptionSubscribedBadge: {
    backgroundColor: '#34c759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
  },
  subscriptionSubscribedText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  subscriptionSubscribedCount: {
    color: '#fff',
    fontSize: 11,
    marginTop: 2,
  },
  subscriptionSyncingText: {
    color: '#8e8e93',
    fontSize: 15,
    fontWeight: '500',
  },
  subscriptionActions: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  subscriptionSyncAllButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },

  // iOS风格模态框样式
  iosModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  iosModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  iosModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#c6c6c8',
  },
  iosModalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iosModalCancelText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  iosModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  iosModalSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iosModalSaveButtonDisabled: {
    opacity: 0.3,
  },
  iosModalSaveText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  iosModalSaveTextDisabled: {
    color: '#007AFF',
  },
  iosModalScrollView: {
    maxHeight: '80%',
  },
  iosModalScrollViewContent: {
    paddingBottom: 20,
  },
  iosModalContent: {
    padding: 16,
  },
  iosInputGroup: {
    marginBottom: 20,
  },
  iosInputTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iosInput: {
    fontSize: 17,
    color: '#000',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#c6c6c8',
  },
  iosTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  iosCard: {
    backgroundColor: '#f2f2f7',
    borderRadius: 10,
    marginBottom: 24,
    overflow: 'hidden',
  },
  iosCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iosCardLabelContainer: {
    flex: 1,
  },
  iosCardLabel: {
    fontSize: 17,
    color: '#000',
    fontWeight: '400',
  },
  iosCardSublabel: {
    fontSize: 15,
    color: '#8e8e93',
    marginTop: 2,
  },
  iosCardValue: {
    fontSize: 17,
    color: '#8e8e93',
  },
  iosCardDivider: {
    height: 0.5,
    backgroundColor: '#c6c6c8',
    marginLeft: 16,
  },
  iosSwitch: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: '#e9e9ea',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  iosSwitchActive: {
    backgroundColor: '#34c759',
  },
  iosSwitchThumb: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
    alignSelf: 'flex-start',
  },
  iosSwitchThumbActive: {
    alignSelf: 'flex-end',
  },
  iosRepeatOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  iosRepeatOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c6c6c8',
  },
  iosRepeatOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  iosRepeatOptionText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  iosRepeatOptionTextActive: {
    color: '#fff',
  },
  iosAlarmOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  iosAlarmOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c6c6c8',
  },
  iosAlarmOptionActive: {
    backgroundColor: '#ff9500',
    borderColor: '#ff9500',
  },
  iosAlarmOptionText: {
    fontSize: 15,
    color: '#ff9500',
    fontWeight: '500',
  },
  iosAlarmOptionTextActive: {
    color: '#fff',
  },
  iosAlarmActions: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  iosAlarmAction: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c6c6c8',
    alignItems: 'center',
  },
  iosAlarmActionActive: {
    backgroundColor: '#ff9500',
    borderColor: '#ff9500',
  },
  iosAlarmActionText: {
    fontSize: 15,
    color: '#ff9500',
    fontWeight: '500',
  },
  iosAlarmActionTextActive: {
    color: '#fff',
  },
  iosPriorityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  iosPriorityOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c6c6c8',
  },
  iosPriorityOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  iosPriorityOptionText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  iosPriorityOptionTextActive: {
    color: '#fff',
  },
  iosNumberInput: {
    width: 60,
    fontSize: 17,
    color: '#000',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c6c6c8',
  },
  iosTimePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iosTimeAdjustButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosTimeAdjustIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  quickJumpModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  iosYearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f2f2f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosYearButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
  },
  iosYearText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  iosMonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
  },
  iosMonthButton: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c6c6c8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosMonthButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  iosMonthButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },
  iosMonthButtonTextActive: {
    color: '#fff',
  },
  wheelPickerContainer: {
    flexDirection: 'row',
    height: 220,
    position: 'relative',
    paddingHorizontal: 20,
  },
  wheelPickerColumn: {
    flex: 1,
  },
  wheelPickerScroll: {
    height: 220,
  },
  wheelPickerContent: {
    paddingVertical: 88,
  },
  wheelPickerItem: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelPickerItemSelected: {
  },
  wheelPickerItemText: {
    fontSize: 22,
    color: '#c7c7cc',
    fontWeight: '400',
  },
  wheelPickerItemTextSelected: {
    fontSize: 26,
    color: '#000',
    fontWeight: '600',
  },
  wheelPickerDivider: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  wheelPickerDividerText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000',
  },
  wheelPickerSelectionIndicator: {
    position: 'absolute',
    top: 88,
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 122, 255, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 122, 255, 0.3)',
    borderRadius: 8,
    pointerEvents: 'none',
  },
  iosTimePickerArrow: {
    fontSize: 24,
    color: '#c7c7cc',
    fontWeight: '300',
  },
  customReminderContainer: {
    marginBottom: 20,
  },
  customReminderLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#000',
  },
  customReminderInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  customReminderPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  customReminderPreset: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  customReminderPresetActive: {
    backgroundColor: '#007AFF',
  },
  customReminderPresetText: {
    fontSize: 14,
    color: '#333',
  },
  customReminderPresetTextActive: {
    color: '#fff',
  },
  customReminderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  citySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cityListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#c6c6c8',
  },
  cityListItemActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  cityListItemContent: {
    flex: 1,
  },
  cityListItemName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  cityListItemProvince: {
    fontSize: 14,
    color: '#8e8e93',
  },
});
