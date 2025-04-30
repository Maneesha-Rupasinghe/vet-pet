import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { auth } from '../../firebase/firebase';
import { signOut } from 'firebase/auth';
import { Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';

interface VetData {
  name: string;
  contactNo: string;
  services: string[];
  workingHours: string;
  location: string;
  role: string;
}

const VetProfileScreen = () => {
  const router = useRouter();
  const firestore = getFirestore();

  const [vetData, setVetData] = useState<VetData>({
    name: '',
    contactNo: '',
    services: [],
    workingHours: '',
    location: '',
    role: '',
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');
  
  const [newService, setNewService] = useState('');
  const [serviceFormMode, setServiceFormMode] = useState<'none' | 'add' | 'edit'>('none');
  const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchVetData = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (userId) {
          const userDocRef = doc(firestore, 'users', userId);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data?.role !== 'vet') {
              showSnackbar('Access denied: Not a vet account', 'error');
              router.replace('/screens/LoginScreen');
              return;
            }
            setVetData({
              name: data?.name || '',
              contactNo: data?.contactNo || '',
              services: data?.services || [],
              workingHours: data?.workingHours || '',
              location: data?.location || '',
              role: data?.role || '',
            });
          } else {
            showSnackbar('User profile not found', 'error');
          }
        } else {
          showSnackbar('No user logged in', 'error');
          router.replace('/screens/LoginScreen');
        }
      } catch (error) {
        showSnackbar('Failed to fetch profile data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVetData();
  }, []);

  const validateInputs = (data: Partial<VetData> | string, isService: boolean = false) => {
    if (isService) {
      if (typeof data !== 'string' || !data.trim()) return 'Service name is required';
    } else {
      const vet = data as VetData;
      if (!vet.name.trim()) return 'Name is required';
      if (!vet.contactNo.trim() || !/^\d{10}$/.test(vet.contactNo)) return 'Valid 10-digit contact number is required';
      if (!vet.workingHours.trim()) return 'Working hours are required';
      if (!vet.location.trim()) return 'Location is required';
    }
    return null;
  };

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const handleUpdateProfile = async () => {
    const validationError = validateInputs(vetData);
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
          name: vetData.name,
          contactNo: vetData.contactNo,
          workingHours: vetData.workingHours,
          location: vetData.location,
          services: vetData.services, // Ensure services are updated
        });
        showSnackbar('Profile updated successfully!', 'success');
        setIsEditingProfile(false);
      } catch (error: any) {
        showSnackbar(`Failed to update profile: ${error.message}`, 'error');
      }
    } else {
      showSnackbar('No user logged in', 'error');
    }
    setIsSubmitting(false);
  };

  const handleAddService = async () => {
    const validationError = validateInputs(newService, true);
    if (validationError) {
      showSnackbar(validationError, 'error');
      return;
    }

    if (vetData.services.length >= 10) {
      showSnackbar('Maximum 10 services allowed', 'error');
      return;
    }

    setIsSubmitting(true);
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userDocRef = doc(firestore, 'users', userId);
      try {
        await updateDoc(userDocRef, {
          services: arrayUnion(newService),
        });
        setVetData((prev) => ({
          ...prev,
          services: [...prev.services, newService],
        }));
        resetServiceForm();
        showSnackbar('Service added successfully!', 'success');
      } catch (error: any) {
        showSnackbar(`Failed to add service: ${error.message}`, 'error');
      }
    }
    setIsSubmitting(false);
  };

  const handleEditService = async () => {
    if (editingServiceIndex === null) return;

    const validationError = validateInputs(newService, true);
    if (validationError) {
      showSnackbar(validationError, 'error');
      return;
    }

    setIsSubmitting(true);
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userDocRef = doc(firestore, 'users', userId);
      try {
        const updatedServices = [...vetData.services];
        updatedServices[editingServiceIndex] = newService;
        await updateDoc(userDocRef, { services: updatedServices });
        setVetData((prev) => ({ ...prev, services: updatedServices }));
        resetServiceForm();
        showSnackbar('Service updated successfully!', 'success');
      } catch (error: any) {
        showSnackbar(`Failed to update service: ${error.message}`, 'error');
      }
    }
    setIsSubmitting(false);
  };

  const handleDeleteService = async (index: number) => {
    setIsSubmitting(true);
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userDocRef = doc(firestore, 'users', userId);
      try {
        const serviceToRemove = vetData.services[index];
        await updateDoc(userDocRef, {
          services: arrayRemove(serviceToRemove),
        });
        setVetData((prev) => ({
          ...prev,
          services: prev.services.filter((_, i) => i !== index),
        }));
        showSnackbar('Service deleted successfully!', 'success');
      } catch (error: any) {
        showSnackbar(`Failed to delete service: ${error.message}`, 'error');
      }
    }
    setIsSubmitting(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showSnackbar('Logged out successfully!', 'success');
      router.replace('/screens/LoginScreen');
    } catch (error: any) {
      showSnackbar(`Error logging out: ${error.message}`, 'error');
    }
  };

  const resetServiceForm = () => {
    setNewService('');
    setServiceFormMode('none');
    setEditingServiceIndex(null);
  };

  const handleChange = (field: keyof VetData, value: string) => {
    setVetData((prev) => ({ ...prev, [field]: value }));
  };

  const startEditingService = (index: number) => {
    setNewService(vetData.services[index]);
    setServiceFormMode('edit');
    setEditingServiceIndex(index);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Vet Profile</Text>

        {isLoading ? (
          <Text>Loading...</Text>
        ) : (
          <>
            {/* Name */}
            <View style={{ marginTop: 20 }}>
              <Text>Name:</Text>
              {isEditingProfile ? (
                <TextInput
                  value={vetData.name}
                  onChangeText={(text) => handleChange('name', text)}
                  placeholder="Enter your name"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
              ) : (
                <Text>{vetData.name || 'No data'}</Text>
              )}
            </View>

            {/* Contact Number */}
            <View style={{ marginTop: 20 }}>
              <Text>Contact Number:</Text>
              {isEditingProfile ? (
                <TextInput
                  value={vetData.contactNo}
                  onChangeText={(text) => handleChange('contactNo', text)}
                  placeholder="Enter contact number"
                  keyboardType="phone-pad"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
              ) : (
                <Text>{vetData.contactNo || 'No data'}</Text>
              )}
            </View>

            {/* Working Hours */}
            <View style={{ marginTop: 20 }}>
              <Text>Working Hours:</Text>
              {isEditingProfile ? (
                <TextInput
                  value={vetData.workingHours}
                  onChangeText={(text) => handleChange('workingHours', text)}
                  placeholder="e.g., Mon-Fri 9AM-5PM"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
              ) : (
                <Text>{vetData.workingHours || 'No data'}</Text>
              )}
            </View>

            {/* Location */}
            <View style={{ marginTop: 20 }}>
              <Text>Location:</Text>
              {isEditingProfile ? (
                <TextInput
                  value={vetData.location}
                  onChangeText={(text) => handleChange('location', text)}
                  placeholder="Enter clinic location"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
              ) : (
                <Text>{vetData.location || 'No data'}</Text>
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

            {/* Service Form */}
            {serviceFormMode !== 'none' && (
              <View style={{ marginTop: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                  {serviceFormMode === 'add' ? 'Add New Service' : 'Edit Service'}
                </Text>
                <TextInput
                  value={newService}
                  onChangeText={setNewService}
                  placeholder="Enter service (e.g., Vaccination)"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={serviceFormMode === 'add' ? handleAddService : handleEditService}
                    style={{
                      flex: 1,
                      backgroundColor: 'green',
                      padding: 10,
                      marginRight: 5,
                      opacity: isSubmitting ? 0.5 : 1,
                    }}
                    disabled={isSubmitting}
                  >
                    <Text style={{ color: 'white' }}>{serviceFormMode === 'add' ? 'Save Service' : 'Update Service'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={resetServiceForm}
                    style={{ flex: 1, backgroundColor: 'gray', padding: 10, marginLeft: 5 }}
                  >
                    <Text style={{ color: 'white' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Add Service Button */}
            {serviceFormMode === 'none' && (
              <TouchableOpacity
                onPress={() => setServiceFormMode('add')}
                style={{ marginTop: 20, backgroundColor: 'orange', padding: 10 }}
              >
                <Text style={{ color: 'white' }}>Add a Service</Text>
              </TouchableOpacity>
            )}

            {/* Services List */}
            <View style={{ marginTop: 30 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Services Offered</Text>
              {vetData.services.length > 0 ? (
                vetData.services.map((service, index) => (
                  <View key={index} style={{ marginTop: 10, borderWidth: 1, padding: 10, borderRadius: 5 }}>
                    <Text>{service}</Text>
                    <View style={{ flexDirection: 'row', marginTop: 10 }}>
                      <TouchableOpacity
                        onPress={() => startEditingService(index)}
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
                        onPress={() => handleDeleteService(index)}
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
                ))
              ) : (
                <Text>No services added yet</Text>
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

export default VetProfileScreen;