import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Snackbar } from 'react-native-paper';
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
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

const VetAppointments: React.FC = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [snackbarVisible, setSnackbarVisible] = useState<boolean>(false);
    const [snackbarMessage, setSnackbarMessage] = useState<string>('');
    const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');
    const [hasFetchedData, setHasFetchedData] = useState<boolean>(false);
    const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);

    const firestore = getFirestore();
    const vetId = auth.currentUser?.uid;

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
            where('status', 'in', ['pending', 'accepted', 'rejected']) 
        );

        const unsubscribe = onSnapshot(
            appointmentsQuery,
            (snapshot) => {
                const fetchedAppointments: Appointment[] = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Appointment[];
                setAppointments(fetchedAppointments);
                setHasFetchedData(true); 

         
                if (errorTimeout) {
                    clearTimeout(errorTimeout);
                    setErrorTimeout(null);
                }
            },
            (error) => {
                console.error('Firestore onSnapshot error:', error.message); 
             
                const timeout = setTimeout(() => {
                    if (!hasFetchedData) {
                        setSnackbarMessage('Failed to fetch appointments.');
                        setSnackbarType('error');
                        setSnackbarVisible(true);
                    }
                }, 5000);
                setErrorTimeout(timeout);
            }
        );

        return () => {
            unsubscribe();
            if (errorTimeout) clearTimeout(errorTimeout);
        };
    }, [vetId]);


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
        <View style={{ flex: 1, padding: 10 }} className="bg-[#FBF8EF]">
            <Text className="text-2xl font-extrabold text-[#3E4241] mb-5">
                My Appointment
            </Text>

            {appointments.length === 0 ? (
                <Text style={{ fontSize: 16, color: '#3E4241', marginHorizontal: 8 }}>
                    No appointments found.
                </Text>
            ) : (
                <ScrollView>
                    {appointments.map((appointment) => (
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

                            {/* Status Picker */}
                            <View style={{ marginTop: 10 }}>
                                <Text style={{ fontSize: 14, fontWeight: '500', color: '#3E4241', marginBottom: 5 }}>
                                    Change Status
                                </Text>
                                <View style={{
                                    borderWidth: 1,
                                    borderColor: '#D1D5DB',
                                    borderRadius: 8,
                                    backgroundColor: '#F9FAFB',
                                }}>
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

export default VetAppointments;