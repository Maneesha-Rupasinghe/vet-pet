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
        <Tab.Navigator>
            <Tab.Screen
                name="Home"
                component={VendorOrdersScreen}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Icon name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="AddProduct"
                component={VendorAddProductScreen}
                options={{
                    tabBarLabel: 'AddProduct',
                    tabBarIcon: ({ color, size }) => (
                        <Icon name="AddProduct" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Icon name="user" size={size} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

export default VendorHome;
