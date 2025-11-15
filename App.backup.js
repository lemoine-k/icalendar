import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [selectedDate, setSelectedDate] = useState('');
  const [events, setEvents] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('');

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };

  const addEvent = () => {
    if (eventTitle.trim() && selectedDate) {
      const newEvents = { ...events };
      if (!newEvents[selectedDate]) {
        newEvents[selectedDate] = [];
      }
      newEvents[selectedDate].push({
        title: eventTitle,
        time: eventTime,
        id: Date.now()
      });
      setEvents(newEvents);
      setEventTitle('');
      setEventTime('');
      setModalVisible(false);
    }
  };

  const deleteEvent = (date, eventId) => {
    const newEvents = { ...events };
    newEvents[date] = newEvents[date].filter(event => event.id !== eventId);
    if (newEvents[date].length === 0) {
      delete newEvents[date];
    }
    setEvents(newEvents);
  };

  const markedDates = {};
  Object.keys(events).forEach(date => {
    markedDates[date] = { marked: true, dotColor: '#4A90E2' };
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的日历</Text>
      </View>

      <Calendar
        style={styles.calendar}
        onDayPress={onDayPress}
        markedDates={markedDates}
        theme={{
          todayTextColor: '#4A90E2',
          selectedDayBackgroundColor: '#4A90E2',
          arrowColor: '#4A90E2',
        }}
      />

      <ScrollView style={styles.eventsList}>
        <Text style={styles.eventsTitle}>所有事件</Text>
        {Object.keys(events).length === 0 ? (
          <Text style={styles.noEvents}>暂无事件，点击日期添加</Text>
        ) : (
          Object.keys(events).sort().reverse().map(date => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateLabel}>{date}</Text>
              {events[date].map(event => (
                <View key={event.id} style={styles.eventItem}>
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    {event.time ? <Text style={styles.eventTime}>{event.time}</Text> : null}
                  </View>
                  <TouchableOpacity 
                    onPress={() => deleteEvent(date, event.id)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>删除</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>添加事件 - {selectedDate}</Text>
            
            <TextInput
              style={styles.input}
              placeholder="事件标题"
              value={eventTitle}
              onChangeText={setEventTitle}
            />
            
            <TextInput
              style={styles.input}
              placeholder="时间 (例如: 14:00)"
              value={eventTime}
              onChangeText={setEventTime}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setEventTitle('');
                  setEventTime('');
                }}
              >
                <Text style={styles.buttonText}>取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.addButton]}
                onPress={addEvent}
              >
                <Text style={[styles.buttonText, styles.addButtonText]}>添加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  calendar: {
    marginBottom: 10,
  },
  eventsList: {
    flex: 1,
    padding: 15,
  },
  eventsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  noEvents: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 16,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 8,
  },
  eventItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
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
    backgroundColor: '#ddd',
  },
  addButton: {
    backgroundColor: '#4A90E2',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  addButtonText: {
    color: '#fff',
  },
});
