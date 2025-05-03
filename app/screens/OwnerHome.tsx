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
import Spinner from 'react-native-loading-spinner-overlay';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Tab Navigator for Home, VetList (as Appointment), and Profile
const OwnerTabNavigator = () => {
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
        name="Shop"
        component={ProductListScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size + 4} color={color} />
          ),
          headerTitle: 'Shop Now 🛒👇', 
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
        name="Appointment"
        component={VetList}
        options={{
          tabBarLabel: 'Appointment',
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
        component={OwnerReminders}
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
          headerTitle: 'Profile 🐈',
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
        options={{
          title: 'Request Appointment',
          headerStyle: {
            backgroundColor: '#FBF8EF',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#3E4241',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 20,
          },
        }}
      />
    </Stack.Navigator>
  );
};

export default OwnerHome;