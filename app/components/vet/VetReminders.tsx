import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth } from '@/app/firebase/firebase';
import * as Notifications from 'expo-notifications';

interface Appointment {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  pet: string;
  status: 'pending' | 'accepted' | 'rejected';
}

const VetReminders: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [snackbarVisible, setSnackbarVisible] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

  const firestore = getFirestore();
  const vetId = auth.currentUser?.uid;

  // Request notification permissions and set up handler
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        setSnackbarMessage('Notification permissions denied.');
        setSnackbarType('error');
        setSnackbarVisible(true);
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('appointments', {
          name: 'Appointment Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // Set up notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    };

    requestPermissions();
  }, []);

  // Fetch accepted appointments and schedule notifications
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

      // Schedule notifications for upcoming appointments
      fetchedAppointments.forEach((appointment) => {
        scheduleNotification(appointment);
      });
    }, (error) => {
      setSnackbarMessage('Failed to fetch appointments.');
      setSnackbarType('error');
      setSnackbarVisible(true);
    });

    return () => unsubscribe();
  }, [vetId]);

  // Schedule a notification for an appointment
  const scheduleNotification = async (appointment: Appointment) => {
    // Cancel any existing notifications for this appointment to avoid duplicates
    await Notifications.cancelScheduledNotificationAsync(`${appointment.id}-24hours`);
    await Notifications.cancelScheduledNotificationAsync(`${appointment.id}-1hour`);

    const [year, month, day] = appointment.date.split('-').map(Number);
    const [hour, minute] = appointment.time.split(':').map(Number);
    const appointmentDate = new Date(year, month - 1, day, hour, minute);

    // Schedule notification 24 hours before
    const trigger24Hours = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);
    if (trigger24Hours > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Upcoming Appointment Reminder',
          body: `Appointment with ${appointment.pet} on ${appointment.date} at ${appointment.time}`,
          data: { appointmentId: appointment.id },
        },
        trigger: trigger24Hours,
        identifier: `${appointment.id}-24hours`,
      });
      console.log(`Scheduled 24-hour notification for appointment ${appointment.id} at ${trigger24Hours}`);
    }

    // Schedule notification 1 hour before
    const trigger1Hour = new Date(appointmentDate.getTime() - 5 * 60 * 1000);
    if (trigger1Hour > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Upcoming Appointment Reminder',
          body: `Appointment for ${appointment.pet} in 1 hour on ${appointment.date} at ${appointment.time}`,
          data: { appointmentId: appointment.id },
        },
        trigger: trigger1Hour,
        identifier: `${appointment.id}-1hour`,
      });
      console.log(`Scheduled 1-hour notification for appointment ${appointment.id} at ${trigger1Hour}`);
    }

    // Schedule notification 5 min 
    const trigger5Min = new Date(appointmentDate.getTime() - 5 * 60 * 1000);
    if (trigger5Min > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Upcoming Appointment Reminder',
          body: `Appointment with ${appointment.pet} in 5 min on ${appointment.date} at ${appointment.time}`,
          data: { appointmentId: appointment.id },
        },
        trigger: trigger5Min,
        identifier: `${appointment.id}-1hour`,
      });
      console.log(`Scheduled 1-hour notification for appointment ${appointment.id} at ${trigger5Min}`);
    }
  };

  // Filter upcoming appointments (within next 7 days for display)
  const upcomingAppointments = appointments.filter((appointment) => {
    const [year, month, day] = appointment.date.split('-').map(Number);
    const [hour, minute] = appointment.time.split(':').map(Number);
    const appointmentDate = new Date(year, month - 1, day, hour, minute);
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return appointmentDate >= now && appointmentDate <= oneWeekFromNow;
  });

  return (
    <View style={{ flex: 1, padding: 10 }} className="bg-[#FBF8EF]">
            <Text className="text-2xl font-extrabold text-[#3E4241] mb-5">
                Appointment Reminders
            </Text>

      {/* Upcoming Appointments */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#3E4241', marginBottom: 10, marginHorizontal: 8 }}>
          Upcoming Appointments (Next 7 Days)
        </Text>
        {upcomingAppointments.length === 0 ? (
          <Text style={{ fontSize: 16, color: '#3E4241', marginHorizontal: 8 }}>
            No upcoming accepted appointments.
          </Text>
        ) : (
          <ScrollView>
            {upcomingAppointments.map((appointment) => (
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
                  Date: {appointment.date}
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
            marginBottom: 10,
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 14 }}>{snackbarMessage}</Text>
        </Snackbar>
      </View>
    </View>
  );
};

export default VetReminders;