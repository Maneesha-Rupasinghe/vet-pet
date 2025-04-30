import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth } from '@/app/firebase/firebase';
import * as Notifications from 'expo-notifications';

interface Appointment {
  id: string; // Firestore document ID
  from: string; // User ID of the pet owner
  to: string; // Vet ID (matches current user's UID)
  date: string; // Appointment date (YYYY-MM-DD)
  time: string; // Appointment time (HH:MM)
  pet: string; // Pet name
  status: 'pending' | 'accepted' | 'rejected'; // Appointment status
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
        identifier: `${appointment.id}-24hours`, // Unique identifier for this notification
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

    // Schedule notification  5 min 
    const trigger5Min = new Date(appointmentDate.getTime() - 5 * 60 * 1000);
    if (trigger5Min > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Upcoming Appointment Reminder',
          body: `Appointment with ${appointment.pet} in 5 min on ${appointment.date} at ${appointment.time}`,
          data: { appointmentId: appointment.id },
        },
        trigger: trigger5Min,
        identifier: `${appointment.id}-1hour`, // Unique identifier for this notification
      });
      console.log(`Scheduled 1-hour notification for appointment ${appointment.id} at ${trigger5Min}`);
    }
  };

  // Filter upcoming appointments (within next 7 days for display)
  const upcomingAppointments = appointments.filter((appointment) => {
    const [year, month, day] = appointment.date.split('-').map(Number);
    const [hour, minute] = appointment.time.split(':').map(Number);
    const appointmentDate = new Date(year, month - 1, day, hour, minute); // Include time
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return appointmentDate >= now && appointmentDate <= oneWeekFromNow;
  });

  return (
    <View className="flex-1 bg-gray-100 p-5">
      <Text className="text-2xl font-bold text-gray-800 mb-5">
        Appointment Reminders
      </Text>

      {/* Upcoming Appointments */}
      <View className="flex-1">
        <Text className="text-lg font-semibold text-gray-800 mb-2">
          Upcoming Appointments (Next 7 Days)
        </Text>
        {upcomingAppointments.length === 0 ? (
          <Text className="text-base text-gray-600">
            No upcoming accepted appointments.
          </Text>
        ) : (
          <ScrollView>
            {upcomingAppointments.map((appointment) => (
              <View
                key={appointment.id}
                className="mb-4 p-4 bg-white rounded-lg border border-gray-300"
              >
                <Text className="text-lg font-semibold text-gray-800">
                  Pet: {appointment.pet}
                </Text>
                <Text className="text-base text-gray-600">
                  Date: {appointment.date}
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

export default VetReminders;