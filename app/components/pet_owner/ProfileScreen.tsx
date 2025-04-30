import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { auth } from '../../firebase/firebase';
import { signOut } from 'firebase/auth';
import { Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

interface Pet {
  name: string;
  age: string;
  birthday: string;
  breed: string;
  nextVaccinationDate?: string; // Optional field for vaccination date (YYYY-MM-DD)
}

interface UserData {
  name: string;
  contactNo: string;
  address: string;
  pets: Pet[];
}

const ProfileScreen = () => {
  const router = useRouter();
  const firestore = getFirestore();

  const [userData, setUserData] = useState<UserData>({
    name: '',
    contactNo: '',
    address: '',
    pets: [],
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');
  
  const [petForm, setPetForm] = useState<Pet>({ name: '', age: '', birthday: '', breed: '', nextVaccinationDate: '' });
  const [petFormMode, setPetFormMode] = useState<'none' | 'add' | 'edit'>('none');
  const [editingPetIndex, setEditingPetIndex] = useState<number | null>(null);
  const [expandedPets, setExpandedPets] = useState<boolean[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user data and pets
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (userId) {
          const userDocRef = doc(firestore, 'users', userId);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data();
            const pets = data?.pets || [];
            setUserData({
              name: data?.name || '',
              contactNo: data?.contactNo || '',
              address: data?.address || '',
              pets,
            });
            setExpandedPets(new Array(pets.length).fill(false));

            // Schedule vaccination reminders for each pet
            pets.forEach((pet: Pet, index: number) => {
              if (pet.nextVaccinationDate) {
                scheduleVaccinationReminder(pet, index);
              }
            });
          }
        }
      } catch (error) {
        showSnackbar('Failed to fetch user data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Request notification permissions and set up handler
  useEffect(() => {
    const setupNotifications = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        showSnackbar('Notification permissions denied.', 'error');
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('vaccinations', {
          name: 'Vaccination Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    };

    setupNotifications();
  }, []);

  // Schedule a vaccination reminder 24 hours before the date
  const scheduleVaccinationReminder = async (pet: Pet, petIndex: number) => {
    if (!pet.nextVaccinationDate) return;

    // Cancel any existing notification for this pet to avoid duplicates
    await Notifications.cancelScheduledNotificationAsync(`vaccination-${petIndex}`);

    const [year, month, day] = pet.nextVaccinationDate.split('-').map(Number);
    const vaccinationDate = new Date(year, month - 1, day);

    // Schedule notification 24 hours before
    const trigger = new Date(vaccinationDate.getTime() - 24 * 60 * 60 * 1000);
    if (trigger > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Vaccination Reminder',
          body: `Vaccination for ${pet.name} is tomorrow on ${pet.nextVaccinationDate}`,
          data: { petIndex },
        },
        trigger,
        identifier: `vaccination-${petIndex}`,
      });
      console.log(`Scheduled vaccination reminder for ${pet.name} at ${trigger}`);
    }
  };

  const validateInputs = (data: Partial<UserData | Pet>, isPet: boolean = false) => {
    if (isPet) {
      const pet = data as Pet;
      if (!pet.name.trim()) return 'Pet name is required';
      if (!pet.age.trim() || isNaN(Number(pet.age))) return 'Valid pet age is required';
      if (!pet.breed.trim()) return 'Pet breed is required';
      // Optional validation for nextVaccinationDate
      if (pet.nextVaccinationDate && !/^\d{4}-\d{2}-\d{2}$/.test(pet.nextVaccinationDate)) {
        return 'Vaccination date must be in YYYY-MM-DD format';
      }
    } else {
      const user = data as UserData;
      if (!user.name.trim()) return 'Name is required';
      if (!user.contactNo.trim() || !/^\d{10}$/.test(user.contactNo)) return 'Valid 10-digit contact number is required';
    }
    return null;
  };

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const handleUpdateProfile = async () => {
    const validationError = validateInputs(userData);
    if (validationError) {
      showSnackbar(validationError, 'error');
      return;
    }

    setIsSubmitting(true);
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userDocRef = doc(firestore, 'users', userId);
      try {
        await updateDoc(userDocRef, {
          name: userData.name,
          contactNo: userData.contactNo,
          address: userData.address,
        });
        showSnackbar('Profile updated successfully!', 'success');
        setIsEditingProfile(false);
      } catch (error) {
        showSnackbar('Failed to update profile', 'error');
      }
    }
    setIsSubmitting(false);
  };

  const handleAddPet = async () => {
    const validationError = validateInputs(petForm, true);
    if (validationError) {
      showSnackbar(validationError, 'error');
      return;
    }

    if (userData.pets.length >= 5) {
      showSnackbar('Maximum 5 pets allowed', 'error');
      return;
    }

    setIsSubmitting(true);
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userDocRef = doc(firestore, 'users', userId);
      try {
        const newPet = { ...petForm };
        if (!newPet.nextVaccinationDate) delete newPet.nextVaccinationDate; // Remove if empty
        await updateDoc(userDocRef, {
          pets: arrayUnion(newPet),
        });
        const updatedPets = [...userData.pets, newPet];
        setUserData((prev) => ({
          ...prev,
          pets: updatedPets,
        }));
        setExpandedPets((prev) => [...prev, false]);
        // Schedule reminder for the new pet
        if (newPet.nextVaccinationDate) {
          scheduleVaccinationReminder(newPet, updatedPets.length - 1);
        }
        resetPetForm();
        showSnackbar('Pet added successfully!', 'success');
      } catch (error) {
        showSnackbar('Failed to add pet', 'error');
      }
    }
    setIsSubmitting(false);
  };

  const handleEditPet = async () => {
    if (editingPetIndex === null) return;

    const validationError = validateInputs(petForm, true);
    if (validationError) {
      showSnackbar(validationError, 'error');
      return;
    }

    setIsSubmitting(true);
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userDocRef = doc(firestore, 'users', userId);
      try {
        const updatedPets = [...userData.pets];
        const updatedPet = { ...petForm };
        if (!updatedPet.nextVaccinationDate) delete updatedPet.nextVaccinationDate; // Remove if empty
        updatedPets[editingPetIndex] = updatedPet;
        await updateDoc(userDocRef, { pets: updatedPets });
        setUserData((prev) => ({ ...prev, pets: updatedPets }));
        // Schedule reminder for the updated pet
        if (updatedPet.nextVaccinationDate) {
          scheduleVaccinationReminder(updatedPet, editingPetIndex);
        } else {
          // Cancel any existing notification if the date was removed
          await Notifications.cancelScheduledNotificationAsync(`vaccination-${editingPetIndex}`);
        }
        resetPetForm();
        showSnackbar('Pet updated successfully!', 'success');
      } catch (error) {
        showSnackbar('Failed to update pet', 'error');
      }
    }
    setIsSubmitting(false);
  };

  const handleDeletePet = async (index: number) => {
    setIsSubmitting(true);
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userDocRef = doc(firestore, 'users', userId);
      try {
        const petToRemove = userData.pets[index];
        await updateDoc(userDocRef, {
          pets: arrayRemove(petToRemove),
        });
        setUserData((prev) => ({
          ...prev,
          pets: prev.pets.filter((_, i) => i !== index),
        }));
        setExpandedPets((prev) => prev.filter((_, i) => i !== index));
        // Cancel any scheduled notification for this pet
        await Notifications.cancelScheduledNotificationAsync(`vaccination-${index}`);
        showSnackbar('Pet deleted successfully!', 'success');
      } catch (error) {
        showSnackbar('Failed to delete pet', 'error');
      }
    }
    setIsSubmitting(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showSnackbar('Logged out successfully!', 'success');
      router.replace('/screens/LoginScreen');
    } catch (error) {
      showSnackbar('Error logging out', 'error');
    }
  };

  const resetPetForm = () => {
    setPetForm({ name: '', age: '', birthday: '', breed: '', nextVaccinationDate: '' });
    setPetFormMode('none');
    setEditingPetIndex(null);
  };

  const handleChange = (field: keyof UserData, value: string) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePetChange = (field: keyof Pet, value: string) => {
    setPetForm((prev) => ({ ...prev, [field]: value }));
  };

  const togglePetDetails = (index: number) => {
    setExpandedPets((prev) => prev.map((val, i) => (i === index ? !val : val)));
  };

  const startEditingPet = (index: number) => {
    setPetForm({ ...userData.pets[index], nextVaccinationDate: userData.pets[index].nextVaccinationDate || '' });
    setPetFormMode('edit');
    setEditingPetIndex(index);
    setExpandedPets((prev) => prev.map((val, i) => (i === index ? true : val)));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Profile Screen for Pet Owners</Text>

        {isLoading ? (
          <Text>Loading...</Text>
        ) : (
          <>
            {/* Profile Fields */}
            <View style={{ marginTop: 20 }}>
              <Text>Name:</Text>
              {isEditingProfile ? (
                <TextInput
                  value={userData.name}
                  onChangeText={(text) => handleChange('name', text)}
                  placeholder="Enter your name"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
              ) : (
                <Text>{userData.name || 'No data'}</Text>
              )}
            </View>

            <View style={{ marginTop: 20 }}>
              <Text>Contact Number:</Text>
              {isEditingProfile ? (
                <TextInput
                  value={userData.contactNo}
                  onChangeText={(text) => handleChange('contactNo', text)}
                  placeholder="Enter contact number"
                  keyboardType="phone-pad"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
              ) : (
                <Text>{userData.contactNo || 'No data'}</Text>
              )}
            </View>

            <View style={{ marginTop: 20 }}>
              <Text>Address:</Text>
              {isEditingProfile ? (
                <TextInput
                  value={userData.address}
                  onChangeText={(text) => handleChange('address', text)}
                  placeholder="Enter address"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
              ) : (
                <Text>{userData.address || 'No data'}</Text>
              )}
            </View>

            {/* Profile Actions */}
            <TouchableOpacity
              onPress={isEditingProfile ? handleUpdateProfile : () => setIsEditingProfile(true)}
              style={{
                marginTop: 20,
                backgroundColor: isEditingProfile ? 'blue' : 'green',
                padding: 10,
                opacity: isSubmitting ? 0.5 : 1,
              }}
              disabled={isSubmitting}
            >
              <Text style={{ color: 'white' }}>{isEditingProfile ? 'Update Profile' : 'Edit Profile'}</Text>
            </TouchableOpacity>

            {isEditingProfile && (
              <TouchableOpacity
                onPress={() => setIsEditingProfile(false)}
                style={{ marginTop: 10, backgroundColor: 'gray', padding: 10 }}
              >
                <Text style={{ color: 'white' }}>Cancel</Text>
              </TouchableOpacity>
            )}

            {/* Pet Form */}
            {petFormMode !== 'none' && (
              <View style={{ marginTop: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                  {petFormMode === 'add' ? 'Add New Pet' : 'Edit Pet'}
                </Text>
                <Text>Pet Name</Text>
                <TextInput
                  value={petForm.name}
                  onChangeText={(text) => handlePetChange('name', text)}
                  placeholder="Enter pet's name"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
                <Text>Pet Age</Text>
                <TextInput
                  value={petForm.age}
                  onChangeText={(text) => handlePetChange('age', text)}
                  placeholder="Enter pet's age"
                  keyboardType="numeric"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
                <Text>Pet Birthday</Text>
                <TextInput
                  value={petForm.birthday}
                  onChangeText={(text) => handlePetChange('birthday', text)}
                  placeholder="Enter pet's birthday (MM/DD/YYYY)"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
                <Text>Pet Breed</Text>
                <TextInput
                  value={petForm.breed}
                  onChangeText={(text) => handlePetChange('breed', text)}
                  placeholder="Enter pet's breed"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
                <Text>Next Vaccination Date (Optional, YYYY-MM-DD)</Text>
                <TextInput
                  value={petForm.nextVaccinationDate}
                  onChangeText={(text) => handlePetChange('nextVaccinationDate', text)}
                  placeholder="Enter vaccination date (YYYY-MM-DD)"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
                
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={petFormMode === 'add' ? handleAddPet : handleEditPet}
                    style={{
                      flex: 1,
                      backgroundColor: 'green',
                      padding: 10,
                      marginRight: 5,
                      opacity: isSubmitting ? 0.5 : 1,
                    }}
                    disabled={isSubmitting}
                  >
                    <Text style={{ color: 'white' }}>{petFormMode === 'add' ? 'Save Pet' : 'Update Pet'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={resetPetForm}
                    style={{ flex: 1, backgroundColor: 'gray', padding: 10, marginLeft: 5 }}
                  >
                    <Text style={{ color: 'white' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Add Pet Button */}
            {petFormMode === 'none' && (
              <TouchableOpacity
                onPress={() => setPetFormMode('add')}
                style={{ marginTop: 20, backgroundColor: 'orange', padding: 10 }}
              >
                <Text style={{ color: 'white' }}>Add a Pet</Text>
              </TouchableOpacity>
            )}

            {/* Pets List */}
            <View style={{ marginTop: 30 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Your Pets</Text>
              {userData.pets.length > 0 ? (
                userData.pets.map((pet, index) => (
                  <View key={index} style={{ marginTop: 10, borderWidth: 1, padding: 10, borderRadius: 5 }}>
                    <TouchableOpacity onPress={() => togglePetDetails(index)}>
                      <Text style={{ fontWeight: 'bold' }}>{`Pet Name: ${pet.name}`}</Text>
                    </TouchableOpacity>
                    {expandedPets[index] && (
                      <View style={{ marginTop: 5 }}>
                        <Text>{`Age: ${pet.age}`}</Text>
                        <Text>{`Birthday: ${pet.birthday}`}</Text>
                        <Text>{`Breed: ${pet.breed}`}</Text>
                        <Text>{`Next Vaccination Date: ${pet.nextVaccinationDate || 'Not set'}`}</Text>
                        <View style={{ flexDirection: 'row', marginTop: 10 }}>
                          <TouchableOpacity
                            onPress={() => startEditingPet(index)}
                            style={{
                              flex: 1,
                              backgroundColor: 'blue',
                              padding: 8,
                              marginRight: 5,
                              opacity: isSubmitting ? 0.5 : 1,
                            }}
                            disabled={isSubmitting}
                          >
                            <Text style={{ color: 'white' }}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeletePet(index)}
                            style={{
                              flex: 1,
                              backgroundColor: 'red',
                              padding: 8,
                              marginLeft: 5,
                              opacity: isSubmitting ? 0.5 : 1,
                            }}
                            disabled={isSubmitting}
                          >
                            <Text style={{ color: 'white' }}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <Text>No pets added yet</Text>
              )}
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              onPress={handleLogout}
              style={{ marginTop: 30, backgroundColor: 'red', padding: 10 }}
            >
              <Text style={{ color: 'white' }}>Logout</Text>
            </TouchableOpacity>
          </>
        )}

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
    </KeyboardAvoidingView>
  );
};

export default ProfileScreen;