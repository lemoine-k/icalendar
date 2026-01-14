import React, { useMemo, memo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions, Modal } from 'react-native';
import { solarToLunar, getSolarTerm, isImportantSolarTerm } from '../utils/lunar';
import { getCityByCode } from '../utils/cities';

const { height: screenHeight } = Dimensions.get('window');

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

// 春节假期检测函数
const isSpringFestivalHoliday = (dateString, eventTitle) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript月份从0开始
  const day = date.getDate();
  
  // 春节假期通常在1月下旬到2月中旬
  if (month === 1 || month === 2) {
    const title = eventTitle.toLowerCase();
    
    // 检查是否包含春节相关的关键词
    const springFestivalKeywords = [
      '春节', '除夕', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
      '新年', '过年', '年初', '正月', '春假',
      '春节假期', '春节放假', '春节休假',
      '黄金周', '春节黄金周', '春节黄金',
      '春节假期 第', '春节假期第', '春节放假 第', '春节放假第',
      'spring festival', 'chinese new year', 'lunar new year'
    ];
    
    const hasSpringKeyword = springFestivalKeywords.some(keyword => 
      title.includes(keyword) || title.includes(keyword.toLowerCase())
    );
    
    if (hasSpringKeyword) {
      return true;
    }
    
    // 如果事件标题包含"假期"、"休假"等，且在春节期间，也认为是春节假期
    const generalHolidayKeywords = ['假期', '休假', '放假', '休息', 'holiday', 'vacation'];
    const hasGeneralKeyword = generalHolidayKeywords.some(keyword => 
      title.includes(keyword) || title.includes(keyword.toLowerCase())
    );
    
    if (hasGeneralKeyword && ((month === 1 && day > 15) || (month === 2 && day < 15))) {
      return true;
    }
  }
  
  return false;
};

