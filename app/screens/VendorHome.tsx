import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';
import HomeScreen from '../components/vendor/HomeScreen';
import ProfileScreen from '../components/vendor/ProfileScreen';
import VendorAddProductScreen from '../components/vendor/AddProductScreen';
import VendorOrdersScreen from '../components/vendor/VendorOrderScreen';

const Tab = createBottomTabNavigator();

const VendorHome = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: '#FBF8EF',
                    borderTopWidth: 0,
                    elevation: 8,
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: -2 },
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    paddingVertical: 10,
                    height: 70,
                },
                tabBarActiveTintColor: '#3674B5',
                tabBarInactiveTintColor: '#888',
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: 'bold',
                    marginBottom: 5,
                },
                tabBarIconStyle: {
                    marginTop: 5,
                },
                headerStyle: {
                    backgroundColor: '#FBF8EF',
                    elevation: 0,
                    shadowOpacity: 0,
                    borderBottomWidth: 0,
                },
                headerTitleStyle: {
                    fontSize: 32,
                    fontWeight: 'bold',
                    color: '#3E4241',
                    textTransform: 'uppercase',
                },
                headerTitleContainerStyle: {
                    paddingHorizontal: 16,
                    paddingTop: 10,
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={VendorOrdersScreen}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Icon name="home" size={size + 4} color={color} />
                    ),
                    headerTitle: 'Home 📋',
                    headerTitleStyle: {
                        fontSize: 28,
                        fontWeight: 'bold',
                        color: '#3E4241',
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                    },
                }}
            />
            <Tab.Screen
                name="AddProduct"
                component={VendorAddProductScreen}
                options={{
                    tabBarLabel: 'Add Product',
                    tabBarIcon: ({ color, size }) => (
                        <Icon name="plus-circle" size={size + 4} color={color} />
                    ),
                    headerTitle: 'Add Product 📦',
                    headerTitleStyle: {
                        fontSize: 28,
                        fontWeight: 'bold',
                        color: '#3E4241',
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                    },
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Icon name="user" size={size + 4} color={color} />
                    ),
                    headerTitle: 'Profile 🧑‍💼',
                    headerTitleStyle: {
                        fontSize: 28,
                        fontWeight: 'bold',
                        color: '#3E4241',
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                    },
                }}
            />
        </Tab.Navigator>
    );
};

export default VendorHome;