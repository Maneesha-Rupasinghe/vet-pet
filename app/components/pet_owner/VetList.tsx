import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { getFirestore, collection, query, where, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Snackbar } from 'react-native-paper';
import { auth } from '@/app/firebase/firebase';
import Icon from 'react-native-vector-icons/Feather';

const defaultImage = require('../../../assets/images/login.jpg'); 

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
                className="bg-white rounded-xl p-5 mb-4 shadow-md items-center border border-gray-200"
                style={{ width: '100%' }}
            >
                {/* Image with size constraints and object-contain */}
                <Image
                    source={defaultImage}
                    className="w-28 h-28 rounded-full object-cover mb-3 border-2 border-gray-200"
                    style={{ width: 112, height: 112 }}
                />
                <Text className="text-xl font-bold text-[#3E4241] mb-1">{vet.name}</Text>
                <Text className="text-base text-gray-600">{vet.contact}</Text>
                <Text className="text-base text-gray-600">{vet.location}</Text>

                {/* See More button */}
                <TouchableOpacity
                    className="mt-3 py-2 px-5 bg-[#3674B5] rounded-full shadow-sm"
                    onPress={() => handleSeeMore(vet)}
                >
                    <Text className="text-white text-base font-semibold">
                        {expandedVet && expandedVet.id === vet.id ? 'Show Less' : 'See More'}
                    </Text>
                </TouchableOpacity>

                {/* Conditionally show additional details when "See More" is clicked */}
                {expandedVet && expandedVet.id === vet.id && (
                    <View className="mt-3 w-full">
                        <Text className="text-base text-gray-700">
                            <Text className="font-semibold">Services: </Text>
                            {vet.services && vet.services.length > 0 ? vet.services.join(', ') : 'No services listed'}
                        </Text>
                        <Text className="text-base text-gray-700 mt-1">
                            <Text className="font-semibold">Operating Hours: </Text>
                            {vet.workingHours || 'Not available'}
                        </Text>
                        <Text className="text-base text-gray-700 mt-1">
                            <Text className="font-semibold">Contact No: </Text>
                            {vet.contactNo || 'Not available'}
                        </Text>
                        <Text className="text-base text-gray-700 mt-1">
                            <Text className="font-semibold">Registration No: </Text>
                            {vet.vetRegNo || 'Not available'}
                        </Text>
                    </View>
                )}

                {/* Continue Button */}
                <TouchableOpacity
                    className="mt-4 py-2 px-5 bg-[#28a745] rounded-full shadow-sm"
                    onPress={() => handleContinue(vet)}
                >
                    <Text className="text-white text-base font-semibold">Continue</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <>
            <ScrollView contentContainerStyle={{ padding: 20 }} style={{ backgroundColor: '#FBF8EF' }}>
                {/* Previous Appointments Section */}
                <View className="mb-6">
                    <TouchableOpacity
                        onPress={() => setIsExpanded(!isExpanded)}
                        className="flex-row justify-between items-center bg-[#3674B5] p-4 rounded-xl shadow-md"
                    >
                        <Text className="text-white text-xl font-bold">
                            Previous Appointments
                        </Text>
                        <Icon
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={24}
                            color="white"
                        />
                    </TouchableOpacity>

                    {isExpanded && (
                        <View className="mt-3 bg-white rounded-xl p-4 shadow-md border border-gray-200">
                            {previousAppointments.length === 0 ? (
                                <Text className="text-base text-gray-600">
                                    No previous appointments found.
                                </Text>
                            ) : (
                                <ScrollView
                                    nestedScrollEnabled={true}
                                    className="max-h-48"
                                    contentContainerStyle={{ paddingVertical: 5 }}
                                >
                                    {previousAppointments.map((appointment) => (
                                        <View
                                            key={appointment.id}
                                            className="flex-row justify-between items-center mb-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                                        >
                                            <View>
                                                <Text className="text-base font-semibold text-[#3E4241]">
                                                    Pet: {appointment.pet}
                                                </Text>
                                                <Text className="text-sm text-gray-600 mt-1">
                                                    Date: {appointment.date}
                                                </Text>
                                                <Text className="text-sm text-gray-600 mt-1">
                                                    Time: {appointment.time}
                                                </Text>
                                                <Text className="text-sm text-gray-600 mt-1">
                                                    Status: {appointment.status}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteAppointment(appointment.id)}
                                                className={`py-2 px-4 rounded-lg shadow-sm ${appointment.status === 'deleted' ? 'bg-gray-400' : 'bg-[#ff4444]'}`}
                                                disabled={appointment.status === 'deleted'}
                                            >
                                                <Text className="text-white text-sm font-semibold">
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
                <Text className="text-3xl font-extrabold text-[#3E4241] mb-5">List of Vets</Text>

                {/* Scrollable vet cards */}
                <View className="mt-2">
                    {vets.length > 0 ? (
                        vets.map((vet) => renderVetCard(vet))
                    ) : (
                        <Text className="text-base text-gray-600">No vets found</Text>
                    )}
                </View>

                {/* Snackbar for displaying success or error messages */}
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
            </ScrollView>
        </>
    );
};

export default VetList;