function MonthView({ 
  currentMonth, 
  events, 
  subscribedEvents,
  onDayPress,
  selectedDate,
  getEventsForDate,
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
  
  // 使用useMemo缓存当月的农历和节气数据，避免重复计算
  const monthData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const dayDataCache = {};
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(year, month, day);
      
      const lunar = solarToLunar(date);
      const solarTerm = getSolarTerm(date);
      
      dayDataCache[dateString] = {
        lunar,
        solarTerm,
        date
      };
    }
    
    return dayDataCache;
  }, [currentMonth.getFullYear(), currentMonth.getMonth()]);

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    
    // 空白占位
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }
    
    // 日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = isCurrentMonth && day === today.getDate();
      const isSelected = dateString === selectedDate;
      const dayEvents = getEventsForDate(dateString);
      
      const dayData = monthData[dateString];
      const { lunar, solarTerm } = dayData;
      
      const daySubscribedEvents = subscribedEvents.filter(e => {
        const eventDatePart = e.dtstart.substring(0, 8);
        const icalDate = dateString.replace(/-/g, '');
        return eventDatePart === icalDate;
      });
      const regularEvents = dayEvents;
      
      // 检查天气订阅事件
      const weatherEvent = daySubscribedEvents.find(e => e.subscriptionId && e.subscriptionId.includes('weather'));
      const weatherInfo = weatherEvent ? extractWeatherInfo(weatherEvent.summary || '') : { icon: null, temp: null };
      
      const isHoliday = daySubscribedEvents.some(e => {
        if (!e.subscriptionId || (!e.subscriptionId.includes('holiday') && !e.subscriptionId.includes('holidays'))) {
          return false;
        }
        
        const title = (e.summary || '').trim();
        const titleLower = title.toLowerCase();
        
        const workKeywords = ['上班', '工作', '调休', '补班', '办公', '值班', '补课', 'work', 'office'];
        const hasWorkKeyword = workKeywords.some(keyword => titleLower.includes(keyword));
        
        if (hasWorkKeyword) {
          return false;
        }
        
        if (isSpringFestivalHoliday(dateString, title)) {
          return true;
        }
        
        const holidayIndicators = [
          '放假', '休假', '假期', '节假日', '公休', '休息',
          '元旦', '春节', '清明节', '劳动节', '端午节', '中秋节', '国庆节',
          '除夕', '初一', '初二', '初三', '初四', '初五', '初六', '初七',
          '五一', '十一', '清明', '端午', '中秋',
          '年初', '正月', '新年', '过年', '春假',
          'holiday', 'vacation', 'spring festival', 'chinese new year'
        ];
        
        const matchedIndicator = holidayIndicators.find(indicator => titleLower.includes(indicator));
        return !!matchedIndicator;
      });
      
      // 检查是否为周末
      const dayOfWeek = new Date(dateString).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      days.push(
        <View
          key={day}
          style={[
            styles.dayCell,
            isWeekend && !isToday && !isSelected && !isHoliday && styles.weekend,
            isHoliday && !isToday && !isSelected && styles.holiday,
          ]}
        >
          <TouchableOpacity
            style={[
              styles.dayTouchable,
              isSelected && !isToday && {
                backgroundColor: theme?.secondary || '#ff2d55',
                borderRadius: 18,
              },
              isToday && {
                backgroundColor: theme?.primary || '#ff3b30',
                borderRadius: 18,
              },
            ]}
            onPress={() => onDayPress(dateString)}
            activeOpacity={0.7}
          >
            <View style={styles.dayContent}>
              <Text style={[
                styles.dayText,
                { color: theme?.text || '#000000' },
                isToday && styles.todayText,
                isSelected && !isToday && { color: '#fff' },
                isHoliday && !isToday && !isSelected && { color: theme?.danger || '#ff3b30' },
                isWeekend && !isHoliday && !isToday && !isSelected && { color: theme?.textSecondary || '#8e8e93' },
              ]}>
                {day}
              </Text>
              <Text style={[
                styles.lunarText,
                { color: theme?.textSecondary || '#8e8e93' },
                isToday && styles.lunarTodayText,
                isSelected && !isToday && { color: 'rgba(255, 255, 255, 0.8)' },
                isHoliday && !isToday && !isSelected && { color: theme?.danger || '#ff3b30' },
              ]}>
                {lunar.display}
              </Text>
            </View>
          </TouchableOpacity>
          
          {/* 节假日标识 - 优化显示和样式 */}
          {isHoliday && (() => {
            const currentDate = new Date(dateString);
            const currentMonth = currentDate.getMonth() + 1;
            const currentDay = currentDate.getDate();
            const isSpringFestivalPeriod = (currentMonth === 1 && currentDay >= 16) || (currentMonth === 2 && currentDay <= 14);
            
            const isSpringFestival = subscribedEvents.some(e => {
              const title = (e.summary || '');
              const titleLower = title.toLowerCase();
              const result = isSpringFestivalHoliday(dateString, title) ||
                     titleLower.includes('春节') || titleLower.includes('除夕') || 
                     titleLower.includes('初一') || titleLower.includes('初二') || 
                     titleLower.includes('初三') || titleLower.includes('初四') ||
                     titleLower.includes('初五') || titleLower.includes('初六') ||
                     titleLower.includes('新年') || titleLower.includes('过年');
              
              return result;
            });
            
            return (
              <View style={isSpringFestival ? styles.springFestivalBadge : styles.holidayBadge}>
                <Text style={styles.holidayBadgeText}>
                  {isSpringFestival ? '春' : '休'}
                </Text>
              </View>
            );
          })()}
          
          {/* 订阅事件标识 - 天气显示图标，悬停显示详情，其他显示小红点 */}
          {!isHoliday && weatherInfo.icon && (
            <TouchableOpacity
              style={styles.weatherContainer}
              onPress={(e) => handleWeatherIconMouseEnter(weatherEvent, e)}
              onMouseEnter={(e) => handleWeatherIconMouseEnter(weatherEvent, e)}
              onMouseLeave={handleWeatherIconMouseLeave}
              activeOpacity={0.7}
            >
              <Text style={styles.weatherIcon}>{weatherInfo.icon}</Text>
            </TouchableOpacity>
          )}
          {!isHoliday && !weatherInfo.icon && daySubscribedEvents.length > 0 && (
            <View style={styles.subscribedIndicator}>
              <View style={styles.subscribedDot} />
            </View>
          )}
          
          {/* 普通事件计数 */}
          {regularEvents.length > 0 && (
            <View style={[
              styles.eventIndicator,
              { backgroundColor: theme?.primary || '#ff3b30' }
            ]}>
              <Text style={styles.eventCount}>{regularEvents.length}</Text>
            </View>
          )}
        </View>
      );
    }
    
    return days;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme?.card || '#ffffff' }]}>
      <View style={[styles.weekdays, { 
        backgroundColor: theme?.card || '#ffffff',
        borderBottomColor: theme?.border || '#c6c6c8'
      }]}>
        {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
          <Text key={index} style={[styles.weekdayText, { color: theme?.textSecondary || '#8e8e93' }]}>
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.calendar}>
        {renderCalendar()}
      </View>
      
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

const MemoizedMonthView = memo(MonthView);
export default MemoizedMonthView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekdays: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: 0.5,
    margin: 0,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 0,
    margin: 0,
    minHeight: Platform.OS === 'android' ? 300 : 360,
    alignContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    height: Platform.OS === 'android' ? 52 : 62,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    position: 'relative',
    margin: 0,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 0,
    flexShrink: 0,
    overflow: 'hidden',
  },
  dayTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    margin: 0,
  },
  dayContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '400',
  },
  lunarText: {
    fontSize: 8,
    marginTop: 1,
    fontWeight: '400',
  },
  lunarTodayText: {
    color: '#fff',
    fontWeight: '500',
  },
  lunarHolidayText: {
    fontWeight: '500',
  },
  todayText: {
    color: '#fff',
    fontWeight: '600',
  },
  selectedText: {
    fontWeight: '600',
  },
  weekend: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 0,
  },
  holiday: {
    backgroundColor: '#fce8e6',
    borderWidth: 0,
    borderRadius: 0,
  },
  holidayText: {
    fontWeight: '600',
  },
  holidayBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#d93025',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  springFestivalBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ff6b35', // 春节用橙红色
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holidayBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  subscribedIndicator: {
    position: 'absolute',
    top: 2,
    left: 2,
  },
  subscribedIndicatorHoliday: {
    top: 2,
    left: 20,
  },
  subscribedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d93025',
  },
  weatherContainer: {
    position: 'absolute',
    top: 2,
    left: 2,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  weatherIcon: {
    fontSize: 12,
  },
  weatherTemp: {
    fontSize: 8,
    color: '#666',
    marginTop: -2,
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  eventCount: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
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
});
