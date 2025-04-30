import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { auth } from '../../firebase/firebase';
import { Snackbar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system'; // For converting image to Base64

interface ProductData {
  name: string;
  price: string; // Stored as string in form, converted to number for Firestore
  quantity: string; // Stored as string in form, converted to number for Firestore
  vendorId: string;
  imageBase64?: string; // Store Base64 string of the image
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
  const [imageBase64, setImageBase64] = useState<string | null>(null); // Store Base64 string for submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

  // Request permission to access the gallery and pick an image
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
      quality: 0.3, // Reduce quality to keep Base64 size small
    });

    if (!result.canceled && result.assets[0].uri) {
      setSelectedImage(result.assets[0].uri);

      // Convert the image to Base64
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
      // Save product to Firestore
      await addDoc(collection(firestore, 'products'), {
        name: productData.name,
        price: Number(productData.price),
        quantity: Number(productData.quantity),
        vendorId: userId,
        imageBase64: imageBase64 || null, // Save Base64 string or null if no image
      });

      // Reset form
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Add Product</Text>

        {/* Product Name */}
        <View style={{ marginTop: 20 }}>
          <Text>Product Name:</Text>
          <TextInput
            value={productData.name}
            onChangeText={(text) => handleChange('name', text)}
            placeholder="Enter product name"
            style={{ borderBottomWidth: 1, padding: 8 }}
          />
        </View>

        {/* Price */}
        <View style={{ marginTop: 20 }}>
          <Text>Price:</Text>
          <TextInput
            value={productData.price}
            onChangeText={(text) => handleChange('price', text)}
            placeholder="Enter price"
            keyboardType="numeric"
            style={{ borderBottomWidth: 1, padding: 8 }}
          />
        </View>

        {/* Available Quantity */}
        <View style={{ marginTop: 20 }}>
          <Text>Available Quantity:</Text>
          <TextInput
            value={productData.quantity}
            onChangeText={(text) => handleChange('quantity', text)}
            placeholder="Enter quantity"
            keyboardType="numeric"
            style={{ borderBottomWidth: 1, padding: 8 }}
          />
        </View>

        {/* Image Picker */}
        <View style={{ marginTop: 20 }}>
          <Text>Product Image (Optional):</Text>
          <TouchableOpacity
            onPress={pickImage}
            style={{ marginTop: 10, backgroundColor: 'orange', padding: 10 }}
          >
            <Text style={{ color: 'white' }}>Select Image</Text>
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={{ marginTop: 10, width: 200, height: 150, resizeMode: 'contain' }}
            />
          )}
        </View>

        {/* Add Product Button */}
        <TouchableOpacity
          onPress={handleAddProduct}
          style={{
            marginTop: 20,
            backgroundColor: 'green',
            padding: 10,
            opacity: isSubmitting ? 0.5 : 1,
          }}
          disabled={isSubmitting}
        >
          <Text style={{ color: 'white' }}>Add Product</Text>
        </TouchableOpacity>

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

export default VendorAddProductScreen;