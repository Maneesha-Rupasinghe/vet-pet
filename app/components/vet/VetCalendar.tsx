import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Snackbar } from 'react-native-paper';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth } from '@/app/firebase/firebase';

interface Appointment {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  pet: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface MarkedDates {
  [key: string]: { marked: boolean; dotColor: string };
}

const VetCalendar: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [snackbarVisible, setSnackbarVisible] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');
  const [calendarError, setCalendarError] = useState<boolean>(false);

  const firestore = getFirestore();
  const vetId = auth.currentUser?.uid;


  useEffect(() => {
    try {
      require('react-native-calendars');
    } catch (e) {
      setCalendarError(true);
      setSnackbarMessage('Calendar component unavailable. Please check your setup.');
      setSnackbarType('error');
      setSnackbarVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!vetId) {
      setSnackbarMessage('User not authenticated.');
      setSnackbarType('error');
      setSnackbarVisible(true);
      return;
    }

    const appointmentsQuery = query(
      collection(firestore, 'appointments'),
      where('to', '==', vetId),
      where('status', '==', 'accepted')
    );

    const unsubscribe = onSnapshot(appointmentsQuery, (snapshot) => {
      const fetchedAppointments: Appointment[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        from: doc.data().from,
        to: doc.data().to,
        date: doc.data().date,
        time: doc.data().time,
        pet: doc.data().pet,
        status: doc.data().status,
      }));

      setAppointments(fetchedAppointments);

      // Mark dates with appointments
      const newMarkedDates: MarkedDates = {};
      fetchedAppointments.forEach((appointment) => {
        newMarkedDates[appointment.date] = {
          marked: true,
          dotColor: '#28a745', 
        };
      });
      setMarkedDates(newMarkedDates);
    }, (error) => {
      setSnackbarMessage('Failed to fetch appointments.');
      setSnackbarType('error');
      setSnackbarVisible(true);
    });

    return () => unsubscribe();
  }, [vetId]);

  // Handle day press to show appointments for that day
  const handleDayPress = (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
  };

  // Filter appointments for the selected date
  const selectedAppointments = appointments.filter(
    (appointment) => appointment.date === selectedDate
  );

  return (
    <View style={{ flex: 1, padding: 10 }} className="bg-[#FBF8EF]">
      <Text className="text-2xl font-extrabold text-[#3E4241] mb-5">
        Accepted Appointment
      </Text>

      {/* Calendar */}
      {calendarError ? (
        <Text style={{ fontSize: 16, color: '#ff4444', marginHorizontal: 8 }}>
          Calendar unavailable. Please check your setup or select a date manually.
        </Text>
      ) : (
        <View style={{ marginBottom: 15 }}>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={markedDates}
            theme={{
              calendarBackground: '#FFF',
              textSectionTitleColor: '#3E4241',
              selectedDayBackgroundColor: '#3674B5',
              selectedDayTextColor: '#FFF',
              todayTextColor: '#3674B5',
              dayTextColor: '#3E4241',
              textDisabledColor: '#D1D5DB',
              arrowColor: '#3674B5',
            }}
            style={{ borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB' }}
          />
        </View>
      )}

      {/* Selected Date Appointments */}
      {selectedDate ? (
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#3E4241', marginBottom: 10, marginHorizontal: 8 }}>
            Appointments on {selectedDate}
          </Text>
          {selectedAppointments.length === 0 ? (
            <Text style={{ fontSize: 16, color: '#3E4241', marginHorizontal: 8 }}>
              No accepted appointments on this day.
            </Text>
          ) : (
            <ScrollView>
              {selectedAppointments.map((appointment) => (
                <View
                  key={appointment.id}
                  style={{
                    backgroundColor: '#FFF',
                    borderRadius: 12,
                    padding: 12,
                    marginVertical: 8,
                    marginHorizontal: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#3E4241' }}>
                    Pet: {appointment.pet}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                    Time: {appointment.time}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                    Status: {appointment.status}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      ) : (
        <Text style={{ fontSize: 16, color: '#3E4241', marginHorizontal: 8 }}>
          Select a date to view appointments.
        </Text>
      )}

      {/* Snackbar */}
      <View className="absolute bottom-5 left-0 right-0">
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={Snackbar.DURATION_SHORT}
          style={{
            backgroundColor: snackbarType === 'success' ? 'green' : 'red',
            borderRadius: 8,
            padding: 10,
            marginHorizontal: 10,
          }}
        >
          {snackbarMessage}
        </Snackbar>
      </View>
    </View>
  );
};

export default VetCalendar;