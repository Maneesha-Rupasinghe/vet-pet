import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth } from '../../firebase/firebase';
import { signOut } from 'firebase/auth';
import { Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';

interface VendorData {
  name: string;
  contactNo: string;
  location: string;
  username: string;
  role: string;
}

const VendorProfileScreen = () => {
  const router = useRouter();
  const firestore = getFirestore();

  const [vendorData, setVendorData] = useState<VendorData>({
    name: '',
    contactNo: '',
    location: '',
    username: '',
    role: '',
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (userId) {
          const userDocRef = doc(firestore, 'users', userId);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data?.role !== 'vendor') {
              showSnackbar('Access denied: Not a vendor account', 'error');
              router.replace('/screens/LoginScreen');
              return;
            }
            setVendorData({
              name: data?.name || '',
              contactNo: data?.contactNo || '',
              location: data?.location || '',
              username: data?.username || '',
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

    fetchVendorData();
  }, []);

  const validateInputs = (data: Partial<VendorData>) => {
    const vendor = data as VendorData;
    if (!vendor.name.trim()) return 'Name is required';
    if (!vendor.contactNo.trim() || !/^\d{10}$/.test(vendor.contactNo)) return 'Valid 10-digit contact number is required';
    if (!vendor.location.trim()) return 'Location is required';
    if (!vendor.username.trim()) return 'Username is required';
    return null;
  };

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const handleUpdateProfile = async () => {
    const validationError = validateInputs(vendorData);
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
          name: vendorData.name,
          contactNo: vendorData.contactNo,
          location: vendorData.location,
          username: vendorData.username,
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showSnackbar('Logged out successfully!', 'success');
      router.replace('/screens/LoginScreen');
    } catch (error: any) {
      showSnackbar(`Error logging out: ${error.message}`, 'error');
    }
  };

  const handleChange = (field: keyof VendorData, value: string) => {
    setVendorData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#FBF8EF' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 10 }}>
        <Text className="text-2xl font-extrabold text-[#3E4241] mb-5 ml-5">
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
                  value={vendorData.name}
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
                  {vendorData.name || 'No data'}
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
                  value={vendorData.contactNo}
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
                  {vendorData.contactNo || 'No data'}
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
                  value={vendorData.location}
                  onChangeText={(text) => handleChange('location', text)}
                  placeholder="Enter your location"
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
                  {vendorData.location || 'No data'}
                </Text>
              )}
            </View>

            {/* Username */}
            <View style={{ marginTop: 15 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#3E4241', marginBottom: 5 }}>
                Username:
              </Text>
              {isEditingProfile ? (
                <TextInput
                  value={vendorData.username}
                  onChangeText={(text) => handleChange('username', text)}
                  placeholder="Enter your username"
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
                  {vendorData.username || 'No data'}
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
            <Text style={{ color: '#FFF', fontSize: 14 }}>{snackbarMessage}</Text>
          </Snackbar>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default VendorProfileScreen;