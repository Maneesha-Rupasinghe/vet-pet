import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { Link, useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/Feather';

const RegisterScreen = ({ navigation }: any) => {
    const router = useRouter();
    const [role, setRole] = useState<'petOwner' | 'vet' | 'vendor'>('petOwner');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [vetRegNo, setVetRegNo] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

    const firestore = getFirestore();

    // Handle the registration logic
    const handleRegister = async () => {
        setIsLoading(true);
        if (!email || !username || !password) {
            showSnackbar('All fields are required', 'error');
            setIsLoading(false);
            return;
        }

        if (role === 'vet' && !vetRegNo) {
            showSnackbar('Vet Registration Number is required for Vet role', 'error');
            setIsLoading(false);
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Store user data and role in Firestore
            await setDoc(doc(firestore, 'users', user.uid), {
                email: user.email,
                username: username,
                role: role,
                ...(role === 'vet' && { vetRegNo }), // Include vetRegNo for vets
            });

            showSnackbar('Registration Successful!', 'success');
            router.replace('/screens/LoginScreen');

        } catch (error: any) {
            console.error('Registration error:', error.message);
            showSnackbar(`Error during registration: ${error.message}`, 'error');
        }

        setIsLoading(false);
    };

    // Toggle password visibility
    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    // Function to show Snackbar messages
    const showSnackbar = (message: string, type: 'success' | 'error') => {
        setSnackbarMessage(message);
        setSnackbarType(type);
        setSnackbarVisible(true);
    };

    // Determine the image based on the selected role
    const getRoleImage = () => {
        if (role === 'vet') {
            return require('../../assets/images/vet.jpg');
        } else if (role === 'vendor') {
            // Using petowner image as a placeholder since no vendor image is specified
            return require('../../assets/images/vendor.jpg');
        } else {
            return require('../../assets/images/petowner.jpg');
        }
    };

    return (
        <>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={{ backgroundColor: '#FBF8EF' }} showsVerticalScrollIndicator={false}>
                <View className="flex flex-col items-center p-4">

                    {/* Image Section */}
                    <View className="justify-start items-center w-full mt-8">
                        <Image
                            source={getRoleImage()}
                            className="w-full h-52 rounded-lg object-cover shadow-md"
                        />
                    </View>

                    {/* Registration Title Section */}
                    <View className="mt-12">
                        <Text className="text-4xl font-extrabold text-[#3E4241] text-center">Register</Text>
                    </View>

                    {/* Toggle between Pet Owner, Vet, and Vendor */}
                    <View className="flex flex-row mt-4">
                        <TouchableOpacity
                            onPress={() => setRole('petOwner')}
                            className={`px-4 py-2 rounded-l-md ${role === 'petOwner' ? 'bg-[#3674B5]' : 'bg-gray-300'}`}
                        >
                            <Text className={`text-white ${role === 'petOwner' ? 'font-bold' : ''}`}>Pet Owner</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setRole('vet')}
                            className={`px-4 py-2 ${role === 'vet' ? 'bg-[#3674B5]' : 'bg-gray-300'}`}
                        >
                            <Text className={`text-white ${role === 'vet' ? 'font-bold' : ''}`}>Vet</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setRole('vendor')}
                            className={`px-4 py-2 rounded-r-md ${role === 'vendor' ? 'bg-[#3674B5]' : 'bg-gray-300'}`}
                        >
                            <Text className={`text-white ${role === 'vendor' ? 'font-bold' : ''}`}>Vendor</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Email Input Field */}
                    <View className="mt-6 w-full">
                        <Text className="text-lg text-gray-700 mb-2">Email</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Email"
                            placeholderTextColor="#888"
                            className="border border-gray-300 rounded-lg py-3 px-4 w-full text-lg bg-white shadow-sm"
                        />
                    </View>

                    {/* Username Input Field */}
                    <View className="mt-6 w-full">
                        <Text className="text-lg text-gray-700 mb-2">User Name</Text>
                        <TextInput
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Username"
                            placeholderTextColor="#888"
                            className="border border-gray-300 rounded-lg py-3 px-4 w-full text-lg bg-white shadow-sm"
                        />
                    </View>

                    {/* Password Input Field */}
                    <View className="mt-6 w-full">
                        <Text className="text-lg text-[#3E4241] mb-2">Password</Text>
                        <View className="relative">
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter your password"
                                placeholderTextColor="#888"
                                secureTextEntry={!isPasswordVisible}
                                className="border border-gray-300 rounded-lg py-3 px-4 w-full text-lg bg-white shadow-sm"
                            />
                            <TouchableOpacity
                                onPress={togglePasswordVisibility}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                            >
                                <Icon
                                    name={isPasswordVisible ? 'eye-off' : 'eye'}
                                    size={20}
                                    color="gray"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Vet Registration Number Input (if Vet role is selected) */}
                    {role === 'vet' && (
                        <View className="mt-6 w-full">
                            <TextInput
                                value={vetRegNo}
                                onChangeText={setVetRegNo}
                                placeholder="Vet Registration Number"
                                placeholderTextColor="#888"
                                className="border-b border-gray-300 py-2 px-3 w-full text-lg"
                            />
                        </View>
                    )}

                    {/* Register Button */}
                    <TouchableOpacity
                        onPress={handleRegister}
                        className="mt-8 bg-[#3674B5] p-4 w-full rounded-lg items-center"
                        disabled={isLoading}
                    >
                        <Text className="text-white text-lg font-semibold">Register</Text>
                    </TouchableOpacity>

                    <View className="flex flex-row justify-center mt-[12px] gap-x-2">
                        <Text>Already have an account?</Text>
                        <Link className="text-[#3674B5]" href={'/screens/LoginScreen'}>Sign in</Link>
                    </View>

                    {/* Snackbar for displaying success or error messages */}

                </View>
            </ScrollView>
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
        </>
    );
};

export default RegisterScreen;
