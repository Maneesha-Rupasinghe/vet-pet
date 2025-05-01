import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';
import ProfileScreen from '../components/vet/ProfileScreen';
import HomeScreen from '../components/vet/HomeScreen';
import VetAppointments from '../components/vet/AppointmentScreen';
import VetCalendar from '../components/vet/VetCalendar';
import VetReminders from '../components/vet/VetReminders';

const Tab = createBottomTabNavigator();

const VetHome = () => {
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
        // Add header styles for all tab screens
        headerStyle: {
          backgroundColor: '#FBF8EF', // Match app background
          elevation: 0, // Remove shadow for Android
          shadowOpacity: 0, // Remove shadow for iOS
          borderBottomWidth: 0, // Remove bottom border
        },
        headerTitleStyle: {
          fontSize: 32, // Larger font size for a bold look
          fontWeight: 'bold',
          color: '#3E4241', // Match app text color
          textTransform: 'uppercase', // Uppercase for emphasis
        },
        headerTitleContainerStyle: {
          paddingHorizontal: 16, // Add padding for better alignment
          paddingTop: 10, // Add top padding for spacing
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={VetCalendar}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size + 4} color={color} />
          ),
          headerTitle: 'Home 📅',
          headerTitleStyle: {
            fontSize: 28,
            fontWeight: 'bold',
            color: '#black', // Match the color used in OwnerHome
            textTransform: 'uppercase',
            letterSpacing: 2,
          },
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={VetAppointments}
        options={{
          tabBarLabel: 'Appointments',
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" size={size + 4} color={color} />
          ),
          headerTitle: 'Appointments 🧑‍⚕️',
          headerTitleStyle: {
            fontSize: 28,
            fontWeight: 'bold',
            color: '#black',
            textTransform: 'uppercase',
            letterSpacing: 2,
          },
        }}
      />
      <Tab.Screen
        name="Reminders"
        component={VetReminders}
        options={{
          tabBarLabel: 'Reminders',
          tabBarIcon: ({ color, size }) => (
            <Icon name="bell" size={size + 4} color={color} />
          ),
          headerTitle: 'Reminders ⏰',
          headerTitleStyle: {
            fontSize: 28,
            fontWeight: 'bold',
            color: '#black',
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
          headerTitle: 'Profile 🐾',
          headerTitleStyle: {
            fontSize: 28,
            fontWeight: 'bold',
            color: '#black',
            textTransform: 'uppercase',
            letterSpacing: 2,
          },
        }}
      />
    </Tab.Navigator>
  );
};

export default VetHome;