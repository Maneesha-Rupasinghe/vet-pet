import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Snackbar } from 'react-native-paper';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth } from '@/app/firebase/firebase';

interface Appointment {
  id: string; // Firestore document ID
  from: string; // User ID of the pet owner
  to: string; // Vet ID (matches current user's UID)
  date: string; // Appointment date (YYYY-MM-DD)
  time: string; // Appointment time (HH:MM)
  pet: string; // Pet name
  status: 'pending' | 'accepted' | 'rejected'; // Appointment status
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

  // Check if Calendar is available
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

  // Fetch accepted appointments where 'to' matches vet's UID
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
          dotColor: '#16a34a', // Green dot for accepted appointments
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
    <View className="flex-1 bg-gray-100 p-5">
      <Text className="text-2xl font-bold text-gray-800 mb-5">
        Accepted Appointments Calendar
      </Text>

      {/* Calendar */}
      {calendarError ? (
        <Text className="text-base text-red-600">
          Calendar unavailable. Please check your setup or select a date manually.
        </Text>
      ) : (
        <View className="mb-4">
          <Calendar
            onDayPress={handleDayPress}
            markedDates={markedDates}
            theme={{
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#4b5563',
              selectedDayBackgroundColor: '#2563eb',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#16a34a',
              dayTextColor: '#1f2937',
              textDisabledColor: '#d1d5db',
              arrowColor: '#2563eb',
            }}
            style={{ borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' }}
          />
        </View>
      )}

      {/* Selected Date Appointments */}
      {selectedDate ? (
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-800 mb-2">
            Appointments on {selectedDate}
          </Text>
          {selectedAppointments.length === 0 ? (
            <Text className="text-base text-gray-600">
              No accepted appointments on this day.
            </Text>
          ) : (
            <ScrollView>
              {selectedAppointments.map((appointment) => (
                <View
                  key={appointment.id}
                  className="mb-4 p-4 bg-white rounded-lg border border-gray-300"
                >
                  <Text className="text-lg font-semibold text-gray-800">
                    Pet: {appointment.pet}
                  </Text>
                  <Text className="text-base text-gray-600">
                    Time: {appointment.time}
                  </Text>
                  <Text className="text-base text-gray-600">
                    Status: {appointment.status}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      ) : (
        <Text className="text-base text-gray-600">
          Select a date to view appointments.
        </Text>
      )}

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={Snackbar.DURATION_SHORT}
        style={{ backgroundColor: snackbarType === 'success' ? '#16a34a' : '#dc2626' }}
      >
        <Text className="text-white">{snackbarMessage}</Text>
      </Snackbar>
    </View>
  );
};

export default VetCalendar;
