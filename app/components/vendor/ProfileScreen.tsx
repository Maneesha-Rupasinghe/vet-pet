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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Vendor Profile</Text>

        {isLoading ? (
          <Text>Loading...</Text>
        ) : (
          <>
            {/* Name */}
            <View style={{ marginTop: 20 }}>
              <Text>Name:</Text>
              {isEditingProfile ? (
                <TextInput
                  value={vendorData.name}
                  onChangeText={(text) => handleChange('name', text)}
                  placeholder="Enter your name"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
              ) : (
                <Text>{vendorData.name || 'No data'}</Text>
              )}
            </View>

            {/* Contact Number */}
            <View style={{ marginTop: 20 }}>
              <Text>Contact Number:</Text>
              {isEditingProfile ? (
                <TextInput
                  value={vendorData.contactNo}
                  onChangeText={(text) => handleChange('contactNo', text)}
                  placeholder="Enter contact number"
                  keyboardType="phone-pad"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
              ) : (
                <Text>{vendorData.contactNo || 'No data'}</Text>
              )}
            </View>

            {/* Location */}
            <View style={{ marginTop: 20 }}>
              <Text>Location:</Text>
              {isEditingProfile ? (
                <TextInput
                  value={vendorData.location}
                  onChangeText={(text) => handleChange('location', text)}
                  placeholder="Enter your location"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
              ) : (
                <Text>{vendorData.location || 'No data'}</Text>
              )}
            </View>

            {/* Username */}
            <View style={{ marginTop: 20 }}>
              <Text>Username:</Text>
              {isEditingProfile ? (
                <TextInput
                  value={vendorData.username}
                  onChangeText={(text) => handleChange('username', text)}
                  placeholder="Enter your username"
                  style={{ borderBottomWidth: 1, padding: 8 }}
                />
              ) : (
                <Text>{vendorData.username || 'No data'}</Text>
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

export default VendorProfileScreen;