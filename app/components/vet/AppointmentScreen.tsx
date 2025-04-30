import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Snackbar } from 'react-native-paper';
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
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

const VetAppointments: React.FC = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [snackbarVisible, setSnackbarVisible] = useState<boolean>(false);
    const [snackbarMessage, setSnackbarMessage] = useState<string>('');
    const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

    const firestore = getFirestore();
    const vetId = auth.currentUser?.uid;

    // Fetch appointments where 'to' matches vet's UID
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
            where('status','!=','deleted')
        );

        const unsubscribe = onSnapshot(appointmentsQuery, (snapshot) => {
            const fetchedAppointments: Appointment[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Appointment[];
            setAppointments(fetchedAppointments);
        }, (error) => {
            setSnackbarMessage('Failed to fetch appointments.');
            setSnackbarType('error');
            setSnackbarVisible(true);
        });

        return () => unsubscribe();
    }, [vetId]);

    // Update appointment status
    const handleStatusChange = async (appointmentId: string, newStatus: string) => {
        try {
            const appointmentRef = doc(firestore, 'appointments', appointmentId);
            await updateDoc(appointmentRef, { status: newStatus });

            setSnackbarMessage(`Appointment ${newStatus} successfully!`);
            setSnackbarType('success');
            setSnackbarVisible(true);
        } catch (error) {
            setSnackbarMessage('Failed to update appointment status.');
            setSnackbarType('error');
            setSnackbarVisible(true);
        }
    };

    return (
        <View className="flex-1 bg-gray-100 p-5">
            <Text className="text-2xl font-bold text-gray-800 mb-5">
                My Appointments
            </Text>

            {appointments.length === 0 ? (
                <Text className="text-lg text-gray-600">No appointments found.</Text>
            ) : (
                <ScrollView>
                    {appointments.map((appointment) => (
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

                            {/* Status Picker */}
                            <View className="mt-2">
                                <Text className="text-base text-gray-600 mb-1">Change Status</Text>
                                <View className="border border-gray-300 rounded-lg bg-white">
                                    <Picker
                                        selectedValue={appointment.status}
                                        onValueChange={(itemValue) =>
                                            handleStatusChange(appointment.id, itemValue)
                                        }
                                        style={{ height: 48 }}
                                    >
                                        <Picker.Item label="Pending" value="pending" />
                                        <Picker.Item label="Accepted" value="accepted" />
                                        <Picker.Item label="Rejected" value="rejected" />
                                    </Picker>
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>
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

export default VetAppointments;