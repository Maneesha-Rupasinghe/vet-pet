import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRoute } from '@react-navigation/native';
import { getFirestore, doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { Snackbar } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth } from '@/app/firebase/firebase';
import { useRouter } from 'expo-router';

interface RouteParams {
  vetId: string;
  vetName: string;
}

interface Pet {
  name: string;
}

const AppointmentRequest: React.FC = () => {
  const route = useRoute();
  const exporouter=useRouter();
  const { vetId, vetName } = route.params as RouteParams;

  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);
  const [appointmentTime, setAppointmentTime] = useState<Date | null>(null);
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [pets, setPets] = useState<Pet[]>([]);
  const [snackbarVisible, setSnackbarVisible] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [pickerError, setPickerError] = useState<boolean>(false);
  const [dateInput, setDateInput] = useState<string>('');
  const [timeInput, setTimeInput] = useState<string>('');

  const firestore = getFirestore();

  useEffect(() => {
    const fetchUserPets = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) throw new Error('User not authenticated');

        const userDocRef = doc(firestore, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setPets(userDoc.data()?.pets || []);
        }
      } catch (error) {
        setSnackbarMessage('Failed to fetch pets.');
        setSnackbarType('error');
        setSnackbarVisible(true);
      }
    };

    fetchUserPets();
  }, []);

  // Check if DateTimePicker is available
  useEffect(() => {
    try {
      require('@react-native-community/datetimepicker');
    } catch (e) {
      setPickerError(true);
      setSnackbarMessage('Date/Time picker unavailable. Use manual input (YYYY-MM-DD, HH:MM).');
      setSnackbarType('error');
      setSnackbarVisible(true);
    }
  }, []);

  const handleSendRequest = async () => {
    let finalDate: Date | null = appointmentDate;
    let finalTime: Date | null = appointmentTime;

    if (pickerError) {
      if (!dateInput || !timeInput || !selectedPet) {
        setSnackbarMessage('Please fill in all fields.');
        setSnackbarType('error');
        setSnackbarVisible(true);
        return;
      }

      // Validate manual input
      try {
        finalDate = new Date(dateInput);
        if (isNaN(finalDate.getTime())) throw new Error('Invalid date');
        finalTime = new Date(`1970-01-01T${timeInput}:00`);
        if (isNaN(finalTime.getTime())) throw new Error('Invalid time');
      } catch (error) {
        setSnackbarMessage('Invalid date (YYYY-MM-DD) or time (HH:MM) format.');
        setSnackbarType('error');
        setSnackbarVisible(true);
        return;
      }
    } else if (!appointmentDate || !appointmentTime || !selectedPet) {
      setSnackbarMessage('Please fill in all fields.');
      setSnackbarType('error');
      setSnackbarVisible(true);
      return;
    }

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      const appointmentRef = collection(firestore, 'appointments');
      await addDoc(appointmentRef, {
        from: userId,
        to: vetId,
        date: pickerError ? dateInput : finalDate!.toISOString().split('T')[0],
        time: pickerError ? timeInput : finalTime!.toTimeString().slice(0, 5),
        pet: selectedPet,
        status: 'pending',
      });

      setSnackbarMessage('Appointment request sent successfully!');
      setSnackbarType('success');
      setSnackbarVisible(true);

      setAppointmentDate(null);
      setAppointmentTime(null);
      setSelectedPet('');
      setDateInput('');
      setTimeInput('');
      exporouter.replace('/screens/OwnerHome')
      
    } catch (error) {
      setSnackbarMessage('Failed to send appointment request.');
      setSnackbarType('error');
      setSnackbarVisible(true);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false); 
    if (selectedDate) setAppointmentDate(selectedDate);
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false); 
    if (selectedTime) setAppointmentTime(selectedTime);
  };

  const formatDate = (date: Date | null) => {
    return date ? date.toISOString().split('T')[0] : 'Select Date';
  };

  const formatTime = (time: Date | null) => {
    return time ? time.toTimeString().slice(0, 5) : 'Select Time';
  };

  return (
    <View className="flex-1 bg-gray-100 p-5">
      <Text className="text-2xl font-bold text-gray-800 mb-5">
        Request Appointment with {vetName}
      </Text>

      {/* Vet Name */}
      <View className="mb-4">
        <Text className="text-lg text-gray-600 mb-1">Doctor</Text>
        <TextInput
          value={vetName}
          className="border border-gray-300 rounded-lg p-3 bg-white text-gray-800"
          editable={false}
        />
      </View>

      {/* Appointment Date */}
      <View className="mb-4">
        <Text className="text-lg text-gray-600 mb-1">Appointment Date</Text>
        {pickerError ? (
          <TextInput
            value={dateInput}
            onChangeText={setDateInput}
            placeholder="YYYY-MM-DD"
            className="border border-gray-300 rounded-lg p-3 bg-white text-gray-800"
          />
        ) : (
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className="border border-gray-300 rounded-lg p-3 bg-white"
          >
            <Text className="text-gray-800">{formatDate(appointmentDate)}</Text>
          </TouchableOpacity>
        )}
        {!pickerError && showDatePicker && (
          <DateTimePicker
            value={appointmentDate || new Date()}
            mode="date"
            display="calendar"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>

      {/* Appointment Time */}
      <View className="mb-4">
        <Text className="text-lg text-gray-600 mb-1">Appointment Time</Text>
        {pickerError ? (
          <TextInput
            value={timeInput}
            onChangeText={setTimeInput}
            placeholder="HH:MM"
            className="border border-gray-300 rounded-lg p-3 bg-white text-gray-800"
          />
        ) : (
          <TouchableOpacity
            onPress={() => setShowTimePicker(true)}
            className="border border-gray-300 rounded-lg p-3 bg-white"
          >
            <Text className="text-gray-800">{formatTime(appointmentTime)}</Text>
          </TouchableOpacity>
        )}
        {!pickerError && showTimePicker && (
          <DateTimePicker
            value={appointmentTime || new Date()}
            mode="time"
            display="clock"
            onChange={onTimeChange}
          />
        )}
      </View>

      {/* Select Pet */}
      <View className="mb-4">
        <Text className="text-lg text-gray-600 mb-1">Select Your Pet</Text>
        <View className="border border-gray-300 rounded-lg bg-white">
          <Picker
            selectedValue={selectedPet}
            onValueChange={(itemValue) => setSelectedPet(itemValue)}
            style={{ height: 48 }}
          >
            <Picker.Item label="Select Pet" value="" />
            {pets.map((pet, index) => (
              <Picker.Item key={index} label={pet.name} value={pet.name} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Send Request Button */}
      <TouchableOpacity
        onPress={handleSendRequest}
        className="bg-blue-600 rounded-lg p-4 mt-6"
      >
        <Text className="text-white text-center text-lg font-semibold">
          Send Appointment Request
        </Text>
      </TouchableOpacity>

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

export default AppointmentRequest;