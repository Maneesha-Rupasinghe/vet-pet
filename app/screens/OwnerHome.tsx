import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Feather';
import ProfileScreen from '../components/pet_owner/ProfileScreen';
import AppointmentRequest from '../components/pet_owner/AppointmentScreen';
import VetList from '../components/pet_owner/VetList';
import OwnerReminders from '../components/pet_owner/OwnerReminder';
import ProductListScreen from '../components/pet_owner/ProductListScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Tab Navigator for Home, VetList (as Appointment), and Profile
const OwnerTabNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={ProductListScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Appointment"
        component={VetList}
        options={{
          tabBarLabel: 'Appointment',
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Reminders"
        component={OwnerReminders}
        options={{
          tabBarLabel: 'Reminders',
          tabBarIcon: ({ color, size }) => (
            <Icon name="bell" size={size} color={color} />
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

// Stack Navigator to include the Tab Navigator and AppointmentRequest
const OwnerHome = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="OwnerTabs"
        component={OwnerTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AppointmentRequest"
        component={AppointmentRequest}
        options={{ title: 'Request Appointment' }}
      />
    </Stack.Navigator>
  );
};

export default OwnerHome;