import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/firebase';
import { Snackbar } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/Feather';

const LoginScreen = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

    const handleLogin = async () => {
        setIsLoading(true);
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zAZ]{2,6}$/;
        if (!emailRegex.test(email)) {
            showSnackbar('Invalid email! Please re-enter email', 'error');
            setIsLoading(false);
            return;
        }
        if (password.length < 6) {
            showSnackbar('Password must be at least 6 characters long', 'error');
            setIsLoading(false);
            return;
        }

        const user = await loginWithEmailPassword(email, password);
        if (user) {
            const userId = user.uid;
            const userRoll = await checkUserRoll(userId);
            console.log("User Roll ", userRoll);

            if (userRoll == 'vet') {
                router.replace('/screens/VetHome');
            } else if (userRoll == 'vendor') {
                router.replace('/screens/VendorHome');
            } else {
                router.replace('/screens/OwnerHome');
            }
        }

        setIsLoading(false);
    };

    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    const loginWithEmailPassword = async (email: string, password: string) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            console.log("Login successful:", user);
            showSnackbar('Login Successful!', 'success');

            return user;
        } catch (error: any) {
            console.error("Error signing in:", error.message);
            showSnackbar('Login Failed. Invalid email or password', 'error');
            return null;
        }
    };

    const checkUserRoll = async (userId: string): Promise<string | null> => {
        try {
            const userDocRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role as string | undefined;

                if (role) {
                    return role;
                } else {
                    throw new Error('Role not found in user document');
                }
            } else {
                throw new Error('User document does not exist');
            }
        } catch (error: any) {
            console.error('Error fetching user role:', error.message);
            return null;
        }
    };

    const showSnackbar = (message: string, type: 'success' | 'error') => {
        setSnackbarMessage(message);
        setSnackbarType(type);
        setSnackbarVisible(true);
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <View className="flex-1 bg-[#FBF8EF]">
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Image Section */}
                    <View className="justify-start items-center w-full mt-8">
                        <Image
                            source={require('../../assets/images/login.jpg')}
                            className="w-full h-48 rounded-lg object-cover shadow-md"
                        />
                    </View>

                    {/* Login Title Section */}
                    <View className="mt-10">
                        <Text className="text-4xl font-extrabold text-[#3E4241] text-center">Login</Text>
                    </View>

                    {/* Email Input Field */}
                    <View className="mt-8 w-full">
                        <Text className="text-lg text-gray-700 mb-2">Email</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter your email"
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

                    {/* Login Button */}
                    <TouchableOpacity
                        onPress={handleLogin}
                        className={`mt-10 bg-[#3674B5] p-4 w-full rounded-lg items-center shadow-lg ${isLoading ? 'opacity-50' : ''}`}
                        disabled={isLoading}
                    >
                        <Text className="text-white text-lg font-semibold">
                            {isLoading ? 'Logging In...' : 'Login'}
                        </Text>
                    </TouchableOpacity>

                    {/* Register Link */}
                    <View className="flex flex-row justify-center mt-6 gap-x-2">
                        <Text className="text-gray-600">Don't have an account?</Text>
                        <Link className="text-[#3674B5] font-semibold" href={'/screens/RegisterScreen'}>
                            Register
                        </Link>
                    </View>
                </ScrollView>

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
            </View>
        </KeyboardAvoidingView>
    );
};

export default LoginScreen;