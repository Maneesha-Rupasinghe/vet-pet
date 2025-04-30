import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { getFirestore, collection, query, where, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Snackbar } from 'react-native-paper';
import { auth } from '@/app/firebase/firebase';
import Icon from 'react-native-vector-icons/Feather';

const defaultImage = require('../../../assets/images/login.jpg'); // Placeholder image

interface Appointment {
    id: string;
    from: string;
    to: string;
    date: string;
    time: string;
    pet: string;
    status: 'pending' | 'accepted' | 'rejected' | 'deleted';
}

const VetList = ({ navigation }: any) => {
    const [vets, setVets] = useState<any[]>([]); // List of vets
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');
    const [expandedVet, setExpandedVet] = useState<any | null>(null); // Track the vet whose details are expanded
    const [previousAppointments, setPreviousAppointments] = useState<Appointment[]>([]); // Previous appointments
    const [isExpanded, setIsExpanded] = useState<boolean>(false); // For collapsible section
    const firestore = getFirestore();

    // Fetch vets
    useEffect(() => {
        const fetchVets = async () => {
            try {
                const vetsQuery = query(collection(firestore, 'users'), where('role', '==', 'vet'));
                const vetDocs = await getDocs(vetsQuery);

                if (vetDocs.empty) {
                    setSnackbarMessage('No vets found.');
                    setSnackbarType('error');
                    setSnackbarVisible(true);
                }

                const vetList = vetDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setVets(vetList);
            } catch (error) {
                setSnackbarMessage('Error fetching vet data.');
                setSnackbarType('error');
                setSnackbarVisible(true);
            }
        };

        fetchVets();
    }, []);

    // Fetch previous appointments
    useEffect(() => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setSnackbarMessage('User not authenticated.');
            setSnackbarType('error');
            setSnackbarVisible(true);
            return;
        }

        const appointmentsQuery = query(
            collection(firestore, 'appointments'),
            where('from', '==', userId)
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
            setPreviousAppointments(fetchedAppointments);
        }, (error) => {
            setSnackbarMessage('Failed to fetch previous appointments.');
            setSnackbarType('error');
            setSnackbarVisible(true);
        });

        return () => unsubscribe();
    }, []);

    // Function to mark an appointment as deleted
    const handleDeleteAppointment = async (appointmentId: string) => {
        try {
            const appointmentRef = doc(firestore, 'appointments', appointmentId);
            await updateDoc(appointmentRef, { status: 'deleted' });

            setSnackbarMessage('Appointment marked as deleted.');
            setSnackbarType('success');
            setSnackbarVisible(true);
        } catch (error) {
            setSnackbarMessage('Failed to delete appointment.');
            setSnackbarType('error');
            setSnackbarVisible(true);
        }
    };

    const handleSeeMore = (vet: any) => {
        if (expandedVet && expandedVet.id === vet.id) {
            setExpandedVet(null); // Close details if clicked again
        } else {
            setExpandedVet(vet); // Open details for the selected vet
        }
    };

    const handleContinue = (vet: any) => {
        console.log('Continue button pressed for vet:', vet.id, vet.name);
        console.log('Current navigation state:', navigation.getState());
        console.log('Available routes:', navigation.getState()?.routeNames);

        try {
            navigation.navigate('AppointmentRequest', { vetId: vet.id, vetName: vet.name });
            console.log('Navigation to AppointmentRequest attempted');
        } catch (error) {
            console.error('Navigation error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setSnackbarMessage('Navigation failed: ' + errorMessage);
            setSnackbarType('error');
            setSnackbarVisible(true);
        }
    };

    const renderVetCard = (vet: any) => {
        return (
            <TouchableOpacity
                key={vet.id}
                className="bg-white rounded-lg p-4 mb-4 shadow-lg items-center"
                style={{ width: '100%' }}
            >
                {/* Image with size constraints and object-contain */}
                <Image
                    source={defaultImage}
                    className="w-24 h-24 rounded-full object-contain mb-2"
                    style={{ width: 96, height: 96 }}
                />
                <Text className="text-lg font-semibold">{vet.name}</Text>
                <Text>{vet.contact}</Text>
                <Text>{vet.location}</Text>

                {/* See More button */}
                <TouchableOpacity
                    className="mt-2 py-2 px-4 bg-blue-500 rounded-full"
                    onPress={() => handleSeeMore(vet)}
                >
                    <Text className="text-white text-sm">{expandedVet && expandedVet.id === vet.id ? 'Show Less' : 'See More'}</Text>
                </TouchableOpacity>

                {/* Conditionally show additional details when "See More" is clicked */}
                {expandedVet && expandedVet.id === vet.id && (
                    <View className="mt-2">
                        <Text className="text-sm">
                            Services: {vet.services && vet.services.length > 0 ? vet.services.join(', ') : 'No services listed'}
                        </Text>
                        <Text className="text-sm">Operating Hours: {vet.workingHours || 'Not available'}</Text>
                        <Text className="text-sm">Contact No: {vet.contactNo || 'Not available'}</Text>
                        <Text className="text-sm">Registration No: {vet.vetRegNo || 'Not available'}</Text>
                    </View>
                )}

                {/* Continue Button */}
                <TouchableOpacity
                    className="mt-2 py-2 px-4 bg-green-500 rounded-full"
                    onPress={() => handleContinue(vet)}
                >
                    <Text className="text-white text-sm">Continue</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Previous Appointments Section */}
            <View className="mb-5">
                <TouchableOpacity
                    onPress={() => setIsExpanded(!isExpanded)}
                    className="flex-row justify-between items-center bg-blue-500 p-3 rounded-lg"
                >
                    <Text className="text-white text-lg font-semibold">
                        Previous Appointments
                    </Text>
                    <Icon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={24}
                        color="white"
                    />
                </TouchableOpacity>

                {isExpanded && (
                    <View className="mt-2">
                        {previousAppointments.length === 0 ? (
                            <Text className="text-base text-gray-600">
                                No previous appointments found.
                            </Text>
                        ) : (
                            <ScrollView
                                nestedScrollEnabled={true}
                                className="max-h-40 border border-gray-300 rounded-lg"
                                contentContainerStyle={{ paddingVertical: 5 }}
                            >
                                {previousAppointments.map((appointment) => (
                                    <View
                                        key={appointment.id}
                                        className="flex-row justify-between items-center mb-2 mx-3 p-3 bg-white rounded-lg border border-gray-200"
                                    >
                                        <View>
                                            <Text className="text-base font-semibold text-gray-800">
                                                Pet: {appointment.pet}
                                            </Text>
                                            <Text className="text-sm text-gray-600">
                                                Date: {appointment.date}
                                            </Text>
                                            <Text className="text-sm text-gray-600">
                                                Time: {appointment.time}
                                            </Text>
                                            <Text className="text-sm text-gray-600">
                                                Status: {appointment.status}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteAppointment(appointment.id)}
                                            className="bg-red-500 rounded-lg p-2"
                                            disabled={appointment.status === 'deleted'} // Disable if already deleted
                                        >
                                            <Text className="text-white text-sm">
                                                {appointment.status === 'deleted' ? 'Deleted' : 'Delete'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                )}
            </View>

            {/* Existing Vet List Content */}
            <Text className="text-2xl font-bold">List of Vets</Text>

            {/* Scrollable vet cards */}
            <View className="mt-4">
                {vets.length > 0 ? (
                    vets.map((vet) => renderVetCard(vet))
                ) : (
                    <Text>No vets found</Text>
                )}
            </View>

            {/* Snackbar for displaying success or error messages */}
            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
                duration={Snackbar.DURATION_SHORT}
                style={{
                    backgroundColor: snackbarType === 'success' ? 'green' : 'red',
                }}
            >
                {snackbarMessage}
            </Snackbar>
        </ScrollView>
    );
};

export default VetList;