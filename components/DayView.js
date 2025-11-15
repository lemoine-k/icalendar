import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { parseICalDate } from '../utils/icalendar';
import { getLunarInfo } from '../utils/lunar';

export default function DayView({ 
  selectedDate, 
  events, 
  onEventPress,
  theme 
}) {
  const date = selectedDate ? new Date(selectedDate) : new Date();
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // 获取当天的所有事件
  const getDayEvents = () => {
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const icalDate = dateString.replace(/-/g, '');
    
    return events.filter(event => {
      // 检查日期部分是否匹配（支持 DATE 和 DATE-TIME 格式）
      const eventDatePart = event.dtstart.substring(0, 8);
      return eventDatePart === icalDate;
    });
  };

  const dayEvents = getDayEvents();
  const isToday = new Date().toDateString() === date.toDateString();
  
  // 分类事件
  const subscribedEvents = dayEvents.filter(e => e.isSubscribed);
  const regularEvents = dayEvents.filter(e => !e.isSubscribed);
  
  // 检查是否为节假日
  const isHoliday = subscribedEvents.some(e => 
    e.subscriptionId && e.subscriptionId.includes('holiday')
  );
  
  // 检查是否为周末
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return (
    <View style={[styles.container, { backgroundColor: theme?.card || '#fff' }]}>
      {/* 日期标题 */}
      <View style={[
        styles.header,
        { 
          backgroundColor: theme?.card || '#fff',
          borderBottomColor: theme?.primary || '#4A90E2'
        },
        isHoliday && { 
          backgroundColor: theme?.id === 'appleDark' ? 'rgba(255, 107, 107, 0.2)' : '#ffe6e6',
          borderBottomColor: theme?.danger || '#ff6b6b'
        },
        isWeekend && !isHoliday && { 
          backgroundColor: theme?.id === 'appleDark' ? 'rgba(0, 0, 0, 0.1)' : '#f0f8ff'
        },
      ]}>
        <Text style={[
          styles.weekdayText,
          { color: theme?.textSecondary || '#666' },
          isToday && { color: theme?.primary || '#4A90E2' },
          isHoliday && { color: theme?.danger || '#ff6b6b' },
        ]}>
          {['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()]}
          {isHoliday && ' 🎉'}
        </Text>
        <Text style={[
          styles.dateText,
          { color: theme?.text || '#333' },
          isToday && { color: theme?.primary || '#4A90E2' },
          isHoliday && { color: theme?.danger || '#ff6b6b' },
        ]}>
          {date.getFullYear()}年{date.getMonth() + 1}月{date.getDate()}日
        </Text>
        <Text style={[
          styles.lunarText,
          { color: theme?.textSecondary || '#666' },
          isToday && { color: theme?.primary || '#4A90E2' },
          isHoliday && { color: theme?.danger || '#ff6b6b' },
        ]}>
          {getLunarInfo(date).fullDisplay}
        </Text>
        {isHoliday && (
          <View style={[styles.holidayBadge, { backgroundColor: theme?.danger || '#ff6b6b' }]}>
            <Text style={styles.holidayBadgeText}>休假日</Text>
          </View>
        )}
        {dayEvents.length > 0 && (
          <View style={styles.eventSummary}>
            {subscribedEvents.length > 0 && (
              <Text style={[styles.eventCountText, { color: theme?.textSecondary || '#666' }]}>
                📅 订阅事件: {subscribedEvents.length} 个
              </Text>
            )}
            {regularEvents.length > 0 && (
              <Text style={[styles.eventCountText, { color: theme?.textSecondary || '#666' }]}>
                ✏️ 个人事件: {regularEvents.length} 个
              </Text>
            )}
          </View>
        )}
      </View>

      {/* 时间轴 */}
      <ScrollView style={styles.scrollView}>
        {hours.map(hour => (
          <View key={hour} style={styles.hourRow}>
            <View style={styles.timeColumn}>
              <Text style={styles.timeText}>{String(hour).padStart(2, '0')}:00</Text>
            </View>
            <View style={styles.eventColumn}>
              {hour === 0 && dayEvents.length > 0 && (
                <View style={styles.eventBlock}>
                  {/* 订阅事件 */}
                  {subscribedEvents.length > 0 && (
                    <View style={styles.eventSection}>
                      <Text style={[styles.sectionTitle, { color: theme?.text || '#333' }]}>
                        📅 订阅事件
                      </Text>
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
                          <View style={styles.eventHeader}>
                            <Text style={[styles.eventTitle, { color: theme?.text || '#333' }]}>
                              {event.summary}
                            </Text>
                            <View style={[
                              styles.subscriptionBadge,
                              { backgroundColor: event.subscriptionColor || theme?.accent || '#9b59b6' }
                            ]}>
                              <Text style={styles.subscriptionBadgeText}>
                                {event.subscriptionName || '订阅'}
                              </Text>
                            </View>
                          </View>
                          {event.description ? (
                            <Text style={[styles.eventDescription, { color: theme?.textSecondary || '#666' }]} numberOfLines={2}>
                              {event.description}
                            </Text>
                          ) : null}
                          <Text style={[styles.readonlyText, { color: theme?.textSecondary || '#999' }]}>
                            🔒 只读事件
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  
                  {/* 普通事件 */}
                  {regularEvents.length > 0 && (
                    <View style={styles.eventSection}>
                      <Text style={[styles.sectionTitle, { color: theme?.text || '#333' }]}>
                        ✏️ 个人事件
                      </Text>
                      {regularEvents.map(event => (
                        <TouchableOpacity
                          key={event.uid}
                          style={[
                            styles.eventItem,
                            { 
                              backgroundColor: theme?.id === 'appleDark' ? 'rgba(10, 132, 255, 0.2)' : '#f0f7ff',
                              borderLeftColor: theme?.primary || '#4A90E2'
                            }
                          ]}
                          onPress={() => onEventPress(event)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.eventHeader}>
                            <Text style={[styles.eventTitle, { color: theme?.text || '#333' }]}>
                              {event.summary}
                            </Text>
                            <View style={[styles.priorityBadge, { backgroundColor: theme?.primary || '#4A90E2' }]}>
                              <Text style={styles.priorityText}>P{event.priority}</Text>
                            </View>
                          </View>
                          {event.description ? (
                            <Text style={[styles.eventDescription, { color: theme?.textSecondary || '#666' }]} numberOfLines={2}>
                              {event.description}
                            </Text>
                          ) : null}
                          {event.location ? (
                            <Text style={[styles.eventLocation, { color: theme?.textSecondary || '#666' }]}>
                              📍 {event.location}
                            </Text>
                          ) : null}
                          <Text style={[styles.eventStatus, { color: theme?.success || '#28a745' }]}>
                            状态: {event.status}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {dayEvents.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>📅</Text>
          <Text style={[styles.emptyMessage, { color: theme?.textSecondary || '#999' }]}>
            今天没有安排事件
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 2,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  lunarText: {
    fontSize: 14,
    marginTop: 4,
  },
  holidayBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  holidayBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  eventSummary: {
    marginTop: 12,
    gap: 4,
  },
  eventCountText: {
    fontSize: 14,
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
  timeColumn: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  eventColumn: {
    flex: 1,
    padding: 8,
    position: 'relative',
  },
  eventBlock: {
    gap: 16,
  },
  eventSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventItem: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  subscribedEvent: {
  },
  subscriptionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subscriptionBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  readonlyText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  eventDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    marginBottom: 4,
  },
  eventStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyMessage: {
    fontSize: 16,
  },
});
