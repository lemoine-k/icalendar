import React, { useMemo, memo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { parseICalDate } from '../utils/icalendar';
import { solarToLunar } from '../utils/lunar';
import { getCityByCode } from '../utils/cities';

// 天气详情Tooltip组件
const WeatherTooltip = ({ visible, weatherEvent, onClose, position, selectedCity }) => {
  if (!visible || !weatherEvent) return null;
  
  const summary = weatherEvent.summary || '';
  const description = weatherEvent.description || '';
  
  // 从描述中提取天气信息（处理换行符）
  const descriptionLines = description.split('\n').map(line => line.trim()).filter(line => line);
  const weatherType = descriptionLines.find(line => line.startsWith('天气:'))?.replace('天气:', '').trim() || '';
  const temp = descriptionLines.find(line => line.startsWith('温度:'))?.replace('温度:', '').trim() || '';
  const advice = descriptionLines.find(line => line.startsWith('建议:'))?.replace('建议:', '').trim() || '';
  const windDir = descriptionLines.find(line => line.startsWith('风向:'))?.replace('风向:', '').trim() || '';
  const windSpeed = descriptionLines.find(line => line.startsWith('风力:'))?.replace('风力:', '').trim() || '';
  const humidity = descriptionLines.find(line => line.startsWith('湿度:'))?.replace('湿度:', '').trim() || '';
  const locationEn = weatherEvent.location || '';
  
  // 将英文城市名转换为中文
  const locationCN = (() => {
    const city = getCityByCode(selectedCity);
    if (city) return city.name;
    return locationEn;
  })();
  
  // 如果description中没有天气信息，尝试从summary中提取
  const finalWeatherType = weatherType || summary.match(/[晴多云阴小雨中雨大雨雷阵雨雪]+/)?.[0] || '';
  const finalTemp = temp || summary.match(/\d+(-\d+)?°C/)?.[0] || '';
  
  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <TouchableOpacity 
        style={styles.tooltipOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[
          styles.tooltipContainer,
          position && { top: position.y + 10, left: position.x }
        ]}>
          <View style={styles.tooltipHeader}>
            <Text style={styles.tooltipTitle}>天气预报</Text>
            {locationCN && <Text style={styles.tooltipLocation}>{locationCN}</Text>}
          </View>
          <View style={styles.tooltipContent}>
            <Text style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>天气：</Text>
              <Text style={styles.tooltipValue}>{finalWeatherType}</Text>
            </Text>
            <Text style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>温度：</Text>
              <Text style={styles.tooltipValue}>{finalTemp}</Text>
            </Text>
            {windDir && (
              <Text style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>风向：</Text>
                <Text style={styles.tooltipValue}>{windDir}</Text>
              </Text>
            )}
            {windSpeed && (
              <Text style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>风力：</Text>
                <Text style={styles.tooltipValue}>{windSpeed}</Text>
              </Text>
            )}
            {humidity && (
              <Text style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>湿度：</Text>
                <Text style={styles.tooltipValue}>{humidity}</Text>
              </Text>
            )}
            {advice && (
              <Text style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>建议：</Text>
                <Text style={styles.tooltipAdvice}>{advice}</Text>
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// 从天气事件摘要中提取天气图标和温度
const extractWeatherInfo = (summary) => {
  if (!summary) return { icon: null, temp: null };
  
  const weatherIcons = ['☀️', '⛅', '☁️', '🌧️', '⛈️', '❄️'];
  let icon = null;
  
  for (const weatherIcon of weatherIcons) {
    if (summary.includes(weatherIcon)) {
      icon = weatherIcon;
      break;
    }
  }
  
  // 提取温度（格式如 "15-25°C" 或 "15°C"）
  const tempMatch = summary.match(/(\d+(-\d+)?°C)/);
  const temp = tempMatch ? tempMatch[1] : null;
  
  return { icon, temp };
};

function WeekView({ 
  currentMonth, 
  events, 
  subscribedEvents,
  onEventPress,
  selectedDate,
  selectedCity,
  theme,
  style
}) {
  if (style?.display === 'none') {
    return null;
  }
  
  // Tooltip状态管理
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipEvent, setTooltipEvent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // 处理天气图标悬停
  const handleWeatherIconMouseEnter = (event, e) => {
    if (Platform.OS === 'web') {
      const rect = e.target.getBoundingClientRect();
      setTooltipPosition({ x: rect.left, y: rect.top });
    }
    setTooltipEvent(event);
    setTooltipVisible(true);
  };
  
  const handleWeatherIconMouseLeave = () => {
    setTooltipVisible(false);
  };
  
  const weekDates = useMemo(() => {
    const date = selectedDate ? new Date(selectedDate) : currentMonth;
    const day = date.getDay();
    const diff = date.getDate() - day;
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(date);
      d.setDate(diff + i);
      dates.push(d);
    }
    return dates;
  }, [selectedDate, currentMonth]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // 获取指定日期的所有事件（只包含普通事件）
  const getEventsForDate = (date) => {
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const icalDate = dateString.replace(/-/g, '');
    
    return events.filter(event => {
      // 检查日期部分是否匹配
      const eventDatePart = event.dtstart.substring(0, 8);
      return eventDatePart === icalDate && !event.isSubscribed;
    });
  };

  // 获取指定日期的订阅事件
  const getSubscribedEventsForDate = (date) => {
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const icalDate = dateString.replace(/-/g, '');
    
    return subscribedEvents.filter(event => {
      const eventDatePart = event.dtstart.substring(0, 8);
      return eventDatePart === icalDate;
    });
  };

  // 计算事件的时间跨度（以分钟为单位）
  const getEventDuration = (event) => {
    if (event.isAllDay) return { startMinutes: 0, durationMinutes: 1440 }; // 全天 = 24小时
    
    const dtstart = event.dtstart;
    const dtend = event.dtend;
    
    if (dtstart.length >= 13 && dtend.length >= 13) {
      const startHour = parseInt(dtstart.substring(9, 11));
      const startMinute = parseInt(dtstart.substring(11, 13));
      const endHour = parseInt(dtend.substring(9, 11));
      const endMinute = parseInt(dtend.substring(11, 13));
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      const durationMinutes = endMinutes - startMinutes;
      
      return { startMinutes, durationMinutes };
    }
    
    return { startMinutes: 0, durationMinutes: 60 }; // 默认1小时
  };

  return (
    <View style={[styles.container, { backgroundColor: theme?.card || '#fff' }]}>
      {/* 星期标题 */}
      <View style={[styles.weekHeader, { 
        borderBottomColor: theme?.primary || '#4A90E2',
        backgroundColor: theme?.card || '#fff'
      }]}>
        <View style={styles.timeColumn} />
        {weekDates.map((date, index) => {
          const isToday = new Date().toDateString() === date.toDateString();
          const dayEvents = getEventsForDate(date);
          const daySubscribedEvents = getSubscribedEventsForDate(date);
          const isHoliday = daySubscribedEvents.some(e => 
            e.subscriptionId && e.subscriptionId.includes('holiday')
          );
          const dayOfWeek = date.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          return (
            <View key={index} style={[
              styles.dayColumn,
              isHoliday && styles.holidayColumn,
              isWeekend && !isHoliday && styles.weekendColumn,
            ]}>
              <Text style={[
                styles.weekdayText,
                { color: theme?.textSecondary || '#666' },
                isToday && { color: theme?.primary || '#4A90E2' },
                isHoliday && { color: theme?.danger || '#ff6b6b' },
              ]}>
                {['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}
              </Text>
              <Text style={[
                styles.dateText,
                { color: theme?.text || '#333' },
                isToday && { color: theme?.primary || '#4A90E2' },
                isHoliday && { color: theme?.danger || '#ff6b6b' },
              ]}>
                {date.getDate()}
              </Text>
              <Text style={[
                styles.lunarText,
                { color: theme?.textSecondary || '#999' },
                isToday && { color: theme?.primary || '#4A90E2' },
                isHoliday && { color: theme?.danger || '#ff6b6b' },
              ]}>
                {solarToLunar(date).display}
              </Text>
              {isHoliday && (
                <View style={[styles.holidayBadge, { backgroundColor: theme?.danger || '#ff6b6b' }]}>
                  <Text style={styles.holidayBadgeText}>休</Text>
                </View>
              )}
              {daySubscribedEvents.length > 0 && (() => {
                const weatherEvent = daySubscribedEvents.find(e => e.subscriptionId && e.subscriptionId.includes('weather'));
                const weatherInfo = weatherEvent ? extractWeatherInfo(weatherEvent.summary || '') : { icon: null, temp: null };
                
                if (weatherInfo.icon) {
                  return (
                    <TouchableOpacity
                      style={styles.weatherContainer}
                      onPress={(e) => handleWeatherIconMouseEnter(weatherEvent, e)}
                      onMouseEnter={(e) => handleWeatherIconMouseEnter(weatherEvent, e)}
                      onMouseLeave={handleWeatherIconMouseLeave}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.weatherIcon}>{weatherInfo.icon}</Text>
                    </TouchableOpacity>
                  );
                } else {
                  return (
                    <View style={styles.subscribedIndicator}>
                      {daySubscribedEvents.slice(0, 2).map((event) => (
                        <View 
                          key={event.uid} 
                          style={[
                            styles.subscribedDot,
                            { backgroundColor: event.subscriptionColor || '#9b59b6' }
                          ]}
                        />
                      ))}
                    </View>
                  );
                }
              })()}
            </View>
          );
        })}
      </View>

      {/* 时间轴和事件 */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.timeGrid}>
          {/* 时间标签列 */}
          <View style={styles.timeLabelsColumn}>
            {hours.map(hour => (
              <View key={hour} style={styles.hourRow}>
                <Text style={styles.timeText}>{String(hour).padStart(2, '0')}:00</Text>
              </View>
            ))}
          </View>
          
          {/* 每天的事件列 */}
          {weekDates.map((date, dayIndex) => {
            const dayEvents = getEventsForDate(date);
            
            return (
              <View key={dayIndex} style={styles.dayEventsColumn}>
                {/* 时间网格背景 */}
                {hours.map(hour => (
                  <View key={hour} style={styles.hourCell} />
                ))}
                
                {/* 事件覆盖层 */}
                {dayEvents.map(event => {
                  const { startMinutes, durationMinutes } = getEventDuration(event);
                  const hourHeight = 60; // 每小时的高度
                  const top = (startMinutes / 60) * hourHeight;
                  const height = Math.max((durationMinutes / 60) * hourHeight, 30); // 最小高度30px
                  
                  const getTimeRange = () => {
                    if (event.isAllDay) return '全天';
                    const dtstart = event.dtstart;
                    const dtend = event.dtend;
                    if (dtstart.length >= 13 && dtend.length >= 13) {
                      const startTime = `${dtstart.substring(9, 11)}:${dtstart.substring(11, 13)}`;
                      const endTime = `${dtend.substring(9, 11)}:${dtend.substring(11, 13)}`;
                      return `${startTime}-${endTime}`;
                    }
                    return '';
                  };
                  
                  return (
                    <TouchableOpacity
                      key={event.uid}
                      style={[
                        styles.eventBar,
                        {
                          top,
                          height,
                          backgroundColor: event.isSubscribed 
                            ? (theme?.id === 'appleDark' ? 'rgba(155, 89, 182, 0.85)' : '#e1bee7')
                            : (theme?.primary || '#4A90E2'),
                          borderLeftColor: event.isSubscribed
                            ? (event.subscriptionColor || theme?.accent || '#9b59b6')
                            : (theme?.primary || '#4A90E2'),
                        }
                      ]}
                      onPress={() => onEventPress(event)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.eventBarTitle, {
                        color: event.isSubscribed && theme?.id !== 'appleDark' ? '#333' : '#fff'
                      }]} numberOfLines={2}>
                        {event.summary}
                      </Text>
                      <Text style={[styles.eventBarTime, {
                        color: event.isSubscribed && theme?.id !== 'appleDark' ? '#666' : 'rgba(255,255,255,0.9)'
                      }]} numberOfLines={1}>
                        {getTimeRange()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
      
      {/* 天气详情Tooltip */}
      <WeatherTooltip
        visible={tooltipVisible}
        weatherEvent={tooltipEvent}
        onClose={() => setTooltipVisible(false)}
        position={tooltipPosition}
        selectedCity={selectedCity}
      />
    </View>
  );
}

const MemoizedWeekView = memo(WeekView);
export default MemoizedWeekView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#4A90E2',
    paddingVertical: 10,
  },
  timeColumn: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  lunarText: {
    fontSize: 10,
    marginTop: 2,
  },
  holidayColumn: {
    backgroundColor: '#ffe6e6',
  },
  weekendColumn: {
    backgroundColor: '#f0f8ff',
  },
  holidayBadge: {
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 2,
  },
  holidayBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  subscribedIndicator: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  subscribedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weatherContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 2,
  },
  weatherIcon: {
    fontSize: 12,
  },
  weatherTemp: {
    fontSize: 8,
    color: '#666',
    marginTop: -2,
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    minWidth: 200,
    maxWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tooltipHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
    marginBottom: 12,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  tooltipLocation: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  tooltipContent: {
    gap: 8,
  },
  tooltipRow: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  tooltipLabel: {
    fontWeight: '500',
    color: '#666',
  },
  tooltipValue: {
    color: '#333',
  },
  tooltipAdvice: {
    color: '#666',
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
  },
  timeGrid: {
    flexDirection: 'row',
    position: 'relative',
  },
  timeLabelsColumn: {
    width: 60,
  },
  hourRow: {
    height: 60,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  dayEventsColumn: {
    flex: 1,
    position: 'relative',
  },
  hourCell: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
  },
  eventBar: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 4,
    padding: 4,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  eventBarTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  eventBarTime: {
    fontSize: 9,
    fontWeight: '500',
  },
});
