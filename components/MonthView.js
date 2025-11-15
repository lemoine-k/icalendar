import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { solarToLunar } from '../utils/lunar';

export default function MonthView({ 
  currentMonth, 
  events, 
  onDayPress, 
  selectedDate,
  getEventsForDate,
  theme 
}) {
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
      const hasEvent = dayEvents.length > 0;
      
      // 分类事件
      const subscribedEvents = dayEvents.filter(e => e.isSubscribed);
      const regularEvents = dayEvents.filter(e => !e.isSubscribed);
      
      // 检查是否为节假日
      const isHoliday = subscribedEvents.some(e => 
        e.subscriptionId && e.subscriptionId.includes('holiday')
      );
      
      // 检查是否为周末
      const dayOfWeek = new Date(dateString).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            isWeekend && !isToday && !isSelected && !isHoliday && styles.weekend,
            isHoliday && !isToday && !isSelected && styles.holiday,
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
              {(() => {
                const date = new Date(dateString);
                const lunar = solarToLunar(date);
                return lunar.display;
              })()}
            </Text>
          </View>
          
          {/* 节假日标识 */}
          {isHoliday && (
            <View style={styles.holidayBadge}>
              <Text style={styles.holidayBadgeText}>休</Text>
            </View>
          )}
          
          {/* 订阅事件标识 - 小红点 */}
          {subscribedEvents.length > 0 && (
            <View style={[
              styles.subscribedIndicator,
              isHoliday && styles.subscribedIndicatorHoliday
            ]}>
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
        </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekdays: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
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
    padding: 5,
    height: 420, // 固定高度：6行 × 70px
  },
  dayCell: {
    width: '14.28%',
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    position: 'relative',
  },
  dayContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 17,
    fontWeight: '400',
  },
  lunarText: {
    fontSize: 9,
    marginTop: 2,
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
  },
  holiday: {
    backgroundColor: '#fce8e6',
    borderWidth: 0,
    borderRadius: 16,
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
});
