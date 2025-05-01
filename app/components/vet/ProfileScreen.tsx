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
          services: vetData.services,
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#FBF8EF' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 10 }}>
      <Text className="text-2xl font-extrabold text-[#3E4241] mb-5">
                      User Profile
                  </Text>

        {isLoading ? (
          <Text style={{ fontSize: 16, color: '#3E4241', marginHorizontal: 8 }}>
            Loading...
          </Text>
        ) : (
          <>
            {/* Name */}
            <View style={{ marginTop: 15 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#3E4241', marginBottom: 5 }}>
                Name:
              </Text>
              {isEditingProfile ? (
                <TextInput
                  value={vetData.name}
                  onChangeText={(text) => handleChange('name', text)}
                  placeholder="Enter your name"
                  placeholderTextColor="#6B7280"
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 14,
                    color: '#3E4241',
                  }}
                />
              ) : (
                <Text style={{ fontSize: 14, color: '#6B7280' }}>
                  {vetData.name || 'No data'}
                </Text>
              )}
            </View>

            {/* Contact Number */}
            <View style={{ marginTop: 15 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#3E4241', marginBottom: 5 }}>
                Contact Number:
              </Text>
              {isEditingProfile ? (
                <TextInput
                  value={vetData.contactNo}
                  onChangeText={(text) => handleChange('contactNo', text)}
                  placeholder="Enter contact number"
                  placeholderTextColor="#6B7280"
                  keyboardType="phone-pad"
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 14,
                    color: '#3E4241',
                  }}
                />
              ) : (
                <Text style={{ fontSize: 14, color: '#6B7280' }}>
                  {vetData.contactNo || 'No data'}
                </Text>
              )}
            </View>

            {/* Working Hours */}
            <View style={{ marginTop: 15 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#3E4241', marginBottom: 5 }}>
                Working Hours:
              </Text>
              {isEditingProfile ? (
                <TextInput
                  value={vetData.workingHours}
                  onChangeText={(text) => handleChange('workingHours', text)}
                  placeholder="e.g., Mon-Fri 9AM-5PM"
                  placeholderTextColor="#6B7280"
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 14,
                    color: '#3E4241',
                  }}
                />
              ) : (
                <Text style={{ fontSize: 14, color: '#6B7280' }}>
                  {vetData.workingHours || 'No data'}
                </Text>
              )}
            </View>

            {/* Location */}
            <View style={{ marginTop: 15 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#3E4241', marginBottom: 5 }}>
                Location:
              </Text>
              {isEditingProfile ? (
                <TextInput
                  value={vetData.location}
                  onChangeText={(text) => handleChange('location', text)}
                  placeholder="Enter clinic location"
                  placeholderTextColor="#6B7280"
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 14,
                    color: '#3E4241',
                  }}
                />
              ) : (
                <Text style={{ fontSize: 14, color: '#6B7280' }}>
                  {vetData.location || 'No data'}
                </Text>
              )}
            </View>

            {/* Profile Actions */}
            <TouchableOpacity
              onPress={isEditingProfile ? handleUpdateProfile : () => setIsEditingProfile(true)}
              style={{
                marginTop: 20,
                backgroundColor: '#3674B5',
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
                opacity: isSubmitting ? 0.5 : 1,
              }}
              disabled={isSubmitting}
            >
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '500' }}>
                {isEditingProfile ? 'Update Profile' : 'Edit Profile'}
              </Text>
            </TouchableOpacity>

            {isEditingProfile && (
              <TouchableOpacity
                onPress={() => setIsEditingProfile(false)}
                style={{
                  marginTop: 10,
                  backgroundColor: 'gray',
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '500' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            )}

            {/* Service Form */}
            {serviceFormMode !== 'none' && (
              <View style={{ marginTop: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#3E4241', marginBottom: 10 }}>
                  {serviceFormMode === 'add' ? 'Add New Service' : 'Edit Service'}
                </Text>
                <TextInput
                  value={newService}
                  onChangeText={setNewService}
                  placeholder="Enter service (e.g., Vaccination)"
                  placeholderTextColor="#6B7280"
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 14,
                    color: '#3E4241',
                  }}
                />
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={serviceFormMode === 'add' ? handleAddService : handleEditService}
                    style={{
                      flex: 1,
                      backgroundColor: '#3674B5',
                      borderRadius: 8,
                      padding: 12,
                      marginRight: 5,
                      alignItems: 'center',
                      opacity: isSubmitting ? 0.5 : 1,
                    }}
                    disabled={isSubmitting}
                  >
                    <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '500' }}>
                      {serviceFormMode === 'add' ? 'Save Service' : 'Update Service'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={resetServiceForm}
                    style={{
                      flex: 1,
                      backgroundColor: 'gray',
                      borderRadius: 8,
                      padding: 12,
                      marginLeft: 5,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '500' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Add Service Button */}
            {serviceFormMode === 'none' && (
              <TouchableOpacity
                onPress={() => setServiceFormMode('add')}
                style={{
                  marginTop: 20,
                  backgroundColor: '#28a745',
                  borderRadius: 8,
                  padding: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '500' }}>
                  Add a Service
                </Text>
              </TouchableOpacity>
            )}

            {/* Services List */}
            <View style={{ marginTop: 30 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#3E4241', marginBottom: 10 }}>
                Services Offered
              </Text>
              {vetData.services.length > 0 ? (
                vetData.services.map((service, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: '#FFF',
                      borderRadius: 12,
                      padding: 12,
                      marginVertical: 8,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Text style={{ fontSize: 14, color: '#3E4241' }}>
                      {service}
                    </Text>
                    <View style={{ flexDirection: 'row', marginTop: 10 }}>
                      <TouchableOpacity
                        onPress={() => startEditingService(index)}
                        style={{
                          flex: 1,
                          backgroundColor: '#3674B5',
                          borderRadius: 8,
                          padding: 10,
                          marginRight: 5,
                          alignItems: 'center',
                          opacity: isSubmitting ? 0.5 : 1,
                        }}
                        disabled={isSubmitting}
                      >
                        <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '500' }}>
                          Edit
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteService(index)}
                        style={{
                          flex: 1,
                          backgroundColor: 'red',
                          borderRadius: 8,
                          padding: 10,
                          marginLeft: 5,
                          alignItems: 'center',
                          opacity: isSubmitting ? 0.5 : 1,
                        }}
                        disabled={isSubmitting}
                      >
                        <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '500' }}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 14, color: '#6B7280' }}>
                  No services added yet
                </Text>
              )}
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              onPress={handleLogout}
              style={{
                marginTop: 30,
                marginBottom: 20,
                backgroundColor: 'red',
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '500' }}>
                Logout
              </Text>
            </TouchableOpacity>
          </>
        )}

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
            <Text style={{ color: '#FFF', fontSize: 14 }}>
              {snackbarMessage}
            </Text>
          </Snackbar>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default VetProfileScreen;