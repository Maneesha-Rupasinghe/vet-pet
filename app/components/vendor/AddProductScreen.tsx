import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { auth } from '../../firebase/firebase';
import { Snackbar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

interface ProductData {
  name: string;
  price: string;
  quantity: string;
  vendorId: string;
  imageBase64?: string;
}

const VendorAddProductScreen = () => {
  const firestore = getFirestore();
  const [productData, setProductData] = useState<ProductData>({
    name: '',
    price: '',
    quantity: '',
    vendorId: auth.currentUser?.uid || '',
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showSnackbar('Permission to access gallery denied', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.3,
    });

    if (!result.canceled && result.assets[0].uri) {
      setSelectedImage(result.assets[0].uri);

      try {
        const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setImageBase64(base64);
      } catch (error: any) {
        showSnackbar('Failed to convert image to Base64', 'error');
      }
    }
  };

  const validateInputs = (data: ProductData) => {
    if (!data.name.trim()) return 'Product name is required';
    if (!data.price.trim() || isNaN(Number(data.price)) || Number(data.price) <= 0) return 'Valid price is required';
    if (!data.quantity.trim() || isNaN(Number(data.quantity)) || Number(data.quantity) < 0) return 'Valid quantity is required';
    return null;
  };

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const handleAddProduct = async () => {
    const validationError = validateInputs(productData);
    if (validationError) {
      showSnackbar(validationError, 'error');
      return;
    }

    setIsSubmitting(true);
    const userId = auth.currentUser?.uid;
    if (!userId) {
      showSnackbar('No user logged in', 'error');
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(firestore, 'products'), {
        name: productData.name,
        price: Number(productData.price),
        quantity: Number(productData.quantity),
        vendorId: userId,
        imageBase64: imageBase64 || null,
      });

      setProductData({ name: '', price: '', quantity: '', vendorId: userId });
      setSelectedImage(null);
      setImageBase64(null);
      showSnackbar('Product added successfully!', 'success');
    } catch (error: any) {
      showSnackbar(`Failed to add product: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof ProductData, value: string) => {
    setProductData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#FBF8EF' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 10 }}>
        <Text className="text-2xl font-extrabold text-[#3E4241] mb-5 ml-5">
          Product Form 
        </Text>

        {/* Product Name */}
        <View style={{ marginTop: 15 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#3E4241', marginBottom: 5 }}>
            Product Name:
          </Text>
          <TextInput
            value={productData.name}
            onChangeText={(text) => handleChange('name', text)}
            placeholder="Enter product name"
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
        </View>

        {/* Price */}
        <View style={{ marginTop: 15 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#3E4241', marginBottom: 5 }}>
            Price:
          </Text>
          <TextInput
            value={productData.price}
            onChangeText={(text) => handleChange('price', text)}
            placeholder="Enter price"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
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
        </View>

        {/* Available Quantity */}
        <View style={{ marginTop: 15 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#3E4241', marginBottom: 5 }}>
            Available Quantity:
          </Text>
          <TextInput
            value={productData.quantity}
            onChangeText={(text) => handleChange('quantity', text)}
            placeholder="Enter quantity"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
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
        </View>

        {/* Image Picker */}
        <View style={{ marginTop: 15 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#3E4241', marginBottom: 5 }}>
            Product Image (Optional):
          </Text>
          <TouchableOpacity
            onPress={pickImage}
            style={{
              backgroundColor: '#3674B5',
              borderRadius: 8,
              padding: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '500' }}>
              Select Image
            </Text>
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={{
                marginTop: 10,
                width: '100%',
                height: 200,
                resizeMode: 'contain',
                borderRadius: 8,
              }}
            />
          )}
        </View>

        {/* Add Product Button */}
        <TouchableOpacity
          onPress={handleAddProduct}
          style={{
            marginTop: 20,
            backgroundColor: '#28a745',
            borderRadius: 8,
            padding: 12,
            alignItems: 'center',
            opacity: isSubmitting ? 0.5 : 1,
          }}
          disabled={isSubmitting}
        >
          <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '500' }}>
            Add Product
          </Text>
        </TouchableOpacity>

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

export default VendorAddProductScreen;