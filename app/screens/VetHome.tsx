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
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={VetCalendar}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
       <Tab.Screen
        name="Appointments"
        component={VetAppointments}
        options={{
          tabBarLabel: 'Appointments',
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" size={size} color={color} />
          ),
        }}
      />
       <Tab.Screen
        name="Reminders"
        component={VetReminders}
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

export default VetHome;
