import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { parseICalDate } from '../utils/icalendar';
import { solarToLunar } from '../utils/lunar';

export default function WeekView({ 
  currentMonth, 
  events, 
  onEventPress,
  selectedDate,
  theme 
}) {
  // 获取当前周的日期
  const getWeekDates = () => {
    const date = selectedDate ? new Date(selectedDate) : currentMonth;
    const day = date.getDay();
    const diff = date.getDate() - day;
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(date);
      d.setDate(diff + i);
      weekDates.push(d);
    }
    return weekDates;
  };

  const weekDates = getWeekDates();
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // 获取指定日期的所有事件
  const getEventsForDate = (date) => {
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const icalDate = dateString.replace(/-/g, '');
    
    return events.filter(event => {
      // 检查日期部分是否匹配
      const eventDatePart = event.dtstart.substring(0, 8);
      return eventDatePart === icalDate;
    });
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
          const subscribedEvents = dayEvents.filter(e => e.isSubscribed);
          const isHoliday = subscribedEvents.some(e => 
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
              {subscribedEvents.length > 0 && (
                <View style={styles.subscribedIndicator}>
                  {subscribedEvents.slice(0, 2).map((event) => (
                    <View 
                      key={event.uid} 
                      style={[
                        styles.subscribedDot,
                        { backgroundColor: event.subscriptionColor || '#9b59b6' }
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* 时间轴和事件 */}
      <ScrollView style={styles.scrollView}>
        {hours.map(hour => (
          <View key={hour} style={styles.hourRow}>
            <View style={styles.timeColumn}>
              <Text style={styles.timeText}>{String(hour).padStart(2, '0')}:00</Text>
            </View>
            {weekDates.map((date, dayIndex) => {
              const dayEvents = getEventsForDate(date);
              const subscribedEvents = dayEvents.filter(e => e.isSubscribed);
              const regularEvents = dayEvents.filter(e => !e.isSubscribed);
              
              return (
                <View key={dayIndex} style={styles.dayColumn}>
                  {hour === 0 && (
                    <View style={styles.eventBlock}>
                      {/* 订阅事件 */}
                      {subscribedEvents.map(event => (
                        <TouchableOpacity
                          key={event.uid}
                          style={[
                            styles.eventItem,
                            styles.subscribedEvent,
                            { 
                              borderLeftColor: event.subscriptionColor || theme?.accent || '#9b59b6',
                              backgroundColor: theme?.id === 'appleDark' ? 'rgba(155, 89, 182, 0.2)' : '#f3e5f5'
                            }
                          ]}
                          onPress={() => onEventPress(event)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.eventTitle, { 
                            color: theme?.id === 'appleDark' ? '#fff' : '#333'
                          }]} numberOfLines={1}>
                            {event.summary}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {/* 普通事件 */}
                      {regularEvents.map(event => (
                        <TouchableOpacity
                          key={event.uid}
                          style={[
                            styles.eventItem,
                            { 
                              backgroundColor: theme?.primary || '#4A90E2',
                              borderLeftColor: theme?.primary || '#4A90E2'
                            }
                          ]}
                          onPress={() => onEventPress(event)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.eventTitle} numberOfLines={1}>
                            {event.summary}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

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
  scrollView: {
    flex: 1,
  },
  hourRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 60,
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  eventBlock: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    gap: 2,
  },
  eventItem: {
    padding: 4,
    borderRadius: 4,
    marginBottom: 2,
    borderLeftWidth: 3,
  },
  subscribedEvent: {
    borderLeftWidth: 3,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
